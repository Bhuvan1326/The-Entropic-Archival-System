import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StageBadge } from '@/components/archive/StageBadge';
import { ItemHistoryEntry } from '@/types/alerts';
import { DegradationStage, STAGE_COLORS } from '@/types/archive';
import { Clock, ArrowDown, Sparkles, HardDrive, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ItemHistoryTimelineProps {
  itemId: string;
  itemTitle?: string;
}

export function ItemHistoryTimeline({ itemId, itemTitle }: ItemHistoryTimelineProps) {
  const { user } = useAuth();
  const [history, setHistory] = useState<ItemHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !itemId) return;

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('degradation_logs')
        .select(`
          id,
          decay_event_id,
          prev_stage,
          new_stage,
          reason,
          semantic_score,
          storage_pressure,
          size_before_kb,
          size_after_kb,
          created_at,
          decay_events!inner(simulated_year)
        `)
        .eq('item_id', itemId)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        const entries: ItemHistoryEntry[] = data.map((d: any) => ({
          id: d.id,
          decay_event_id: d.decay_event_id,
          simulated_year: d.decay_events?.simulated_year || 0,
          prev_stage: d.prev_stage,
          new_stage: d.new_stage,
          reason: d.reason,
          semantic_score: d.semantic_score,
          storage_pressure: d.storage_pressure,
          size_before_kb: d.size_before_kb,
          size_after_kb: d.size_after_kb,
          created_at: d.created_at,
        }));
        setHistory(entries);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [user, itemId]);

  if (loading) {
    return (
      <Card className="terminal-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Loading history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="terminal-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Item History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <Sparkles className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No degradation history yet</p>
            <p className="text-xs">This item is still at full fidelity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="terminal-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Degradation History
          {itemTitle && (
            <span className="text-muted-foreground font-normal">— {itemTitle}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {/* Initial state marker */}
            <div className="relative flex items-start gap-4 pl-4">
              <div className="absolute left-2 w-4 h-4 rounded-full bg-stage-full border-2 border-background" />
              <div className="pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">Year 0</Badge>
                  <span className="text-xs text-muted-foreground">Ingested</span>
                </div>
                <div className="flex items-center gap-2">
                  <StageBadge stage="FULL" size="sm" />
                  <span className="text-xs text-muted-foreground">Original fidelity</span>
                </div>
              </div>
            </div>

            {/* Degradation events */}
            {history.map((entry, index) => {
              const stageColor = STAGE_COLORS[entry.new_stage as DegradationStage] || 'hsl(0, 0%, 50%)';
              const sizeSaved = (entry.size_before_kb || 0) - (entry.size_after_kb || 0);
              
              return (
                <div key={entry.id} className="relative flex items-start gap-4 pl-4">
                  {/* Timeline dot */}
                  <div 
                    className="absolute left-2 w-4 h-4 rounded-full border-2 border-background"
                    style={{ backgroundColor: stageColor }}
                  />
                  
                  <div className="pl-4 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        Year {entry.simulated_year}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>

                    {/* Stage transition */}
                    <div className="flex items-center gap-2 mb-2">
                      <StageBadge stage={entry.prev_stage as DegradationStage} size="sm" />
                      <ArrowDown className="w-4 h-4 text-muted-foreground rotate-[-90deg]" />
                      <StageBadge stage={entry.new_stage as DegradationStage} size="sm" />
                    </div>

                    {/* Reason */}
                    <p className="text-sm text-muted-foreground mb-2">
                      <FileText className="w-3 h-3 inline mr-1" />
                      {entry.reason}
                    </p>

                    {/* Metrics */}
                    <div className="flex flex-wrap gap-4 text-xs">
                      {entry.semantic_score !== null && (
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-primary" />
                          <span className="text-muted-foreground">Score:</span>
                          <span className="font-mono">{entry.semantic_score.toFixed(1)}</span>
                        </div>
                      )}
                      {entry.storage_pressure !== null && (
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-accent" />
                          <span className="text-muted-foreground">Pressure:</span>
                          <span className="font-mono">{entry.storage_pressure.toFixed(0)}%</span>
                        </div>
                      )}
                      {sizeSaved > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Size:</span>
                          <span className="font-mono">
                            {entry.size_before_kb}KB → {entry.size_after_kb}KB
                          </span>
                          <span className="text-stage-full">(-{sizeSaved}KB)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Final state if deleted */}
            {history.length > 0 && history[history.length - 1].new_stage === 'DELETED' && (
              <div className="relative flex items-start gap-4 pl-4">
                <div 
                  className="absolute left-2 w-4 h-4 rounded-full border-2 border-background bg-stage-deleted"
                />
                <div className="pl-4">
                  <div className="text-sm text-stage-deleted font-medium">
                    Permanently Deleted
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This item has been irreversibly removed from the archive
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
