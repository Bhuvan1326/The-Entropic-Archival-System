-- Enable UUID + vector extension
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- 1) Profiles table for user data
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles RLS policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) Valuation Weights (configurable from UI)
create table if not exists public.valuation_weights (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  weight_relevance numeric(5,2) default 0.40 not null,
  weight_uniqueness numeric(5,2) default 0.35 not null,
  weight_reconstructability numeric(5,2) default 0.25 not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.valuation_weights enable row level security;

create policy "Users can view their own weights"
  on public.valuation_weights for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own weights"
  on public.valuation_weights for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own weights"
  on public.valuation_weights for update
  using (auth.uid() = owner_id);

-- 3) Simulation Settings
create table if not exists public.simulation_settings (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  start_capacity_kb bigint not null default 1000000,
  current_capacity_kb bigint not null default 1000000,
  current_year integer not null default 0,
  total_years integer not null default 60,
  decay_percent numeric(5,2) not null default 5.00,
  decay_interval_years integer not null default 2,
  is_running boolean default false,
  time_scale_ms integer default 1000,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.simulation_settings enable row level security;

create policy "Users can view their own simulation"
  on public.simulation_settings for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own simulation"
  on public.simulation_settings for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own simulation"
  on public.simulation_settings for update
  using (auth.uid() = owner_id);

create policy "Users can delete their own simulation"
  on public.simulation_settings for delete
  using (auth.uid() = owner_id);

-- 4) Archive Items
create table if not exists public.archive_items (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text,
  item_type text not null check (item_type in ('article','research','document','image','video')),
  source_url text,
  tags text[] default '{}',
  original_date timestamptz,
  ingested_at timestamptz default now(),
  size_kb integer not null,
  current_size_kb integer not null,
  stage text not null default 'FULL' check (stage in ('FULL','COMPRESSED','SUMMARIZED','MINIMAL','DELETED')),
  compressed_content text,
  summary text,
  minimal_json jsonb,
  val_relevance numeric(5,2) default 50.00,
  val_uniqueness numeric(5,2) default 50.00,
  val_reconstructability numeric(5,2) default 50.00,
  semantic_score numeric(6,2) default 50.00,
  embedding vector(384),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.archive_items enable row level security;

create policy "Users can view their own items"
  on public.archive_items for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own items"
  on public.archive_items for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own items"
  on public.archive_items for update
  using (auth.uid() = owner_id);

create policy "Users can delete their own items"
  on public.archive_items for delete
  using (auth.uid() = owner_id);

-- Indexes for archive_items
create index if not exists idx_archive_owner on public.archive_items(owner_id);
create index if not exists idx_archive_stage on public.archive_items(stage);
create index if not exists idx_archive_type on public.archive_items(item_type);
create index if not exists idx_archive_score on public.archive_items(semantic_score desc);

-- 5) Decay Events
create table if not exists public.decay_events (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  event_no integer not null,
  simulated_year integer not null,
  capacity_before_kb bigint not null,
  capacity_after_kb bigint not null,
  storage_before_kb bigint not null,
  storage_after_kb bigint not null,
  items_affected integer default 0,
  created_at timestamptz default now()
);

alter table public.decay_events enable row level security;

create policy "Users can view their own decay events"
  on public.decay_events for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own decay events"
  on public.decay_events for insert
  with check (auth.uid() = owner_id);

create index if not exists idx_decay_owner on public.decay_events(owner_id);
create index if not exists idx_decay_year on public.decay_events(simulated_year);

-- 6) Degradation Logs
create table if not exists public.degradation_logs (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  decay_event_id uuid references public.decay_events(id) on delete cascade,
  item_id uuid references public.archive_items(id) on delete cascade,
  item_title text,
  prev_stage text not null,
  new_stage text not null,
  reason text not null,
  semantic_score numeric(6,2),
  storage_pressure numeric(6,2),
  redundancy_score numeric(6,2),
  reconstructability_score numeric(6,2),
  size_before_kb integer,
  size_after_kb integer,
  created_at timestamptz default now()
);

alter table public.degradation_logs enable row level security;

create policy "Users can view their own degradation logs"
  on public.degradation_logs for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own degradation logs"
  on public.degradation_logs for insert
  with check (auth.uid() = owner_id);

create index if not exists idx_logs_event on public.degradation_logs(decay_event_id);
create index if not exists idx_logs_item on public.degradation_logs(item_id);

-- 7) Query Logs
create table if not exists public.query_logs (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  query text not null,
  response text,
  uncertainty text check (uncertainty in ('HIGH','MEDIUM','LOW')),
  used_degraded_data boolean default false,
  sources_used jsonb default '[]',
  created_at timestamptz default now()
);

alter table public.query_logs enable row level security;

create policy "Users can view their own query logs"
  on public.query_logs for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own query logs"
  on public.query_logs for insert
  with check (auth.uid() = owner_id);

-- 8) Baseline Comparison Results
create table if not exists public.baseline_results (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  simulation_year integer not null,
  strategy text not null check (strategy in ('TEAS','TIME_BASED','RANDOM')),
  knowledge_coverage numeric(6,2),
  semantic_diversity numeric(6,2),
  retrieval_quality numeric(6,2),
  reconstruction_quality numeric(6,2),
  storage_efficiency numeric(6,2),
  items_remaining integer,
  total_size_kb bigint,
  created_at timestamptz default now()
);

alter table public.baseline_results enable row level security;

create policy "Users can view their own baseline results"
  on public.baseline_results for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own baseline results"
  on public.baseline_results for insert
  with check (auth.uid() = owner_id);

create policy "Users can delete their own baseline results"
  on public.baseline_results for delete
  using (auth.uid() = owner_id);

create index if not exists idx_baseline_owner on public.baseline_results(owner_id);
create index if not exists idx_baseline_strategy on public.baseline_results(strategy);