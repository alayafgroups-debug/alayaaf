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

alter table public.work_tasks
  add column if not exists task_date date,
  add column if not exists estimated_hours numeric(8,2) not null default 0,
  add column if not exists progress integer not null default 0,
  add column if not exists requires_approval boolean not null default false,
  add column if not exists approval_status text not null default 'غير مطلوب',
  add column if not exists rating integer;

alter table public.work_tasks drop constraint if exists work_tasks_status_check;
alter table public.work_tasks add constraint work_tasks_status_check
  check (status in ('جديدة', 'انتظار العمل', 'قيد التنفيذ', 'بانتظار الموافقة', 'مكتملة', 'متوقفة', 'متأخرة')) not valid;

create table if not exists public.work_task_collaborators (
  task_id uuid not null references public.work_tasks(id) on delete cascade,
  emp_id text not null,
  emp_name text not null default '',
  accepted boolean,
  created_at timestamptz not null default now(),
  primary key (task_id, emp_id)
);

create table if not exists public.work_task_statuses (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  color text not null default '#0ea5e9',
  sort_order integer not null default 0,
  active boolean not null default true
);

insert into public.work_task_statuses (title, color, sort_order) values
  ('انتظار الموافقة', '#eab308', 1),
  ('انتظار العمل', '#f59e0b', 2),
  ('قيد التنفيذ', '#0284c7', 3),
  ('مكتملة', '#10b981', 4),
  ('متأخرة', '#ef4444', 5),
  ('متوقفة', '#be123c', 6)
on conflict (title) do nothing;

create table if not exists public.work_project_member_types (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.work_notification_settings (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  event_title text not null,
  notify_assignee boolean not null default true,
  notify_project_members boolean not null default false,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.work_notification_settings (event_code, event_title) values
  ('task_created', 'تم إضافة مهمة جديدة'),
  ('task_updated', 'تم التعديل على المهمة'),
  ('project_created', 'تم إضافة مشروع جديد'),
  ('task_completed', 'تم إنجاز المهمة'),
  ('task_overdue', 'تأخرت المهمة عن موعدها')
on conflict (event_code) do nothing;

create table if not exists public.support_response_times (
  id uuid primary key default gen_random_uuid(),
  priority text not null unique,
  max_response_hours numeric(8,2) not null,
  updated_at timestamptz not null default now()
);

insert into public.support_response_times (priority, max_response_hours) values
  ('عاجلة', 3), ('عالية', 6), ('متوسطة', 12), ('منخفضة', 24)
on conflict (priority) do nothing;

create table if not exists public.support_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text not null,
  company_login text not null,
  support_id text not null unique,
  email text not null,
  phone text not null default '',
  support_employee_id text,
  support_employee_name text not null default '',
  status text not null default 'فعال',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no bigint generated by default as identity,
  subject text not null,
  client_id uuid references public.support_clients(id) on delete set null,
  client_name text not null default '',
  project_id uuid references public.work_projects(id) on delete set null,
  assigned_emp_id text,
  assigned_emp_name text not null default '',
  ticket_type text not null default 'استفسار',
  priority text not null default 'متوسطة',
  description text not null default '',
  status text not null default 'مفتوحة',
  rating integer,
  rating_comment text not null default '',
  opened_at timestamptz not null default now(),
  in_progress_at timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint support_tickets_status_check check (status in ('مفتوحة', 'قيد المعالجة', 'مكتملة', 'مغلقة', 'متأخرة')),
  constraint support_tickets_priority_check check (priority in ('منخفضة', 'متوسطة', 'عالية', 'عاجلة')),
  constraint support_tickets_rating_check check (rating is null or rating between 1 and 5)
);

create table if not exists public.support_ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  content text not null,
  sender_name text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_client_idx on public.support_tickets(client_id);
create index if not exists support_ticket_replies_ticket_idx on public.support_ticket_replies(ticket_id);

alter table public.work_task_collaborators enable row level security;
alter table public.work_task_statuses enable row level security;
alter table public.work_project_member_types enable row level security;
alter table public.work_notification_settings enable row level security;
alter table public.support_response_times enable row level security;
alter table public.support_clients enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_replies enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'work_task_collaborators', 'work_task_statuses', 'work_project_member_types',
    'work_notification_settings', 'support_response_times', 'support_clients',
    'support_tickets', 'support_ticket_replies'
  ] loop
    execute format('drop policy if exists %I_authenticated_access on public.%I', table_name, table_name);
    execute format('create policy %I_authenticated_access on public.%I for all to authenticated using (true) with check (true)', table_name, table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end
$$;
