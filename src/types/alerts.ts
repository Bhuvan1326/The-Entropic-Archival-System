export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'storage_pressure' | 'high_value_risk' | 'decay_approaching' | 'item_degraded' | 'item_deleted';

export interface DecayAlert {
  id: string;
  itemId?: string;
  itemTitle?: string;
  currentStage?: string;
  targetStage?: string;
  semanticScore?: number;
  storagePressure?: number;
  reason: string;
  severity: AlertSeverity;
  alertType: AlertType;
  simulatedYear: number;
  timestamp: Date;
  dismissed: boolean;
}

export interface PersistentAlert {
  id: string;
  owner_id: string;
  alert_type: AlertType;
  item_id?: string;
  item_title?: string;
  semantic_score?: number;
  current_stage?: string;
  target_stage?: string;
  storage_pressure?: number;
  reason: string;
  simulated_year: number;
  decay_event_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface TimelineSnapshot {
  year: number;
  capacityKb: number;
  capacityPercent: number;
  storageUsedKb: number;
  stageCounts: {
    FULL: number;
    COMPRESSED: number;
    SUMMARIZED: number;
    MINIMAL: number;
    DELETED: number;
  };
  avgSemanticScore: number;
  decayEventNo: number | null;
  itemsAffected: number;
}

export interface ItemHistoryEntry {
  id: string;
  decay_event_id: string;
  simulated_year: number;
  prev_stage: string;
  new_stage: string;
  reason: string;
  semantic_score: number | null;
  storage_pressure: number | null;
  size_before_kb: number | null;
  size_after_kb: number | null;
  created_at: string;
}
