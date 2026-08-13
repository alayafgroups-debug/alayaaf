create table if not exists public.employee_emails (
  id uuid primary key default gen_random_uuid(),
  emp_id text not null,
  emp_name text not null,
  generated_email text not null unique,
  status varchar(20) not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employee_emails
  add column if not exists employee_id text,
  add column if not exists auth_user_id uuid,
  add column if not exists generated_first_name text,
  add column if not exists password_ciphertext text;

update public.employee_emails email_record
set employee_id = employee.id
from public.employees employee
where email_record.employee_id is null
  and employee.emp_id = email_record.emp_id;

alter table public.employee_emails
  drop constraint if exists employee_emails_employee_id_fkey,
  add constraint employee_emails_employee_id_fkey
    foreign key (employee_id) references public.employees(id) on delete cascade,
  drop constraint if exists employee_emails_auth_user_id_fkey,
  add constraint employee_emails_auth_user_id_fkey
    foreign key (auth_user_id) references auth.users(id) on delete set null;

with ranked_credentials as (
  select id,
    row_number() over (
      partition by employee_id
      order by (status = 'active') desc, created_at desc, id desc
    ) as row_number
  from public.employee_emails
  where employee_id is not null
)
update public.employee_emails email_record
set employee_id = null,
    auth_user_id = null,
    status = 'archived',
    updated_at = now()
from ranked_credentials ranked
where email_record.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists employee_emails_employee_id_uidx
  on public.employee_emails(employee_id)
  where employee_id is not null;

create unique index if not exists employee_emails_auth_user_id_uidx
  on public.employee_emails(auth_user_id)
  where auth_user_id is not null;

create index if not exists employee_emails_emp_id_idx
  on public.employee_emails(emp_id);

alter table public.employee_emails enable row level security;

revoke all on public.employee_emails from anon, authenticated;

drop policy if exists employee_emails_select on public.employee_emails;
drop policy if exists employee_emails_insert on public.employee_emails;
drop policy if exists employee_emails_update on public.employee_emails;
drop policy if exists employee_emails_delete on public.employee_emails;

create policy employee_email_owner_select
on public.employee_emails
for select
to authenticated
using (auth_user_id = auth.uid());

grant select (id, employee_id, auth_user_id, emp_id, emp_name, generated_email, status, created_at, updated_at)
on public.employee_emails to authenticated;

insert into public.hr_config_items (config_type, name_ar, value, status)
select 'primary_email_domain', 'الإيميل الرئيسي', 'hr@alayaf.com', 'فعال'
where not exists (
  select 1 from public.hr_config_items where config_type = 'primary_email_domain'
);

update public.hr_config_items
set value = 'hr@alayaf.com'
where config_type = 'primary_email_domain'
  and value in ('alayaf.com', 'hr.alayaf.com');
