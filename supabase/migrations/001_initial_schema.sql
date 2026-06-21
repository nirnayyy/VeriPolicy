-- VeriPolicy initial schema: profiles, dashboard tables, RLS

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  organization text,
  role text,
  handle text,
  clearance text not null default 'Level I · Internal',
  station text,
  briefs_count integer not null default 0,
  citations_count integer not null default 0,
  forecast_accuracy numeric(4, 2) not null default 0.00,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_handle_key on public.profiles (handle)
  where handle is not null;

-- ---------------------------------------------------------------------------
-- Dashboard: foresight briefs / drafts
-- ---------------------------------------------------------------------------
create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ref_id text not null,
  title text not null,
  status text not null default 'Draft'
    check (status in ('Draft', 'In Review', 'Published', 'Archived')),
  tag text,
  pages integer not null default 0,
  accent_color text default 'var(--primary)',
  content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists briefs_user_id_idx on public.briefs (user_id);
create index if not exists briefs_updated_at_idx on public.briefs (updated_at desc);

-- ---------------------------------------------------------------------------
-- Dashboard: scenario simulator runs
-- ---------------------------------------------------------------------------
create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input_text text not null,
  memo_content jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists scenarios_user_id_idx on public.scenarios (user_id);

-- ---------------------------------------------------------------------------
-- Dashboard: analyst activity log
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_user_id_idx on public.activity_log (user_id);
create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Dashboard: saved policy tracker items
-- ---------------------------------------------------------------------------
create table if not exists public.saved_tracker_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  headline text not null,
  source text,
  category text,
  brief jsonb,
  saved_at timestamptz not null default now()
);

create index if not exists saved_tracker_items_user_id_idx on public.saved_tracker_items (user_id);

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, organization, role, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'organization',
    new.raw_user_meta_data ->> 'role',
    split_part(coalesce(new.email, ''), '@', 1)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists briefs_set_updated_at on public.briefs;
create trigger briefs_set_updated_at
  before update on public.briefs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.briefs enable row level security;
alter table public.scenarios enable row level security;
alter table public.activity_log enable row level security;
alter table public.saved_tracker_items enable row level security;

-- Profiles: users can read/update their own row
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Briefs
drop policy if exists "Briefs are viewable by owner" on public.briefs;
create policy "Briefs are viewable by owner"
  on public.briefs for select
  using (auth.uid() = user_id);

drop policy if exists "Briefs are insertable by owner" on public.briefs;
create policy "Briefs are insertable by owner"
  on public.briefs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Briefs are updatable by owner" on public.briefs;
create policy "Briefs are updatable by owner"
  on public.briefs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Briefs are deletable by owner" on public.briefs;
create policy "Briefs are deletable by owner"
  on public.briefs for delete
  using (auth.uid() = user_id);

-- Scenarios
drop policy if exists "Scenarios are viewable by owner" on public.scenarios;
create policy "Scenarios are viewable by owner"
  on public.scenarios for select
  using (auth.uid() = user_id);

drop policy if exists "Scenarios are insertable by owner" on public.scenarios;
create policy "Scenarios are insertable by owner"
  on public.scenarios for insert
  with check (auth.uid() = user_id);

drop policy if exists "Scenarios are updatable by owner" on public.scenarios;
create policy "Scenarios are updatable by owner"
  on public.scenarios for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Scenarios are deletable by owner" on public.scenarios;
create policy "Scenarios are deletable by owner"
  on public.scenarios for delete
  using (auth.uid() = user_id);

-- Activity log
drop policy if exists "Activity is viewable by owner" on public.activity_log;
create policy "Activity is viewable by owner"
  on public.activity_log for select
  using (auth.uid() = user_id);

drop policy if exists "Activity is insertable by owner" on public.activity_log;
create policy "Activity is insertable by owner"
  on public.activity_log for insert
  with check (auth.uid() = user_id);

-- Saved tracker items
drop policy if exists "Saved items are viewable by owner" on public.saved_tracker_items;
create policy "Saved items are viewable by owner"
  on public.saved_tracker_items for select
  using (auth.uid() = user_id);

drop policy if exists "Saved items are insertable by owner" on public.saved_tracker_items;
create policy "Saved items are insertable by owner"
  on public.saved_tracker_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Saved items are deletable by owner" on public.saved_tracker_items;
create policy "Saved items are deletable by owner"
  on public.saved_tracker_items for delete
  using (auth.uid() = user_id);
