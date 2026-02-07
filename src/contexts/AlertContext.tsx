import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { DecayAlert, AlertSeverity, AlertType, PersistentAlert } from '@/types/alerts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface AlertContextType {
  alerts: DecayAlert[];
  persistentAlerts: PersistentAlert[];
  unreadCount: number;
  addAlert: (alert: Omit<DecayAlert, 'id' | 'timestamp' | 'dismissed'>) => Promise<void>;
  dismissAlert: (id: string) => void;
  dismissAll: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAlerts: () => void;
  fetchPersistentAlerts: () => Promise<void>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<DecayAlert[]>([]);
  const [persistentAlerts, setPersistentAlerts] = useState<PersistentAlert[]>([]);

  const fetchPersistentAlerts = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setPersistentAlerts(data as PersistentAlert[]);
    }
  }, [user]);

  useEffect(() => {
    fetchPersistentAlerts();

    if (!user) return;

    // Subscribe to new alerts
    const channel = supabase
      .channel('alerts_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'alerts',
        filter: `owner_id=eq.${user.id}`
      }, (payload) => {
        const newAlert = payload.new as PersistentAlert;
        setPersistentAlerts(prev => [newAlert, ...prev]);
        
        // Show toast for new alert
        const toastFn = newAlert.alert_type === 'item_deleted' || newAlert.alert_type === 'high_value_risk' 
          ? toast.error 
          : newAlert.alert_type === 'storage_pressure' 
            ? toast.warning 
            : toast.info;
        
        toastFn(newAlert.reason, {
          description: newAlert.item_title ? `Item: ${newAlert.item_title}` : undefined,
          duration: 5000,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPersistentAlerts]);

  const addAlert = useCallback(async (alert: Omit<DecayAlert, 'id' | 'timestamp' | 'dismissed'>) => {
    if (!user) return;

    const newAlert: DecayAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      dismissed: false,
    };

    setAlerts(prev => [newAlert, ...prev.slice(0, 99)]);

    // Persist to database
    await supabase.from('alerts').insert({
      owner_id: user.id,
      alert_type: alert.alertType,
      item_id: alert.itemId || null,
      item_title: alert.itemTitle || null,
      semantic_score: alert.semanticScore || null,
      current_stage: alert.currentStage || null,
      target_stage: alert.targetStage || null,
      storage_pressure: alert.storagePressure || null,
      reason: alert.reason,
      simulated_year: alert.simulatedYear,
    });

    // Show toast based on severity
    const toastOptions = {
      description: alert.itemTitle ? `${alert.itemTitle} → ${alert.targetStage}` : undefined,
      duration: alert.severity === 'critical' ? 10000 : 5000,
    };

    if (alert.severity === 'critical') {
      toast.error(`Critical: ${alert.reason}`, toastOptions);
    } else if (alert.severity === 'warning') {
      toast.warning(`Warning: ${alert.reason}`, toastOptions);
    } else {
      toast.info(alert.reason, toastOptions);
    }
  }, [user]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  }, []);

  const dismissAll = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, dismissed: true })));
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    setPersistentAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('alerts').update({ is_read: true }).eq('owner_id', user.id);
    setPersistentAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  }, [user]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const unreadCount = persistentAlerts.filter(a => !a.is_read).length;

  return (
    <AlertContext.Provider value={{ 
      alerts, 
      persistentAlerts,
      unreadCount, 
      addAlert, 
      dismissAlert, 
      dismissAll, 
      markAsRead,
      markAllAsRead,
      clearAlerts,
      fetchPersistentAlerts,
    }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}
