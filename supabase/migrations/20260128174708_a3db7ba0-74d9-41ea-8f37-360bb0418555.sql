-- 1) Create alerts table for persistent notifications
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('storage_pressure', 'high_value_risk', 'decay_approaching', 'item_degraded', 'item_deleted')),
  item_id uuid REFERENCES public.archive_items(id) ON DELETE SET NULL,
  item_title text,
  semantic_score numeric(6,2),
  current_stage text,
  target_stage text,
  storage_pressure numeric(6,2),
  reason text NOT NULL,
  simulated_year integer NOT NULL,
  decay_event_id uuid REFERENCES public.decay_events(id) ON DELETE SET NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for alerts
CREATE POLICY "Users can view their own alerts"
  ON public.alerts FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own alerts"
  ON public.alerts FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own alerts"
  ON public.alerts FOR DELETE
  USING (auth.uid() = owner_id);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_owner ON public.alerts(owner_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON public.alerts(owner_id, is_read) WHERE is_read = false;

-- 2) Add embedding index for vector search (pgvector already enabled)
CREATE INDEX IF NOT EXISTS idx_archive_embedding ON public.archive_items 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3) Create function for semantic similarity search
CREATE OR REPLACE FUNCTION public.search_archive_items(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  p_owner_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  summary text,
  stage text,
  semantic_score numeric,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai.id,
    ai.title,
    ai.content,
    ai.summary,
    ai.stage,
    ai.semantic_score,
    1 - (ai.embedding <=> query_embedding) as similarity
  FROM archive_items ai
  WHERE ai.owner_id = p_owner_id
    AND ai.stage != 'DELETED'
    AND ai.embedding IS NOT NULL
    AND 1 - (ai.embedding <=> query_embedding) > match_threshold
  ORDER BY ai.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;