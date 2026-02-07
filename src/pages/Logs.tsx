import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StageBadge } from '@/components/archive/StageBadge';
import { supabase } from '@/integrations/supabase/client';
import { DecayEvent, DegradationLog, DegradationStage } from '@/types/archive';
import { 
  Clock, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EnrichedDecayEvent extends DecayEvent {
  logs: DegradationLog[];
}

export default function Logs() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EnrichedDecayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchLogs = async () => {
      const { data: decayEvents } = await supabase
        .from('decay_events')
        .select('*')
        .eq('owner_id', user.id)
        .order('simulated_year', { ascending: false });

      if (decayEvents) {
        const enriched: EnrichedDecayEvent[] = await Promise.all(
          decayEvents.map(async (event) => {
            const { data: logs } = await supabase
              .from('degradation_logs')
              .select('*')
              .eq('decay_event_id', event.id)
              .order('created_at', { ascending: true });

            return {
              ...event,
              logs: (logs || []) as DegradationLog[],
            } as EnrichedDecayEvent;
          })
        );

        setEvents(enriched);
      }
      setLoading(false);
    };

    fetchLogs();

    const channel = supabase
      .channel('logs_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'decay_events' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const formatSize = (kb: number) => {
    if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`;
    return `${kb} KB`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-glow">Decay Logs</h1>
          <p className="text-muted-foreground">Historical record of all decay events and decisions</p>
        </div>

        {loading ? (
          <Card className="terminal-card">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading logs...</p>
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card className="terminal-card">
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Decay Events Yet</h3>
              <p className="text-muted-foreground">
                Start the simulation to see decay events and their effects on your archive
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const isExpanded = expandedId === event.id;
              const capacityChange = event.capacity_before_kb - event.capacity_after_kb;
              const storageChange = event.storage_before_kb - event.storage_after_kb;

              return (
                <Card key={event.id} className="terminal-card">
                  <CardContent className="p-4">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                          <TrendingDown className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">Decay Event #{event.event_no}</h3>
                            <Badge variant="outline" className="font-mono">
                              Year {event.simulated_year}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Capacity: -{formatSize(capacityChange)}</span>
                            <span>•</span>
                            <span>Storage freed: {formatSize(storageChange)}</span>
                            <span>•</span>
                            <span className={cn(
                              event.items_affected > 0 ? 'text-stage-deleted' : 'text-muted-foreground'
                            )}>
                              {event.items_affected} items affected
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="text-muted-foreground">
                            {format(new Date(event.created_at), 'MMM d, HH:mm')}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-up">
                        {/* Capacity Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground">Capacity Before</div>
                            <div className="font-mono">{formatSize(event.capacity_before_kb)}</div>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground">Capacity After</div>
                            <div className="font-mono">{formatSize(event.capacity_after_kb)}</div>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground">Storage Before</div>
                            <div className="font-mono">{formatSize(event.storage_before_kb)}</div>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground">Storage After</div>
                            <div className="font-mono">{formatSize(event.storage_after_kb)}</div>
                          </div>
                        </div>

                        {/* Degradation Logs */}
                        {event.logs.length > 0 ? (
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Degradation Decisions ({event.logs.length})
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-terminal">
                              {event.logs.map((log) => (
                                <div 
                                  key={log.id}
                                  className="p-3 bg-muted/20 rounded-lg text-sm"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium truncate flex-1 mr-2">
                                      {log.item_title || 'Unknown Item'}
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <StageBadge stage={log.prev_stage as DegradationStage} size="sm" />
                                      <span className="text-muted-foreground">→</span>
                                      <StageBadge stage={log.new_stage as DegradationStage} size="sm" />
                                    </div>
                                  </div>
                                  <p className="text-muted-foreground text-xs">{log.reason}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>Score: {log.semantic_score?.toFixed(1)}</span>
                                    <span>
                                      Size: {log.size_before_kb}KB → {log.size_after_kb}KB
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-muted/20 rounded-lg text-center text-muted-foreground">
                            <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
                            <p className="text-sm">No items were degraded in this event</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
