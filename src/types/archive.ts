export type DegradationStage = 'FULL' | 'COMPRESSED' | 'SUMMARIZED' | 'MINIMAL' | 'DELETED';
export type ItemType = 'article' | 'research' | 'document' | 'image' | 'video';
export type UncertaintyLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type BaselineStrategy = 'TEAS' | 'TIME_BASED' | 'RANDOM';

export interface ArchiveItem {
  id: string;
  owner_id: string;
  title: string;
  content: string | null;
  item_type: ItemType;
  source_url: string | null;
  tags: string[];
  original_date: string | null;
  ingested_at: string;
  size_kb: number;
  current_size_kb: number;
  stage: DegradationStage;
  compressed_content: string | null;
  summary: string | null;
  minimal_json: Record<string, unknown> | null;
  val_relevance: number;
  val_uniqueness: number;
  val_reconstructability: number;
  semantic_score: number;
  created_at: string;
  updated_at: string;
}

export interface SimulationSettings {
  id: string;
  owner_id: string;
  start_capacity_kb: number;
  current_capacity_kb: number;
  current_year: number;
  total_years: number;
  decay_percent: number;
  decay_interval_years: number;
  is_running: boolean;
  time_scale_ms: number;
  created_at: string;
  updated_at: string;
}

export interface DecayEvent {
  id: string;
  owner_id: string;
  event_no: number;
  simulated_year: number;
  capacity_before_kb: number;
  capacity_after_kb: number;
  storage_before_kb: number;
  storage_after_kb: number;
  items_affected: number;
  created_at: string;
}

export interface DegradationLog {
  id: string;
  owner_id: string;
  decay_event_id: string;
  item_id: string;
  item_title: string | null;
  prev_stage: DegradationStage;
  new_stage: DegradationStage;
  reason: string;
  semantic_score: number | null;
  storage_pressure: number | null;
  redundancy_score: number | null;
  reconstructability_score: number | null;
  size_before_kb: number | null;
  size_after_kb: number | null;
  created_at: string;
}

export interface QueryLog {
  id: string;
  owner_id: string;
  query: string;
  response: string | null;
  uncertainty: UncertaintyLevel | null;
  used_degraded_data: boolean;
  sources_used: Record<string, unknown>[];
  created_at: string;
}

export interface ValuationWeights {
  id: string;
  owner_id: string;
  weight_relevance: number;
  weight_uniqueness: number;
  weight_reconstructability: number;
  created_at: string;
  updated_at: string;
}

export interface BaselineResult {
  id: string;
  owner_id: string;
  simulation_year: number;
  strategy: BaselineStrategy;
  knowledge_coverage: number | null;
  semantic_diversity: number | null;
  retrieval_quality: number | null;
  reconstruction_quality: number | null;
  storage_efficiency: number | null;
  items_remaining: number | null;
  total_size_kb: number | null;
  created_at: string;
}

export interface StageCount {
  stage: DegradationStage;
  count: number;
  totalSize: number;
}

export const STAGE_ORDER: DegradationStage[] = ['FULL', 'COMPRESSED', 'SUMMARIZED', 'MINIMAL', 'DELETED'];

export const STAGE_COLORS: Record<DegradationStage, string> = {
  FULL: 'hsl(142, 76%, 48%)',
  COMPRESSED: 'hsl(175, 72%, 46%)',
  SUMMARIZED: 'hsl(38, 92%, 50%)',
  MINIMAL: 'hsl(25, 95%, 53%)',
  DELETED: 'hsl(0, 84%, 60%)',
};

export const STAGE_LABELS: Record<DegradationStage, string> = {
  FULL: 'Full',
  COMPRESSED: 'Compressed',
  SUMMARIZED: 'Summarized',
  MINIMAL: 'Minimal',
  DELETED: 'Deleted',
};
