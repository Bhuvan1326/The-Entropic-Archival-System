import { useSimulation } from '@/contexts/SimulationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, SkipForward, RotateCcw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SimulationControls() {
  const {
    isRunning,
    currentYear,
    nextDecayIn,
    currentDecayEvent,
    totalDecayEvents,
    capacityPercent,
    startSimulation,
    pauseSimulation,
    stepNextDecay,
    resetSimulation,
  } = useSimulation();

  return (
    <Card className="terminal-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Status indicators */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="metric-value text-2xl">{currentYear}</div>
              <div className="metric-label">Year</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <div className={cn(
                "metric-value text-2xl",
                capacityPercent > 50 ? "text-stage-full" :
                capacityPercent > 25 ? "text-stage-summarized" :
                "text-stage-deleted"
              )}>
                {capacityPercent}%
              </div>
              <div className="metric-label">Capacity</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <div className="metric-value text-2xl">{currentDecayEvent}/{totalDecayEvents}</div>
              <div className="metric-label">Decay Events</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <div className="metric-value text-2xl text-accent">{nextDecayIn}</div>
              <div className="metric-label">Years to Decay</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button
                onClick={pauseSimulation}
                variant="outline"
                className="gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            ) : (
              <Button
                onClick={startSimulation}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Start
              </Button>
            )}
            <Button
              onClick={stepNextDecay}
              variant="outline"
              className="gap-2"
              disabled={isRunning}
            >
              <SkipForward className="w-4 h-4" />
              Step
            </Button>
            <Button
              onClick={resetSimulation}
              variant="ghost"
              className="gap-2 text-muted-foreground hover:text-destructive"
              disabled={isRunning}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Running indicator */}
        {isRunning && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-primary">
            <Zap className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Simulation in progress...</span>
            <span className="text-xs text-muted-foreground ml-auto">
              Next decay event in {nextDecayIn} simulated years
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
