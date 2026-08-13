create table if not exists public.app_contact_settings (
  id text primary key default 'main',
  phone text not null default '',
  email text not null default '',
  whatsapp text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.app_contact_settings (id)
values ('main')
on conflict (id) do nothing;

create table if not exists public.user_preferences (
  emp_id text primary key,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.work_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  status text not null default 'جديد',
  start_date date,
  due_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_projects_status_check check (status in ('جديد', 'قيد التنفيذ', 'مكتمل', 'متوقف')),
  constraint work_projects_dates_check check (due_date is null or start_date is null or due_date >= start_date)
);

create table if not exists public.work_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.work_projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  assignee_emp_id text,
  assignee_name text not null default '',
  status text not null default 'جديدة',
  priority text not null default 'متوسطة',
  due_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_tasks_status_check check (status in ('جديدة', 'قيد التنفيذ', 'مكتملة', 'متوقفة')),
  constraint work_tasks_priority_check check (priority in ('منخفضة', 'متوسطة', 'عالية', 'عاجلة'))
);

create index if not exists work_tasks_project_idx on public.work_tasks(project_id);
create index if not exists work_tasks_assignee_idx on public.work_tasks(assignee_emp_id);
create index if not exists work_tasks_due_date_idx on public.work_tasks(due_date);

alter table public.app_contact_settings enable row level security;
alter table public.user_preferences enable row level security;
alter table public.work_projects enable row level security;
alter table public.work_tasks enable row level security;

drop policy if exists app_contact_settings_authenticated_read on public.app_contact_settings;
create policy app_contact_settings_authenticated_read on public.app_contact_settings
for select to authenticated using (true);

drop policy if exists user_preferences_own_access on public.user_preferences;
create policy user_preferences_own_access on public.user_preferences
for all to authenticated
using (
  exists (
    select 1 from public.employees
    where employees.emp_id = user_preferences.emp_id
      and lower(employees.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  exists (
    select 1 from public.employees
    where employees.emp_id = user_preferences.emp_id
      and lower(employees.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists work_projects_authenticated_access on public.work_projects;
create policy work_projects_authenticated_access on public.work_projects
for all to authenticated using (true) with check (true);

drop policy if exists work_tasks_authenticated_access on public.work_tasks;
create policy work_tasks_authenticated_access on public.work_tasks
for all to authenticated using (true) with check (true);

create or replace function public.set_app_contact_settings(
  p_phone text,
  p_email text,
  p_whatsapp text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.employees
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and employee_role in ('مدير النظام', 'مدير عام', 'المدير العام')
  ) then
    raise exception 'ليس لديك صلاحية تعديل بيانات الاتصال';
  end if;

  insert into public.app_contact_settings (id, phone, email, whatsapp, updated_at)
  values ('main', trim(coalesce(p_phone, '')), trim(coalesce(p_email, '')), trim(coalesce(p_whatsapp, '')), now())
  on conflict (id) do update set
    phone = excluded.phone,
    email = excluded.email,
    whatsapp = excluded.whatsapp,
    updated_at = excluded.updated_at;
end;
$$;

revoke execute on function public.set_app_contact_settings(text, text, text) from public, anon;
grant execute on function public.set_app_contact_settings(text, text, text) to authenticated;

grant select on public.app_contact_settings to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select, insert, update, delete on public.work_projects to authenticated;
grant select, insert, update, delete on public.work_tasks to authenticated;
