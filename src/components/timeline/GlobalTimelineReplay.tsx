import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TimelineSnapshot } from '@/types/alerts';
import { STAGE_COLORS, DegradationStage, STAGE_LABELS } from '@/types/archive';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Clock, 
  Rewind,
  FastForward,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalTimelineReplayProps {
  onSnapshotChange?: (snapshot: TimelineSnapshot | null, isReplayMode: boolean) => void;
}

export function GlobalTimelineReplay({ onSnapshotChange }: GlobalTimelineReplayProps) {
  const { user } = useAuth();
  const { currentYear, settings } = useSimulation();
  const [viewYear, setViewYear] = useState(0);
  const [snapshots, setSnapshots] = useState<Map<number, TimelineSnapshot>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] = useState<TimelineSnapshot | null>(null);
  const [replaySpeed, setReplaySpeed] = useState(500); // ms between steps

  // Build snapshots from decay events and degradation logs
  useEffect(() => {
    if (!user || !settings) return;

    const buildSnapshots = async () => {
      // Get all decay events
      const { data: events } = await supabase
        .from('decay_events')
        .select('*')
        .eq('owner_id', user.id)
        .order('simulated_year', { ascending: true });

      // Get all degradation logs for stage counts
      const { data: logs } = await supabase
        .from('degradation_logs')
        .select('decay_event_id, new_stage, semantic_score')
        .eq('owner_id', user.id);

      // Get current items for initial state
      const { data: items } = await supabase
        .from('archive_items')
        .select('stage, current_size_kb, size_kb, semantic_score')
        .eq('owner_id', user.id);

      const snapshotMap = new Map<number, TimelineSnapshot>();
      
      // Calculate initial state (Year 0) - all items at FULL
      const totalItems = items?.length || 0;
      const initialSize = items?.reduce((s, i) => s + (i.size_kb || 0), 0) || 0;
      
      snapshotMap.set(0, {
        year: 0,
        capacityKb: settings.start_capacity_kb,
        capacityPercent: 100,
        storageUsedKb: initialSize,
        stageCounts: { 
          FULL: totalItems, 
          COMPRESSED: 0, 
          SUMMARIZED: 0, 
          MINIMAL: 0, 
          DELETED: 0 
        },
        avgSemanticScore: items?.length 
          ? items.reduce((s, i) => s + (i.semantic_score || 0), 0) / items.length 
          : 0,
        decayEventNo: null,
        itemsAffected: 0,
      });

      // Build progressive snapshots from events
      if (events) {
        // Track stage counts progressively
        const stageCounts = { FULL: totalItems, COMPRESSED: 0, SUMMARIZED: 0, MINIMAL: 0, DELETED: 0 };
        
        events.forEach((event) => {
          // Get logs for this event
          const eventLogs = logs?.filter(l => l.decay_event_id === event.id) || [];
          
          // Update stage counts based on transitions
          eventLogs.forEach(log => {
            // This is a simplification - in reality we'd need prev_stage too
            const newStage = log.new_stage as DegradationStage;
            if (stageCounts[newStage] !== undefined) {
              stageCounts[newStage]++;
            }
          });

          const avgScore = eventLogs.length > 0
            ? eventLogs.reduce((s, l) => s + (l.semantic_score || 0), 0) / eventLogs.length
            : snapshotMap.get(event.simulated_year - 2)?.avgSemanticScore || 50;

          snapshotMap.set(event.simulated_year, {
            year: event.simulated_year,
            capacityKb: event.capacity_after_kb,
            capacityPercent: Math.round((event.capacity_after_kb / settings.start_capacity_kb) * 100),
            storageUsedKb: event.storage_after_kb,
            stageCounts: { ...stageCounts },
            avgSemanticScore: avgScore,
            decayEventNo: event.event_no,
            itemsAffected: event.items_affected || 0,
          });
        });
      }

      // Add current state
      const currentCounts = {
        FULL: items?.filter(i => i.stage === 'FULL').length || 0,
        COMPRESSED: items?.filter(i => i.stage === 'COMPRESSED').length || 0,
        SUMMARIZED: items?.filter(i => i.stage === 'SUMMARIZED').length || 0,
        MINIMAL: items?.filter(i => i.stage === 'MINIMAL').length || 0,
        DELETED: items?.filter(i => i.stage === 'DELETED').length || 0,
      };

      snapshotMap.set(currentYear, {
        year: currentYear,
        capacityKb: settings.current_capacity_kb,
        capacityPercent: Math.round((settings.current_capacity_kb / settings.start_capacity_kb) * 100),
        storageUsedKb: items?.reduce((s, i) => s + (i.current_size_kb || 0), 0) || 0,
        stageCounts: currentCounts,
        avgSemanticScore: items?.length 
          ? items.reduce((s, i) => s + (i.semantic_score || 0), 0) / items.length 
          : 0,
        decayEventNo: Math.floor(currentYear / 2),
        itemsAffected: 0,
      });

      setSnapshots(snapshotMap);
    };

    buildSnapshots();
  }, [user, settings, currentYear]);

  // Find nearest snapshot for a given year
  const getSnapshotForYear = useCallback((year: number): TimelineSnapshot | null => {
    if (snapshots.has(year)) return snapshots.get(year)!;
    
    // Find nearest previous year
    let nearestYear = 0;
    snapshots.forEach((_, y) => {
      if (y <= year && y > nearestYear) nearestYear = y;
    });
    
    return snapshots.get(nearestYear) || null;
  }, [snapshots]);

  // Handle year change
  useEffect(() => {
    const snapshot = getSnapshotForYear(viewYear);
    setCurrentSnapshot(snapshot);
    onSnapshotChange?.(snapshot, isReplayMode);
  }, [viewYear, snapshots, isReplayMode, getSnapshotForYear, onSnapshotChange]);

  // Playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setViewYear(prev => {
        const next = prev + 2;
        if (next > 60) {
          setIsPlaying(false);
          return 60;
        }
        return next;
      });
    }, replaySpeed);

    return () => clearInterval(interval);
  }, [isPlaying, replaySpeed]);

  const enterReplayMode = () => {
    setIsReplayMode(true);
    setViewYear(0);
  };

  const exitReplayMode = () => {
    setIsReplayMode(false);
    setIsPlaying(false);
    setViewYear(currentYear);
    onSnapshotChange?.(null, false);
  };

  const jumpToDecayEvent = (eventNo: number) => {
    setViewYear(eventNo * 2);
  };

  const formatSize = (kb: number) => {
    if (kb >= 1000000) return `${(kb / 1000000).toFixed(1)} GB`;
    if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`;
    return `${kb} KB`;
  };

  return (
    <Card className={cn(
      "terminal-card transition-all",
      isReplayMode && "ring-2 ring-primary/50"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timeline Replay
            {isReplayMode && (
              <Badge variant="secondary" className="ml-2 text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Replay Mode
              </Badge>
            )}
          </CardTitle>
          {!isReplayMode ? (
            <Button variant="outline" size="sm" onClick={enterReplayMode} className="gap-1">
              <Rewind className="w-3 h-3" />
              Enter Replay
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={exitReplayMode} className="text-muted-foreground">
              Exit Replay
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Year display and controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-3xl font-mono font-bold",
              isReplayMode ? "text-primary" : "text-muted-foreground"
            )}>
              Year {isReplayMode ? viewYear : currentYear}
            </span>
            {isReplayMode && viewYear !== currentYear && (
              <span className="text-xs text-muted-foreground">(viewing historical state)</span>
            )}
          </div>
          
          {isReplayMode && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsPlaying(false); setViewYear(0); }}
                disabled={viewYear === 0}
                className="h-8 w-8"
              >
                <Rewind className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsPlaying(false); setViewYear(Math.max(0, viewYear - 2)); }}
                disabled={viewYear === 0}
                className="h-8 w-8"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant={isPlaying ? "secondary" : "default"}
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-8 w-8"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsPlaying(false); setViewYear(Math.min(60, viewYear + 2)); }}
                disabled={viewYear >= 60}
                className="h-8 w-8"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsPlaying(false); setViewYear(60); }}
                disabled={viewYear === 60}
                className="h-8 w-8"
              >
                <FastForward className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Slider */}
        {isReplayMode && (
          <div className="space-y-2">
            <Slider
              value={[viewYear]}
              onValueChange={([v]) => {
                setIsPlaying(false);
                setViewYear(v);
              }}
              max={60}
              step={2}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              {[0, 10, 20, 30, 40, 50, 60].map(y => (
                <span 
                  key={y} 
                  className={cn(
                    "cursor-pointer hover:text-primary transition-colors",
                    viewYear === y && "text-primary font-medium"
                  )}
                  onClick={() => setViewYear(y)}
                >
                  {y}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Snapshot info */}
        {currentSnapshot && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Capacity</div>
                <div className={cn(
                  "font-mono text-lg",
                  currentSnapshot.capacityPercent > 50 ? "text-stage-full" :
                  currentSnapshot.capacityPercent > 25 ? "text-stage-summarized" :
                  "text-stage-deleted"
                )}>
                  {currentSnapshot.capacityPercent}%
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Storage Used</div>
                <div className="font-mono text-lg">{formatSize(currentSnapshot.storageUsedKb)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Decay Event</div>
                <div className="font-mono text-lg">
                  #{currentSnapshot.decayEventNo ?? 0} of 30
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Avg Score</div>
                <div className="font-mono text-lg">{currentSnapshot.avgSemanticScore.toFixed(1)}</div>
              </div>
            </div>

            {/* Stage distribution bars */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Stage Distribution</div>
              <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                {(['FULL', 'COMPRESSED', 'SUMMARIZED', 'MINIMAL', 'DELETED'] as DegradationStage[]).map((stage) => {
                  const count = currentSnapshot.stageCounts[stage];
                  const total = Object.values(currentSnapshot.stageCounts).reduce((a, b) => a + b, 0);
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div
                      key={stage}
                      className="transition-all duration-500 relative group"
                      style={{ 
                        width: `${percent}%`,
                        backgroundColor: STAGE_COLORS[stage],
                      }}
                      title={`${STAGE_LABELS[stage]}: ${count} items (${percent.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {(['FULL', 'COMPRESSED', 'SUMMARIZED', 'MINIMAL', 'DELETED'] as DegradationStage[]).map((stage) => (
                  <div key={stage} className="flex items-center gap-1">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: STAGE_COLORS[stage] }}
                    />
                    <span className="text-muted-foreground">{STAGE_LABELS[stage]}:</span>
                    <span className="font-mono">{currentSnapshot.stageCounts[stage]}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Decay event quick jumps */}
        {isReplayMode && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">Jump to Decay Event</div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 31 }, (_, i) => (
                <Button
                  key={i}
                  variant={currentSnapshot?.decayEventNo === i ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-6 w-6 p-0 text-xs font-mono",
                    i * 2 <= currentYear ? "opacity-100" : "opacity-40"
                  )}
                  onClick={() => jumpToDecayEvent(i)}
                  disabled={i * 2 > currentYear}
                >
                  {i}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
