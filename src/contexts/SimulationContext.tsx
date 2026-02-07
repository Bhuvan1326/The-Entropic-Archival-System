import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAlerts } from './AlertContext';
import { AlertSeverity } from '@/types/alerts';

interface SimulationSettings {
  id: string;
  start_capacity_kb: number;
  current_capacity_kb: number;
  current_year: number;
  total_years: number;
  decay_percent: number;
  decay_interval_years: number;
  is_running: boolean;
  time_scale_ms: number;
}

interface SimulationContextType {
  settings: SimulationSettings | null;
  loading: boolean;
  isRunning: boolean;
  currentYear: number;
  capacityPercent: number;
  nextDecayIn: number;
  totalDecayEvents: number;
  currentDecayEvent: number;
  startSimulation: () => void;
  pauseSimulation: () => void;
  stepNextDecay: () => Promise<void>;
  resetSimulation: () => Promise<void>;
  initializeSimulation: () => Promise<void>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { addAlert } = useAlerts();
  const [settings, setSettings] = useState<SimulationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('simulation_settings')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching simulation settings:', error);
      return;
    }

    if (data) {
      setSettings(data as SimulationSettings);
      setIsRunning(data.is_running || false);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const initializeSimulation = useCallback(async () => {
    if (!user) return;

    // Check if settings already exist
    const { data: existing } = await supabase
      .from('simulation_settings')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (existing) {
      await fetchSettings();
      return;
    }

    // Create new simulation settings
    const { data, error } = await supabase
      .from('simulation_settings')
      .insert({
        owner_id: user.id,
        start_capacity_kb: 1000000, // 1GB
        current_capacity_kb: 1000000,
        current_year: 0,
        total_years: 60,
        decay_percent: 5,
        decay_interval_years: 2,
        is_running: false,
        time_scale_ms: 1000,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating simulation settings:', error);
      toast.error('Failed to initialize simulation');
      return;
    }

    // Also create default valuation weights
    await supabase
      .from('valuation_weights')
      .insert({
        owner_id: user.id,
        weight_relevance: 0.40,
        weight_uniqueness: 0.35,
        weight_reconstructability: 0.25,
      });

    setSettings(data as SimulationSettings);
    toast.success('Simulation initialized');
  }, [user, fetchSettings]);

  const currentYear = settings?.current_year || 0;
  const capacityPercent = settings 
    ? Math.round((settings.current_capacity_kb / settings.start_capacity_kb) * 100) 
    : 100;
  const totalDecayEvents = settings 
    ? Math.floor(settings.total_years / settings.decay_interval_years) 
    : 30;
  const currentDecayEvent = settings 
    ? Math.floor(currentYear / settings.decay_interval_years) 
    : 0;
  const nextDecayIn = settings 
    ? settings.decay_interval_years - (currentYear % settings.decay_interval_years) 
    : 2;

  // Check for decay approaching and trigger alerts
  useEffect(() => {
    if (!settings || !user) return;
    
    // Alert when within 2 years of next decay event
    if (nextDecayIn <= 2 && nextDecayIn > 0 && currentYear < settings.total_years) {
      const nextDecayYear = currentYear + nextDecayIn;
      addAlert({
        itemId: undefined,
        itemTitle: undefined,
        currentStage: undefined,
        targetStage: undefined,
        semanticScore: 0,
        storagePressure: undefined,
        reason: `Decay event approaching in ${nextDecayIn} year(s) at Year ${nextDecayYear}`,
        severity: 'info',
        alertType: 'decay_approaching',
        simulatedYear: currentYear,
      });
    }
  }, [currentYear, nextDecayIn, settings, user, addAlert]);

  const processDecayEvent = useCallback(async () => {
    if (!settings || !user) return;

    const newYear = settings.current_year + settings.decay_interval_years;
    if (newYear > settings.total_years) {
      setIsRunning(false);
      await supabase
        .from('simulation_settings')
        .update({ is_running: false })
        .eq('id', settings.id);
      toast.info('Simulation complete - 60 years elapsed');
      return;
    }

    const capacityBefore = settings.current_capacity_kb;
    const capacityAfter = Math.floor(capacityBefore * (1 - settings.decay_percent / 100));
    const eventNo = Math.floor(newYear / settings.decay_interval_years);

    // Get current storage usage
    const { data: items } = await supabase
      .from('archive_items')
      .select('id, current_size_kb, stage, semantic_score, title, val_reconstructability')
      .eq('owner_id', user.id)
      .neq('stage', 'DELETED')
      .order('semantic_score', { ascending: true });

    const storageBefore = items?.reduce((sum, item) => sum + (item.current_size_kb || 0), 0) || 0;

    // Create decay event
    const { data: decayEvent } = await supabase
      .from('decay_events')
      .insert({
        owner_id: user.id,
        event_no: eventNo,
        simulated_year: newYear,
        capacity_before_kb: capacityBefore,
        capacity_after_kb: capacityAfter,
        storage_before_kb: storageBefore,
        storage_after_kb: storageBefore, // Will update after degradation
        items_affected: 0,
      })
      .select()
      .single();

    // Process degradation if storage exceeds new capacity
    let itemsAffected = 0;
    let currentStorage = storageBefore;

    if (items && currentStorage > capacityAfter) {
      // Sort by semantic score (lowest first) for degradation
      const sortedItems = [...items].sort((a, b) => (a.semantic_score || 0) - (b.semantic_score || 0));

      // Check for high-value items at risk and generate alerts
      const storagePressure = (currentStorage / capacityAfter) * 100;
      if (storagePressure > 80) {
        // Alert for storage pressure
        addAlert({
          itemId: undefined,
          itemTitle: 'System Alert',
          currentStage: undefined,
          targetStage: undefined,
          semanticScore: 0,
          storagePressure,
          reason: `Storage usage at ${storagePressure.toFixed(1)}% of capacity - degradation required`,
          severity: storagePressure > 100 ? 'critical' : 'warning',
          alertType: 'storage_pressure',
          simulatedYear: newYear,
        });
      }

      for (const item of sortedItems) {
        if (currentStorage <= capacityAfter) break;

        const prevStage = item.stage;
        let newStage = prevStage;
        let newSize = item.current_size_kb;
        let reason = '';

        const itemStoragePressure = (currentStorage / capacityAfter) * 100;
        const reconstructability = item.val_reconstructability || 50;

        // Determine next degradation stage
        switch (prevStage) {
          case 'FULL':
            newStage = 'COMPRESSED';
            newSize = Math.floor(item.current_size_kb * 0.7);
            reason = `Storage pressure at ${itemStoragePressure.toFixed(1)}%. Low semantic score (${item.semantic_score?.toFixed(1)}).`;
            break;
          case 'COMPRESSED':
            newStage = 'SUMMARIZED';
            newSize = Math.floor(item.current_size_kb * 0.3);
            reason = `Continued storage pressure. Reconstructability: ${reconstructability.toFixed(1)}%.`;
            break;
          case 'SUMMARIZED':
            newStage = 'MINIMAL';
            newSize = Math.floor(item.current_size_kb * 0.1);
            reason = `High storage pressure. Preserving metadata only.`;
            break;
          case 'MINIMAL':
            newStage = 'DELETED';
            newSize = 0;
            reason = `Critical storage pressure. Item permanently removed.`;
            break;
        }

        if (newStage !== prevStage) {
          // Determine alert severity based on semantic score and stage transition
          let severity: AlertSeverity = 'info';
          if ((item.semantic_score || 0) > 70) {
            severity = newStage === 'DELETED' ? 'critical' : 'warning';
          } else if (newStage === 'DELETED') {
            severity = 'warning';
          }

          // Add alert for high-value items or deletions
          const isHighValue = (item.semantic_score || 0) >= 80;
          const alertType = newStage === 'DELETED' ? 'item_deleted' : isHighValue ? 'high_value_risk' : 'item_degraded';
          
          // Only alert for high-value items or deletions
          if (isHighValue || newStage === 'DELETED') {
            addAlert({
              itemId: item.id,
              itemTitle: item.title,
              currentStage: prevStage,
              targetStage: newStage,
              semanticScore: item.semantic_score || 0,
              storagePressure: itemStoragePressure,
              reason,
              severity,
              alertType,
              simulatedYear: newYear,
            });
          }

          // Update item
          await supabase
            .from('archive_items')
            .update({
              stage: newStage,
              current_size_kb: newSize,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          // Log degradation
          await supabase
            .from('degradation_logs')
            .insert({
              owner_id: user.id,
              decay_event_id: decayEvent?.id,
              item_id: item.id,
              item_title: item.title,
              prev_stage: prevStage,
              new_stage: newStage,
              reason,
              semantic_score: item.semantic_score,
              storage_pressure: itemStoragePressure,
              reconstructability_score: reconstructability,
              size_before_kb: item.current_size_kb,
              size_after_kb: newSize,
            });

          currentStorage -= (item.current_size_kb - newSize);
          itemsAffected++;
        }
      }
    }

    // Update decay event with final storage
    if (decayEvent) {
      await supabase
        .from('decay_events')
        .update({
          storage_after_kb: currentStorage,
          items_affected: itemsAffected,
        })
        .eq('id', decayEvent.id);
    }

    // Update simulation settings
    await supabase
      .from('simulation_settings')
      .update({
        current_year: newYear,
        current_capacity_kb: capacityAfter,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    setSettings(prev => prev ? {
      ...prev,
      current_year: newYear,
      current_capacity_kb: capacityAfter,
    } : null);

    toast.info(`Year ${newYear}: Decay event #${eventNo}. ${itemsAffected} items affected.`);
  }, [settings, user, addAlert]);

  const startSimulation = useCallback(() => {
    if (!settings) return;
    setIsRunning(true);
    supabase
      .from('simulation_settings')
      .update({ is_running: true })
      .eq('id', settings.id);
  }, [settings]);

  const pauseSimulation = useCallback(() => {
    if (!settings) return;
    setIsRunning(false);
    supabase
      .from('simulation_settings')
      .update({ is_running: false })
      .eq('id', settings.id);
  }, [settings]);

  const stepNextDecay = useCallback(async () => {
    await processDecayEvent();
  }, [processDecayEvent]);

  const resetSimulation = useCallback(async () => {
    if (!settings || !user) return;

    // Reset settings
    await supabase
      .from('simulation_settings')
      .update({
        current_year: 0,
        current_capacity_kb: settings.start_capacity_kb,
        is_running: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    // Reset all items to FULL stage with original sizes
    const { data: items } = await supabase
      .from('archive_items')
      .select('id, size_kb')
      .eq('owner_id', user.id);

    if (items) {
      for (const item of items) {
        await supabase
          .from('archive_items')
          .update({
            stage: 'FULL',
            current_size_kb: item.size_kb,
            compressed_content: null,
            summary: null,
            minimal_json: null,
          })
          .eq('id', item.id);
      }
    }

    // Clear decay events and logs
    await supabase.from('decay_events').delete().eq('owner_id', user.id);
    await supabase.from('degradation_logs').delete().eq('owner_id', user.id);
    await supabase.from('baseline_results').delete().eq('owner_id', user.id);

    setSettings(prev => prev ? {
      ...prev,
      current_year: 0,
      current_capacity_kb: settings.start_capacity_kb,
      is_running: false,
    } : null);
    setIsRunning(false);

    toast.success('Simulation reset to year 0');
  }, [settings, user]);

  // Auto-run simulation
  useEffect(() => {
    if (isRunning && settings) {
      intervalRef.current = setInterval(() => {
        processDecayEvent();
      }, settings.time_scale_ms * settings.decay_interval_years);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRunning, settings, processDecayEvent]);

  return (
    <SimulationContext.Provider
      value={{
        settings,
        loading,
        isRunning,
        currentYear,
        capacityPercent,
        nextDecayIn,
        totalDecayEvents,
        currentDecayEvent,
        startSimulation,
        pauseSimulation,
        stepNextDecay,
        resetSimulation,
        initializeSimulation,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
