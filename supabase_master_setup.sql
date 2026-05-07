-- ============================================================
-- QUORUM — MASTER SETUP SCRIPT (run once on a fresh project)
-- Paste this entire file into Supabase SQL Editor and run.
-- ============================================================

-- ─── 1. TABLES ────────────────────────────────────────────────────────────────

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  status      text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now()
);

create table public.project_members (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  role       text not null default 'MEMBER' check (role in ('ADMIN','MEMBER')),
  joined_at  timestamptz default now(),
  primary key (user_id, project_id)
);

create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text default '',
  status         text not null default 'BACKLOG' check (status in ('BACKLOG','ACTIVE','IN_REVIEW','SHIPPED')),
  priority       text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','URGENT')),
  project_id     uuid not null references public.projects(id) on delete cascade,
  assignee_id    uuid references public.profiles(id) on delete set null,
  created_by_id  uuid not null references public.profiles(id),
  due_date       timestamptz,
  position       bigint default 0,
  blocked_by_id  uuid references public.tasks(id) on delete set null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz default now()
);

create table public.activity (
  id               uuid primary key default gen_random_uuid(),
  action           text not null,
  entity_type      text not null check (entity_type in ('TASK','PROJECT','MEMBER')),
  entity_id        text not null,
  project_id       uuid not null references public.projects(id) on delete cascade,
  performed_by_id  uuid not null references public.profiles(id),
  created_at       timestamptz default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  message    text not null,
  read       boolean default false,
  task_id    uuid references public.tasks(id) on delete cascade,
  created_at timestamptz default now()
);

-- ─── 2. ENABLE RLS ────────────────────────────────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks         enable row level security;
alter table public.comments      enable row level security;
alter table public.activity      enable row level security;
alter table public.notifications enable row level security;

-- ─── 3. SECURITY DEFINER HELPERS (no recursion) ───────────────────────────────

create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_project_admin(p_project_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid() and role = 'ADMIN'
  );
$$;

-- ─── 4. RLS POLICIES ──────────────────────────────────────────────────────────

-- profiles
create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: read any"   on public.profiles for select using (auth.uid() is not null);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);

-- project_members (non-recursive: own row + peers via security definer)
create policy "members: read own"
  on public.project_members for select using (user_id = auth.uid());
create policy "members: read peers"
  on public.project_members for select using (public.is_project_member(project_id));
create policy "members: insert self"
  on public.project_members for insert with check (user_id = auth.uid());
create policy "members: insert admin"
  on public.project_members for insert with check (public.is_project_admin(project_id));
create policy "members: update admin"
  on public.project_members for update using (public.is_project_admin(project_id));
create policy "members: delete admin"
  on public.project_members for delete using (public.is_project_admin(project_id));

-- projects
create policy "projects: read"   on public.projects for select using (public.is_project_member(id));
create policy "projects: insert" on public.projects for insert with check (auth.uid() = owner_id);
create policy "projects: update" on public.projects for update using (public.is_project_admin(id));

-- tasks
create policy "tasks: read"   on public.tasks for select using (public.is_project_member(project_id));
create policy "tasks: insert" on public.tasks for insert with check (public.is_project_member(project_id));
create policy "tasks: update" on public.tasks for update using (public.is_project_member(project_id));
create policy "tasks: delete" on public.tasks for delete using (public.is_project_admin(project_id));

-- comments
create policy "comments: read"   on public.comments for select using (
  exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id))
);
create policy "comments: insert" on public.comments for insert with check (
  exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id))
);

-- activity
create policy "activity: read"   on public.activity for select using (public.is_project_member(project_id));
create policy "activity: insert" on public.activity for insert with check (public.is_project_member(project_id));

-- notifications
create policy "notifications: read"   on public.notifications for select using (auth.uid() = user_id);
create policy "notifications: insert" on public.notifications for insert with check (true);
create policy "notifications: update" on public.notifications for update using (auth.uid() = user_id);

-- ─── 5. RPC: create_project (atomic, bypasses RLS) ───────────────────────────

create or replace function public.create_project(
  p_name        text,
  p_description text default ''
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user_id    uuid;
  v_project_id uuid;
  v_project    record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  insert into public.projects (name, description, status, owner_id)
  values (p_name, p_description, 'ACTIVE', v_user_id)
  returning id, name, description, status, owner_id, created_at into v_project;

  v_project_id := v_project.id;

  insert into public.project_members (user_id, project_id, role)
  values (v_user_id, v_project_id, 'ADMIN');

  return json_build_object(
    'id',          v_project.id,
    'name',        v_project.name,
    'description', v_project.description,
    'status',      v_project.status,
    'owner_id',    v_project.owner_id,
    'created_at',  v_project.created_at
  );
end;
$$;

-- ─── 6. REALTIME ──────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.activity;
alter publication supabase_realtime add table public.project_members;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.notifications;

-- ─── 7. AUTO-PROFILE ON SIGNUP (trigger) ──────────────────────────────────────
-- This auto-creates the profile row when a user signs up via Supabase Auth.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Done! Verify:
select tablename, count(*) as policies
from pg_policies where schemaname = 'public'
group by tablename order by tablename;
