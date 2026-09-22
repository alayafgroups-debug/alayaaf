create table if not exists public.system_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role_id text not null references public.user_roles(id) on delete restrict,
  branch_id text references public.branches(id) on delete set null,
  status text not null default 'فعال' check (status in ('فعال', 'غير فعال')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.system_users enable row level security;

alter table public.sales_invoices add column if not exists created_by uuid references auth.users(id), add column if not exists issued_by uuid references auth.users(id), add column if not exists branch_id text references public.branches(id);
alter table public.purchase_invoices add column if not exists created_by uuid references auth.users(id), add column if not exists issued_by uuid references auth.users(id), add column if not exists branch_id text references public.branches(id);
alter table public.customers add column if not exists created_by uuid references auth.users(id), add column if not exists branch_id text references public.branches(id);
alter table public.vendors add column if not exists created_by uuid references auth.users(id), add column if not exists branch_id text references public.branches(id);
alter table public.sales_invoices alter column created_by set default auth.uid(), alter column issued_by set default auth.uid();
alter table public.purchase_invoices alter column created_by set default auth.uid(), alter column issued_by set default auth.uid();
alter table public.customers alter column created_by set default auth.uid();
alter table public.vendors alter column created_by set default auth.uid();

create or replace function public.business_permission_allowed(p_permissions text[], p_manage boolean default false)
returns boolean language sql stable security definer set search_path='public' as $$
  select auth.role()='service_role' or exists (
    select 1 from (
      select true is_employee, e.employee_role role_name, r.permissions
      from public.employees e
      left join public.employee_emails ee on ee.employee_id=e.id and ee.status='active'
      left join public.user_roles r on r.name_ar=e.employee_role and r.status='فعال'
      where ee.auth_user_id=auth.uid() or lower(e.email)=lower(coalesce(auth.jwt()->>'email',''))
      union all
      select false, r.name_ar, r.permissions from public.system_users su
      join public.user_roles r on r.id=su.role_id and r.status='فعال'
      where su.auth_user_id=auth.uid() and su.status='فعال'
    ) account
    where (account.is_employee and account.role_name in ('مدير النظام','مدير عام','المدير العام'))
       or exists (select 1 from unnest(p_permissions) permission_key where case when p_manage then coalesce(account.permissions->>permission_key,'') in ('true','manage') else coalesce(account.permissions->>permission_key,'') in ('true','read','manage') end)
  );
$$;

create or replace function public.current_business_branch_id() returns text language sql stable security definer set search_path='public' as $$
  select coalesce(
    (select branch_id from public.system_users where auth_user_id=auth.uid() and status='فعال' limit 1),
    (select e.branch_id from public.employees e left join public.employee_emails ee on ee.employee_id=e.id and ee.status='active' where ee.auth_user_id=auth.uid() or lower(e.email)=lower(coalesce(auth.jwt()->>'email','')) limit 1)
  );
$$;
create or replace function public.is_main_system_admin() returns boolean language sql stable security definer set search_path='public' as $$
  select exists (select 1 from public.employees e left join public.employee_emails ee on ee.employee_id=e.id and ee.status='active' where (ee.auth_user_id=auth.uid() or lower(e.email)=lower(coalesce(auth.jwt()->>'email',''))) and e.employee_role in ('مدير النظام','مدير عام','المدير العام'));
$$;
create or replace function public.business_record_visible(p_created_by uuid,p_branch_id text,p_permission_prefix text) returns boolean language plpgsql stable security definer set search_path='public' as $$
begin
  if auth.role()='service_role' or public.is_main_system_admin() then return true; end if;
  if public.business_permission_allowed(array[p_permission_prefix||'.view_all'],false) then return true; end if;
  if p_created_by=auth.uid() then return true; end if;
  if p_branch_id is not null and p_branch_id=public.current_business_branch_id() and public.business_permission_allowed(array[p_permission_prefix||'.view_branch'],false) then return true; end if;
  return false;
end; $$;
create or replace function public.assign_business_record_owner() returns trigger language plpgsql security definer set search_path='public' as $$
begin
  if new.created_by is null then new.created_by:=auth.uid(); end if;
  if new.branch_id is null then new.branch_id:=public.current_business_branch_id(); end if;
  if tg_table_name in ('sales_invoices','purchase_invoices') and new.issued_by is null then new.issued_by:=auth.uid(); end if;
  return new;
end; $$;

drop trigger if exists sales_invoices_assign_owner on public.sales_invoices;
create trigger sales_invoices_assign_owner before insert on public.sales_invoices for each row execute function public.assign_business_record_owner();
drop trigger if exists purchase_invoices_assign_owner on public.purchase_invoices;
create trigger purchase_invoices_assign_owner before insert on public.purchase_invoices for each row execute function public.assign_business_record_owner();
drop trigger if exists customers_assign_owner on public.customers;
create trigger customers_assign_owner before insert on public.customers for each row execute function public.assign_business_record_owner();
drop trigger if exists vendors_assign_owner on public.vendors;
create trigger vendors_assign_owner before insert on public.vendors for each row execute function public.assign_business_record_owner();

create or replace function public.business_user_labels(p_user_ids uuid[]) returns table(user_id uuid,display_name text,email text) language sql stable security definer set search_path='public' as $$
 select ids.user_id,coalesce(su.full_name,e.name,au.email,'—'),coalesce(su.email,e.email,au.email,'') from unnest(p_user_ids) ids(user_id)
 left join auth.users au on au.id=ids.user_id left join public.system_users su on su.auth_user_id=ids.user_id left join public.employees e on lower(e.email)=lower(au.email)
 where public.is_main_system_admin() or public.business_permission_allowed(array['audit.creator_columns'],false);
$$;
revoke all on function public.business_user_labels(uuid[]) from public,anon;
grant execute on function public.business_user_labels(uuid[]) to authenticated,service_role;

create policy system_users_admin_select on public.system_users for select to authenticated using (public.is_main_system_admin() or public.business_permission_allowed(array['users.special.manage'],true) or auth_user_id=auth.uid());
create policy system_users_admin_update on public.system_users for update to authenticated using (public.is_main_system_admin() or public.business_permission_allowed(array['users.special.manage'],true)) with check (public.is_main_system_admin() or public.business_permission_allowed(array['users.special.manage'],true));

drop policy if exists authenticated_all on public.customers;
drop policy if exists authenticated_all on public.vendors;
create policy customers_scoped_select on public.customers for select to authenticated using (public.business_permission_allowed(array['crm.customers','crm.customers.view','module.crm'],false) and public.business_record_visible(created_by,branch_id,'crm.customers'));
create policy customers_manage_insert on public.customers for insert to authenticated with check (public.business_permission_allowed(array['crm.customers','crm.customers.add'],true) and created_by=auth.uid());
create policy customers_manage_update on public.customers for update to authenticated using (public.business_permission_allowed(array['crm.customers','crm.customers.edit'],true) and public.business_record_visible(created_by,branch_id,'crm.customers')) with check (public.business_permission_allowed(array['crm.customers','crm.customers.edit'],true));
create policy customers_manage_delete on public.customers for delete to authenticated using (public.business_permission_allowed(array['crm.customers','crm.customers.delete'],true) and public.business_record_visible(created_by,branch_id,'crm.customers'));
create policy vendors_scoped_select on public.vendors for select to authenticated using (public.business_permission_allowed(array['crm.vendors','crm.vendors.view','module.crm'],false) and public.business_record_visible(created_by,branch_id,'crm.vendors'));
create policy vendors_manage_insert on public.vendors for insert to authenticated with check (public.business_permission_allowed(array['crm.vendors','crm.vendors.add'],true) and created_by=auth.uid());
create policy vendors_manage_update on public.vendors for update to authenticated using (public.business_permission_allowed(array['crm.vendors','crm.vendors.edit'],true) and public.business_record_visible(created_by,branch_id,'crm.vendors')) with check (public.business_permission_allowed(array['crm.vendors','crm.vendors.edit'],true));
create policy vendors_manage_delete on public.vendors for delete to authenticated using (public.business_permission_allowed(array['crm.vendors','crm.vendors.delete'],true) and public.business_record_visible(created_by,branch_id,'crm.vendors'));
drop policy if exists sales_invoices_authorized_select on public.sales_invoices;
create policy sales_invoices_authorized_select on public.sales_invoices for select to authenticated using (public.business_permission_allowed(array['sales.invoices','sales.invoices.view','sales.credit_notes','sales.receipts','sales.reports','module.sales'],false) and public.business_record_visible(created_by,branch_id,'sales.invoices'));
drop policy if exists purchase_invoices_authorized_select on public.purchase_invoices;
create policy purchase_invoices_authorized_select on public.purchase_invoices for select to authenticated using (public.business_permission_allowed(array['purchases.invoices','purchases.invoices.view','purchases.debit_notes','purchases.credit_notes','purchases.payments','purchases.reports','module.purchases'],false) and public.business_record_visible(created_by,branch_id,'purchases.invoices'));
grant select on public.system_users to authenticated;
revoke all on table public.system_users from anon;
revoke all on function public.assign_business_record_owner() from public,anon,authenticated;
revoke all on function public.business_record_visible(uuid,text,text) from public,anon;
revoke all on function public.current_business_branch_id() from public,anon;
revoke all on function public.is_main_system_admin() from public,anon;
revoke all on function public.business_permission_allowed(text[],boolean) from public,anon;
grant execute on function public.business_permission_allowed(text[],boolean) to authenticated,service_role;
grant execute on function public.is_main_system_admin() to authenticated,service_role;
grant execute on function public.current_business_branch_id() to authenticated,service_role;
grant execute on function public.business_record_visible(uuid,text,text) to authenticated,service_role;
create index if not exists system_users_role_id_idx on public.system_users(role_id);
create index if not exists system_users_branch_id_idx on public.system_users(branch_id);
create index if not exists system_users_created_by_idx on public.system_users(created_by);
create index if not exists sales_invoices_created_by_idx on public.sales_invoices(created_by);
create index if not exists sales_invoices_issued_by_idx on public.sales_invoices(issued_by);
create index if not exists sales_invoices_branch_id_idx on public.sales_invoices(branch_id);
create index if not exists purchase_invoices_created_by_idx on public.purchase_invoices(created_by);
create index if not exists purchase_invoices_issued_by_idx on public.purchase_invoices(issued_by);
create index if not exists purchase_invoices_branch_id_idx on public.purchase_invoices(branch_id);
create index if not exists customers_created_by_idx on public.customers(created_by);
create index if not exists customers_branch_id_idx on public.customers(branch_id);
create index if not exists vendors_created_by_idx on public.vendors(created_by);
create index if not exists vendors_branch_id_idx on public.vendors(branch_id);
create or replace function public.accounting_access_allowed(p_manage boolean default false)
returns boolean language sql stable security definer set search_path='public' as $$
  select public.business_permission_allowed(array['accounting.tax_reports','accounting.accounts','module.accounting'],p_manage);
$$;
