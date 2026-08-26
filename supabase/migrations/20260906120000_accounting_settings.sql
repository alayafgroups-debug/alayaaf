-- Standalone accounting settings and fiscal-period controls.
-- No invoice XML, signature, QR, ZATCA clearance, reporting, or signed document is modified.

create table if not exists public.accounting_fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_from date not null,
  date_to date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_from <= date_to)
);

create index if not exists accounting_fiscal_periods_dates_idx
  on public.accounting_fiscal_periods(date_from, date_to);

create or replace function public.accounting_settings_manage_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'service_role' or exists (
    select 1
    from public.employees employee
    left join public.user_roles role on role.name_ar = employee.employee_role and role.status = 'فعال'
    where lower(employee.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (
        employee.employee_role in ('مدير النظام', 'مدير عام', 'المدير العام')
        or coalesce(role.permissions ->> 'accounting.settings', '') in ('true', 'manage')
        or coalesce(role.permissions ->> 'module.accounting', '') = 'manage'
      )
  );
$$;

alter table public.accounting_fiscal_periods enable row level security;
revoke all on public.accounting_fiscal_periods from public, anon;
revoke insert, update, delete, truncate on public.accounting_fiscal_periods from authenticated;
grant select on public.accounting_fiscal_periods to authenticated;

drop policy if exists accounting_fiscal_periods_authorized_select on public.accounting_fiscal_periods;
create policy accounting_fiscal_periods_authorized_select
on public.accounting_fiscal_periods for select to authenticated
using ((select public.accounting_settings_manage_allowed()));

create or replace function public.save_accounting_posting_defaults(p_defaults jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receivable text := trim(p_defaults->>'receivableAccountCode');
  v_revenue text := trim(p_defaults->>'revenueAccountCode');
  v_output_vat text := trim(p_defaults->>'outputVatAccountCode');
  v_payable text := trim(p_defaults->>'payableAccountCode');
  v_purchase text := trim(p_defaults->>'purchaseAccountCode');
  v_input_vat text := trim(p_defaults->>'inputVatAccountCode');
begin
  if not public.accounting_settings_manage_allowed() then raise exception 'ACCOUNTING_SETTINGS_PERMISSION_REQUIRED'; end if;
  perform public.account_name_for_posting(v_receivable);
  perform public.account_name_for_posting(v_revenue);
  perform public.account_name_for_posting(v_output_vat);
  perform public.account_name_for_posting(v_payable);
  perform public.account_name_for_posting(v_purchase);
  perform public.account_name_for_posting(v_input_vat);
  if v_receivable not like '1%' then raise exception 'RECEIVABLE_ACCOUNT_CLASS_INVALID'; end if;
  if v_revenue not like '4%' then raise exception 'REVENUE_ACCOUNT_CLASS_INVALID'; end if;
  if v_output_vat not like '2%' then raise exception 'OUTPUT_VAT_ACCOUNT_CLASS_INVALID'; end if;
  if v_payable not like '2%' then raise exception 'PAYABLE_ACCOUNT_CLASS_INVALID'; end if;
  if v_purchase not like '5%' then raise exception 'PURCHASE_ACCOUNT_CLASS_INVALID'; end if;
  if v_input_vat not like '2%' then raise exception 'INPUT_VAT_ACCOUNT_CLASS_INVALID'; end if;

  update public.accounting_posting_rules
  set receivable_account_code = v_receivable,
      revenue_account_code = v_revenue,
      output_vat_account_code = v_output_vat,
      payable_account_code = v_payable,
      purchase_account_code = v_purchase,
      input_vat_account_code = v_input_vat,
      updated_at = now()
  where rule_code = 'sales_default' and active;
  if not found then raise exception 'ACCOUNTING_POSTING_RULE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.save_accounting_fiscal_period(
  p_id uuid,
  p_name text,
  p_date_from date,
  p_date_to date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_existing public.accounting_fiscal_periods%rowtype;
begin
  if not public.accounting_settings_manage_allowed() then raise exception 'ACCOUNTING_SETTINGS_PERMISSION_REQUIRED'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'FISCAL_PERIOD_NAME_REQUIRED'; end if;
  if p_date_from is null or p_date_to is null or p_date_from > p_date_to then raise exception 'FISCAL_PERIOD_DATES_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtext('accounting_fiscal_periods'));

  if p_id is not null then
    select * into v_existing from public.accounting_fiscal_periods where id = p_id for update;
    if not found then raise exception 'FISCAL_PERIOD_NOT_FOUND'; end if;
    if v_existing.status = 'closed' then raise exception 'CLOSED_FISCAL_PERIOD_IMMUTABLE'; end if;
  end if;
  if exists (
    select 1 from public.accounting_fiscal_periods period
    where period.id <> v_id and daterange(period.date_from, period.date_to, '[]') && daterange(p_date_from, p_date_to, '[]')
  ) then raise exception 'FISCAL_PERIOD_OVERLAP'; end if;

  insert into public.accounting_fiscal_periods (id, name, date_from, date_to)
  values (v_id, trim(p_name), p_date_from, p_date_to)
  on conflict (id) do update set name = excluded.name, date_from = excluded.date_from,
    date_to = excluded.date_to, updated_at = now();
  return v_id;
end;
$$;

create or replace function public.set_accounting_fiscal_period_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.accounting_fiscal_periods%rowtype;
begin
  if not public.accounting_settings_manage_allowed() then raise exception 'ACCOUNTING_SETTINGS_PERMISSION_REQUIRED'; end if;
  if p_status not in ('open', 'closed') then raise exception 'FISCAL_PERIOD_STATUS_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtext('accounting_fiscal_periods'));
  select * into v_period from public.accounting_fiscal_periods where id = p_id for update;
  if not found then raise exception 'FISCAL_PERIOD_NOT_FOUND'; end if;
  if p_status = 'closed' and exists (
    select 1 from public.accounting_journal_entries
    where status = 'draft' and entry_date between v_period.date_from and v_period.date_to
  ) then raise exception 'FISCAL_PERIOD_HAS_DRAFT_JOURNALS'; end if;

  update public.accounting_fiscal_periods
  set status = p_status,
      closed_at = case when p_status = 'closed' then now() else null end,
      closed_by = case when p_status = 'closed' then auth.uid() else null end,
      updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.delete_accounting_fiscal_period(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.accounting_fiscal_periods%rowtype;
begin
  if not public.accounting_settings_manage_allowed() then raise exception 'ACCOUNTING_SETTINGS_PERMISSION_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtext('accounting_fiscal_periods'));
  select * into v_period from public.accounting_fiscal_periods where id = p_id for update;
  if not found then raise exception 'FISCAL_PERIOD_NOT_FOUND'; end if;
  if v_period.status = 'closed' then raise exception 'CLOSED_FISCAL_PERIOD_IMMUTABLE'; end if;
  if exists (
    select 1 from public.accounting_journal_entries
    where entry_date between v_period.date_from and v_period.date_to
  ) then raise exception 'FISCAL_PERIOD_HAS_JOURNALS'; end if;
  delete from public.accounting_fiscal_periods where id = p_id;
end;
$$;

create or replace function public.enforce_accounting_closed_period()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('accounting_fiscal_periods'));
  if exists (
    select 1 from public.accounting_fiscal_periods period
    where period.status = 'closed' and new.entry_date between period.date_from and period.date_to
  ) then raise exception 'ACCOUNTING_FISCAL_PERIOD_CLOSED: %', new.entry_date; end if;
  return new;
end;
$$;

drop trigger if exists enforce_accounting_closed_period on public.accounting_journal_entries;
create trigger enforce_accounting_closed_period
before insert or update of status, entry_date on public.accounting_journal_entries
for each row execute function public.enforce_accounting_closed_period();

revoke all on public.accounting_journal_entries from anon;
revoke all on public.accounting_journal_lines from anon;
revoke insert, update, delete, truncate on public.accounting_journal_entries from authenticated;
revoke insert, update, delete, truncate on public.accounting_journal_lines from authenticated;
grant select on public.accounting_journal_entries to authenticated;
grant select on public.accounting_journal_lines to authenticated;

revoke all on function public.accounting_settings_manage_allowed() from public, anon;
revoke all on function public.save_accounting_posting_defaults(jsonb) from public, anon;
revoke all on function public.save_accounting_fiscal_period(uuid, text, date, date) from public, anon;
revoke all on function public.set_accounting_fiscal_period_status(uuid, text) from public, anon;
revoke all on function public.delete_accounting_fiscal_period(uuid) from public, anon;
grant execute on function public.accounting_settings_manage_allowed() to authenticated, service_role;
grant execute on function public.save_accounting_posting_defaults(jsonb) to authenticated, service_role;
grant execute on function public.save_accounting_fiscal_period(uuid, text, date, date) to authenticated, service_role;
grant execute on function public.set_accounting_fiscal_period_status(uuid, text) to authenticated, service_role;
grant execute on function public.delete_accounting_fiscal_period(uuid) to authenticated, service_role;
