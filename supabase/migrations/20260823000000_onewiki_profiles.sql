-- One Wiki satellite profile projection (OWeb constellation)
create table if not exists public.onewiki_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  one_id text,
  workspace_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onewiki_profiles_workspace_id_idx
  on public.onewiki_profiles (workspace_id);

alter table public.onewiki_profiles enable row level security;

create policy "onewiki_profiles_select_own"
  on public.onewiki_profiles
  for select
  using (auth.uid() = user_id);

create policy "onewiki_profiles_insert_own"
  on public.onewiki_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "onewiki_profiles_update_own"
  on public.onewiki_profiles
  for update
  using (auth.uid() = user_id);
