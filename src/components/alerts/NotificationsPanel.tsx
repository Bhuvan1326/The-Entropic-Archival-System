import { useAlerts } from '@/contexts/AlertContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StageBadge } from '@/components/archive/StageBadge';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  HardDrive,
  Clock,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DegradationStage } from '@/types/archive';
import { AlertType, PersistentAlert } from '@/types/alerts';

const ALERT_ICONS: Record<AlertType, typeof AlertCircle> = {
  storage_pressure: HardDrive,
  high_value_risk: AlertTriangle,
  decay_approaching: Clock,
  item_degraded: TrendingDown,
  item_deleted: AlertCircle,
};

const ALERT_COLORS: Record<AlertType, string> = {
  storage_pressure: 'text-stage-summarized',
  high_value_risk: 'text-stage-deleted',
  decay_approaching: 'text-primary',
  item_degraded: 'text-stage-minimal',
  item_deleted: 'text-stage-deleted',
};

export function NotificationsPanel() {
  const { persistentAlerts, unreadCount, markAsRead, markAllAsRead } = useAlerts();

  const unreadAlerts = persistentAlerts.filter(a => !a.is_read);
  const readAlerts = persistentAlerts.filter(a => a.is_read);

  const renderAlert = (alert: PersistentAlert) => {
    const Icon = ALERT_ICONS[alert.alert_type] || Info;
    const colorClass = ALERT_COLORS[alert.alert_type] || 'text-primary';

    return (
      <div
        key={alert.id}
        className={cn(
          "p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
          alert.is_read 
            ? "bg-muted/20 border-border opacity-70" 
            : "bg-muted/40 border-primary/20"
        )}
        onClick={() => !alert.is_read && markAsRead(alert.id)}
      >
        <div className="flex items-start gap-3">
          <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", colorClass)} />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-xs">
                Year {alert.simulated_year}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(alert.created_at), 'MMM d, HH:mm')}
              </span>
            </div>
            
            {alert.item_title && (
              <p className="text-sm font-medium line-clamp-1">{alert.item_title}</p>
            )}
            
            <p className="text-xs text-muted-foreground">{alert.reason}</p>
            
            <div className="flex items-center gap-2 flex-wrap">
              {alert.current_stage && alert.target_stage && (
                <div className="flex items-center gap-1">
                  <StageBadge stage={alert.current_stage as DegradationStage} size="sm" showLabel={false} />
                  <span className="text-xs text-muted-foreground">→</span>
                  <StageBadge stage={alert.target_stage as DegradationStage} size="sm" showLabel={false} />
                </div>
              )}
              {alert.semantic_score && (
                <span className="text-xs text-muted-foreground font-mono">
                  Score: {alert.semantic_score.toFixed(1)}
                </span>
              )}
              {alert.storage_pressure && (
                <span className="text-xs text-muted-foreground font-mono">
                  Pressure: {alert.storage_pressure.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
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
      <SheetContent className="w-[400px] bg-card border-border">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs gap-1">
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="unread" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unread" className="gap-1">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {unreadAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm">No unread notifications</p>
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {unreadAlerts.map(renderAlert)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {persistentAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs">Alerts will appear here during simulation</p>
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {persistentAlerts.map(renderAlert)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
