import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, Info } from 'lucide-react';

interface Weights {
  weight_relevance: number;
  weight_uniqueness: number;
  weight_reconstructability: number;
}

export default function Settings() {
  const { user } = useAuth();
  const { settings, initializeSimulation } = useSimulation();
  const [weights, setWeights] = useState<Weights>({
    weight_relevance: 0.40,
    weight_uniqueness: 0.35,
    weight_reconstructability: 0.25,
  });
  const [timeScale, setTimeScale] = useState(1000);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchWeights = async () => {
      const { data } = await supabase
        .from('valuation_weights')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (data) {
        setWeights({
          weight_relevance: Number(data.weight_relevance),
          weight_uniqueness: Number(data.weight_uniqueness),
          weight_reconstructability: Number(data.weight_reconstructability),
        });
      }
    };

    fetchWeights();
  }, [user]);

  useEffect(() => {
    if (settings) {
      setTimeScale(settings.time_scale_ms);
    }
  }, [settings]);

  const handleSaveWeights = async () => {
    if (!user) return;
    setLoading(true);

    // Normalize weights
    const total = weights.weight_relevance + weights.weight_uniqueness + weights.weight_reconstructability;
    const normalized = {
      weight_relevance: weights.weight_relevance / total,
      weight_uniqueness: weights.weight_uniqueness / total,
      weight_reconstructability: weights.weight_reconstructability / total,
    };

    const { error } = await supabase
      .from('valuation_weights')
      .update({
        ...normalized,
        updated_at: new Date().toISOString(),
      })
      .eq('owner_id', user.id);

    if (error) {
      // Try insert if update fails
      await supabase.from('valuation_weights').insert({
        owner_id: user.id,
        ...normalized,
      });
    }

    toast.success('Valuation weights saved');
    setLoading(false);
  };

  const handleSaveTimeScale = async () => {
    if (!settings) return;
    setLoading(true);

    await supabase
      .from('simulation_settings')
      .update({
        time_scale_ms: timeScale,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    toast.success('Time scale updated');
    setLoading(false);
  };

  const total = weights.weight_relevance + weights.weight_uniqueness + weights.weight_reconstructability;

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-glow">Settings</h1>
          <p className="text-muted-foreground">Configure simulation parameters and valuation weights</p>
        </div>

        {/* Valuation Weights */}
        <Card className="terminal-card">
          <CardHeader>
            <CardTitle className="text-lg">Semantic Valuation Weights</CardTitle>
            <CardDescription>
              Configure how each dimension contributes to the overall semantic score.
              Weights will be normalized to sum to 1.0.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Relevance / Long-term Value</Label>
                  <span className="font-mono text-sm">{(weights.weight_relevance / total * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[weights.weight_relevance * 100]}
                  onValueChange={([v]) => setWeights({ ...weights, weight_relevance: v / 100 })}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  How important or valuable is this item for future use?
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Uniqueness / Redundancy</Label>
                  <span className="font-mono text-sm">{(weights.weight_uniqueness / total * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[weights.weight_uniqueness * 100]}
                  onValueChange={([v]) => setWeights({ ...weights, weight_uniqueness: v / 100 })}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  How unique is this item? Can similar information be found elsewhere?
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Reconstructability / Summarizability</Label>
                  <span className="font-mono text-sm">{(weights.weight_reconstructability / total * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[weights.weight_reconstructability * 100]}
                  onValueChange={([v]) => setWeights({ ...weights, weight_reconstructability: v / 100 })}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  How well can this item be compressed or summarized without losing meaning?
                </p>
              </div>
            </div>

            <Button onClick={handleSaveWeights} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Weights
            </Button>
          </CardContent>
        </Card>

        {/* Time Scale */}
        <Card className="terminal-card">
          <CardHeader>
            <CardTitle className="text-lg">Simulation Time Scale</CardTitle>
            <CardDescription>
              Control how fast the simulation runs. Lower values = faster simulation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timeScale">Milliseconds per simulated year</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="timeScale"
                  type="number"
                  value={timeScale}
                  onChange={(e) => setTimeScale(Number(e.target.value))}
                  min={100}
                  max={10000}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  ≈ {((timeScale * 2) / 1000).toFixed(1)}s per decay event
                </span>
              </div>
            </div>

            <Button onClick={handleSaveTimeScale} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Time Scale
            </Button>
          </CardContent>
        </Card>

        {/* Bias Explanation */}
        <Card className="terminal-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              Bias & Trade-offs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Relevance Weight:</strong> Higher values preserve "important" items longer, 
              but importance is subjective and may not reflect future needs.
            </p>
            <p>
              <strong className="text-foreground">Uniqueness Weight:</strong> Higher values preserve unique content, 
              but may discard commonly-needed information that exists elsewhere.
            </p>
            <p>
              <strong className="text-foreground">Reconstructability Weight:</strong> Higher values favor items that 
              can be summarized well, potentially losing nuanced or complex data earlier.
            </p>
            <div className="p-3 bg-accent/10 rounded-lg border border-accent/30 mt-4">
              <p className="text-accent">
                <strong>Note:</strong> The TEAS system makes autonomous, irreversible decisions. 
                Choose your weights carefully based on what matters most for your archive's purpose.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
