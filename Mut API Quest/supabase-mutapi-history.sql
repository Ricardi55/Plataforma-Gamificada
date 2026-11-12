-- Tabla final usada por MutAPI Quest en Supabase.
-- Ejecutar en Supabase > SQL Editor.

create table if not exists public.mutapi_history (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  event_type text not null check (event_type in ('attempt', 'session')),
  student_name text,
  level integer,
  level_type text,
  exercise_id text,
  session_id text,
  correct boolean,
  score integer,
  duration_seconds integer,
  remaining_seconds integer,
  used_hint boolean,
  used_hint_type text,
  had_wrong_attempt boolean,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_type, external_id)
);

create index if not exists idx_mutapi_history_student_name
  on public.mutapi_history (student_name);

create index if not exists idx_mutapi_history_event_type
  on public.mutapi_history (event_type);

create index if not exists idx_mutapi_history_level
  on public.mutapi_history (level);

create index if not exists idx_mutapi_history_session_id
  on public.mutapi_history (session_id);

create or replace function public.set_mutapi_history_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_mutapi_history_updated_at on public.mutapi_history;

create trigger trg_mutapi_history_updated_at
before update on public.mutapi_history
for each row
execute function public.set_mutapi_history_updated_at();

alter table public.mutapi_history enable row level security;
