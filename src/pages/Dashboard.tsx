import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { SimulationControls } from '@/components/simulation/SimulationControls';
import { StageDistributionChart } from '@/components/charts/StageDistributionChart';
import { CapacityTimelineChart } from '@/components/charts/CapacityTimelineChart';
import { GlobalTimelineReplay } from '@/components/timeline/GlobalTimelineReplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAIScoring } from '@/hooks/useAIScoring';
import { 
  Database, 
  HardDrive, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DashboardStats {
  totalItems: number;
  totalSizeKb: number;
  fullItems: number;
  deletedItems: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { 
    settings, 
    currentYear, 
    capacityPercent, 
    currentDecayEvent, 
    totalDecayEvents,
    initializeSimulation,
    loading: simLoading 
  } = useSimulation();
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalSizeKb: 0,
    fullItems: 0,
    deletedItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [unscoredCount, setUnscoredCount] = useState(0);
  const { batchAnalyzeItems, loading: aiLoading } = useAIScoring();

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const { data: items } = await supabase
        .from('archive_items')
        .select('stage, current_size_kb, semantic_score')
        .eq('owner_id', user.id);

      if (items) {
        setStats({
          totalItems: items.length,
          totalSizeKb: items.reduce((sum, item) => sum + (item.current_size_kb || 0), 0),
          fullItems: items.filter((item) => item.stage === 'FULL').length,
          deletedItems: items.filter((item) => item.stage === 'DELETED').length,
        });
        // Count items without AI-generated scores (default score of 50)
        const unscored = items.filter(item => item.semantic_score === 50).length;
        setUnscoredCount(unscored);
      }
      setLoading(false);
    };

    fetchStats();

    // Subscribe to changes
    const channel = supabase
      .channel('dashboard_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'archive_items' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const formatSize = (kb: number) => {
    if (kb >= 1000000) return `${(kb / 1000000).toFixed(1)} GB`;
    if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`;
    return `${kb} KB`;
  };

  if (simLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!settings) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Database className="w-10 h-10 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Welcome to TEAS</h2>
            <p className="text-muted-foreground max-w-md">
              Initialize your simulation to start exploring the entropic archival system.
              Configure decay parameters and manage your data through time.
            </p>
          </div>
          <Button onClick={initializeSimulation} size="lg" className="gap-2">
            <Database className="w-5 h-5" />
            Initialize Simulation
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-glow">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your archive's decay progression</p>
        </div>

        {/* Simulation Controls */}
        <SimulationControls />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="terminal-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="metric-label">Total Items</p>
                  <p className="metric-value text-2xl">{stats.totalItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="terminal-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="metric-label">Storage Used</p>
                  <p className="metric-value text-2xl">{formatSize(stats.totalSizeKb)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="terminal-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-stage-full/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-stage-full" />
                </div>
                <div>
                  <p className="metric-label">Full Fidelity</p>
                  <p className="metric-value text-2xl">{stats.fullItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="terminal-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-stage-deleted/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-stage-deleted" />
                </div>
                <div>
                  <p className="metric-label">Deleted</p>
                  <p className="metric-value text-2xl">{stats.deletedItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StageDistributionChart />
          <CapacityTimelineChart />
        </div>

        {/* Global Timeline Replay */}
        <GlobalTimelineReplay />

        {/* AI Scoring Section */}
        {unscoredCount > 0 && (
          <Card className="terminal-card border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">AI Semantic Analysis Available</p>
                    <p className="text-sm text-muted-foreground">
                      {unscoredCount} items need AI-powered semantic scoring
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={async () => {
                    const { data: items } = await supabase
                      .from('archive_items')
                      .select('id, title, content, item_type, tags')
                      .eq('owner_id', user!.id)
                      .eq('semantic_score', 50)
                      .limit(10);
                    
                    if (items && items.length > 0) {
                      await batchAnalyzeItems(items);
                    }
                  }}
                  disabled={aiLoading}
                  className="gap-2"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Analyze with AI
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decay Progress */}
        <Card className="terminal-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-accent" />
              Decay Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Simulation Year</span>
                <span className="font-mono">{currentYear} / 60</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{ width: `${(currentYear / 60) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Decay Events</span>
                <span className="font-mono">{currentDecayEvent} / {totalDecayEvents}</span>
              </div>
              <div className="grid grid-cols-30 gap-1">
                {Array.from({ length: 30 }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 rounded-sm transition-colors',
                      i < currentDecayEvent 
                        ? 'bg-accent' 
                        : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
