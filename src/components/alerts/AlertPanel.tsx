import { useAlerts } from '@/contexts/AlertContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { StageBadge } from '@/components/archive/StageBadge';
import { Bell, X, CheckCheck, Trash2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DegradationStage } from '@/types/archive';

export function AlertPanel() {
  const { alerts, unreadCount, dismissAlert, dismissAll, clearAlerts } = useAlerts();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-stage-deleted" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-stage-summarized" />;
      default: return <Info className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-stage-deleted text-white text-xs rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-96 bg-card border-border">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Decay Alerts</SheetTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={dismissAll} className="text-xs gap-1">
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </Button>
              )}
              {alerts.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAlerts} className="text-xs gap-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">No alerts yet</p>
              <p className="text-xs">Decay alerts will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    alert.dismissed 
                      ? "bg-muted/20 border-border opacity-60" 
                      : "bg-muted/40 border-primary/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(alert.severity)}
                      <div className="space-y-1">
                        <p className="text-sm font-medium line-clamp-1">{alert.itemTitle}</p>
                        <div className="flex items-center gap-2">
                          <StageBadge stage={alert.currentStage as DegradationStage} size="sm" showLabel={false} />
                          <span className="text-xs text-muted-foreground">→</span>
                          <StageBadge stage={alert.targetStage as DegradationStage} size="sm" showLabel={false} />
                        </div>
                      </div>
                    </div>
                    {!alert.dismissed && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">{alert.reason}</p>
                  
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>Score: {alert.semanticScore.toFixed(1)}</span>
                    <span>{format(alert.timestamp, 'HH:mm:ss')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
