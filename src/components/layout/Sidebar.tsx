import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { NotificationsPanel } from '@/components/alerts/NotificationsPanel';
import { cn } from '@/lib/utils';
import {
  Database,
  LayoutDashboard,
  Upload,
  Archive,
  Search,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertPanel } from '@/components/alerts/AlertPanel';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/ingest', label: 'Ingest Data', icon: Upload },
  { path: '/explorer', label: 'Archive Explorer', icon: Archive },
  { path: '/query', label: 'Query Archive', icon: Search },
  { path: '/baselines', label: 'Baselines Compare', icon: BarChart3 },
  { path: '/logs', label: 'Logs', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currentYear, capacityPercent, isRunning } = useSimulation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center",
            isRunning && "pulse-active"
          )}>
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-glow">TEAS</h1>
            <p className="text-xs text-muted-foreground">Entropic Archive</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationsPanel />
          <AlertPanel />
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-3 border-b border-sidebar-border bg-muted/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Year</span>
          <span className="font-mono font-medium">{currentYear} / 60</span>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Capacity</span>
            <span className={cn(
              "font-mono font-medium",
              capacityPercent > 50 ? "text-stage-full" :
              capacityPercent > 25 ? "text-stage-summarized" :
              "text-stage-deleted"
            )}>
              {capacityPercent}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full decay-progress transition-all duration-500"
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>
        {isRunning && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
            <Zap className="w-3 h-3 animate-pulse" />
            <span>Simulation running...</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-terminal">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "nav-active"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user?.email?.[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Archivist</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
