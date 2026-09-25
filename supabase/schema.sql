create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  agent text not null check (agent in ('kim','jarvis','nara','maya','raka','charles','vans')),
  title text not null,
  prompt text not null,
  authority_level smallint not null default 1 check (authority_level between 0 and 4),
  status text not null default 'pending' check (status in ('pending','running','waiting_approval','completed','failed','cancelled')),
  source text not null default 'api',
  result text,
  error text,
  model_used text,
  usage_json jsonb,
  approved_by text,
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id bigint generated always as identity primary key,
  task_id uuid references public.tasks(id) on delete set null,
  agent text not null,
  status text not null,
  model_used text,
  usage_json jsonb,
  latency_ms integer,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists tasks_status_created_idx on public.tasks(status, created_at);
create index if not exists agent_runs_task_idx on public.agent_runs(task_id);

alter table public.tasks enable row level security;
alter table public.agent_runs enable row level security;

revoke all on public.tasks from anon, authenticated;
revoke all on public.agent_runs from anon, authenticated;
grant select, insert, update, delete on public.tasks to service_role;
grant select, insert, update, delete on public.agent_runs to service_role;
grant usage, select on all sequences in schema public to service_role;
