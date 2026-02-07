import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { TimelineSnapshot } from '@/types/alerts';
import { STAGE_COLORS, DegradationStage } from '@/types/archive';
import { Play, Pause, SkipBack, SkipForward, Clock, Rewind } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineSliderProps {
  onYearChange?: (snapshot: TimelineSnapshot | null) => void;
}

export function TimelineSlider({ onYearChange }: TimelineSliderProps) {
  const { user } = useAuth();
  const { currentYear, settings } = useSimulation();
  const [viewYear, setViewYear] = useState(0);
  const [snapshots, setSnapshots] = useState<Map<number, TimelineSnapshot>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] = useState<TimelineSnapshot | null>(null);

  // Build snapshots from decay events
  useEffect(() => {
    if (!user || !settings) return;

    const buildSnapshots = async () => {
      const { data: events } = await supabase
        .from('decay_events')
        .select('*')
        .eq('owner_id', user.id)
        .order('simulated_year', { ascending: true });

      const { data: items } = await supabase
        .from('archive_items')
        .select('stage, current_size_kb, semantic_score')
        .eq('owner_id', user.id);

      const snapshotMap = new Map<number, TimelineSnapshot>();
      
      // Initial state (Year 0)
      const initialCounts = {
        FULL: items?.filter(i => i.stage === 'FULL').length || 0,
        COMPRESSED: items?.filter(i => i.stage === 'COMPRESSED').length || 0,
        SUMMARIZED: items?.filter(i => i.stage === 'SUMMARIZED').length || 0,
        MINIMAL: items?.filter(i => i.stage === 'MINIMAL').length || 0,
        DELETED: items?.filter(i => i.stage === 'DELETED').length || 0,
      };

      snapshotMap.set(0, {
        year: 0,
        capacityKb: settings.start_capacity_kb,
        capacityPercent: 100,
        storageUsedKb: items?.reduce((s, i) => s + (i.current_size_kb || 0), 0) || 0,
        stageCounts: { FULL: items?.length || 0, COMPRESSED: 0, SUMMARIZED: 0, MINIMAL: 0, DELETED: 0 },
        avgSemanticScore: items?.length 
          ? items.reduce((s, i) => s + (i.semantic_score || 0), 0) / items.length 
          : 0,
        decayEventNo: null,
        itemsAffected: 0,
      });

      // Build snapshots from events
      if (events) {
        events.forEach((event) => {
          snapshotMap.set(event.simulated_year, {
            year: event.simulated_year,
            capacityKb: event.capacity_after_kb,
            capacityPercent: Math.round((event.capacity_after_kb / settings.start_capacity_kb) * 100),
            storageUsedKb: event.storage_after_kb,
            stageCounts: initialCounts, // Simplified - would need degradation logs for accuracy
            avgSemanticScore: 50, // Placeholder
            decayEventNo: event.event_no,
            itemsAffected: event.items_affected || 0,
          });
        });
      }

      // Current state
      snapshotMap.set(currentYear, {
        year: currentYear,
        capacityKb: settings.current_capacity_kb,
        capacityPercent: Math.round((settings.current_capacity_kb / settings.start_capacity_kb) * 100),
        storageUsedKb: items?.reduce((s, i) => s + (i.current_size_kb || 0), 0) || 0,
        stageCounts: initialCounts,
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
  const getSnapshotForYear = (year: number): TimelineSnapshot | null => {
    if (snapshots.has(year)) return snapshots.get(year)!;
    
    // Find nearest previous year
    let nearestYear = 0;
    snapshots.forEach((_, y) => {
      if (y <= year && y > nearestYear) nearestYear = y;
    });
    
    return snapshots.get(nearestYear) || null;
  };

  // Handle year change
  useEffect(() => {
    const snapshot = getSnapshotForYear(viewYear);
    setCurrentSnapshot(snapshot);
    onYearChange?.(snapshot);
  }, [viewYear, snapshots]);

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
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatSize = (kb: number) => {
    if (kb >= 1000000) return `${(kb / 1000000).toFixed(1)} GB`;
    if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`;
    return `${kb} KB`;
  };

  return (
    <Card className="terminal-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Timeline Replay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Year display */}
        <div className="flex items-center justify-between">
          <span className="text-3xl font-mono font-bold text-primary">Year {viewYear}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewYear(0)}
              disabled={viewYear === 0}
            >
              <Rewind className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewYear(Math.max(0, viewYear - 2))}
              disabled={viewYear === 0}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant={isPlaying ? "secondary" : "default"}
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewYear(Math.min(60, viewYear + 2))}
              disabled={viewYear >= 60}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Slider */}
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
            <span>0</span>
            <span>10</span>
            <span>20</span>
            <span>30</span>
            <span>40</span>
            <span>50</span>
            <span>60</span>
          </div>
        </div>

        {/* Snapshot info */}
        {currentSnapshot && (
          <div className="grid grid-cols-2 gap-4 pt-2">
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
                #{currentSnapshot.decayEventNo ?? '-'} of 30
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Items Affected</div>
              <div className="font-mono text-lg">{currentSnapshot.itemsAffected}</div>
            </div>
          </div>
        )}

        {/* Stage distribution mini-bars */}
        {currentSnapshot && (
          <div className="space-y-2 pt-2">
            <div className="text-xs text-muted-foreground">Stage Distribution</div>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {(['FULL', 'COMPRESSED', 'SUMMARIZED', 'MINIMAL', 'DELETED'] as DegradationStage[]).map((stage) => {
                const count = currentSnapshot.stageCounts[stage];
                const total = Object.values(currentSnapshot.stageCounts).reduce((a, b) => a + b, 0);
                const percent = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div
                    key={stage}
                    className="transition-all duration-300"
                    style={{ 
                      width: `${percent}%`,
                      backgroundColor: STAGE_COLORS[stage],
                    }}
                    title={`${stage}: ${count} items`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
