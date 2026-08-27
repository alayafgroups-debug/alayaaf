-- Require an explicitly open fiscal period for accounting and inventory posting.
-- Draft journals remain editable outside open periods.
-- This migration does not modify ZATCA XML, UBL, signing, QR, ICV, PIH, clearance or reporting.

create or replace function public.assert_accounting_period_open(p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if p_date is null then
    raise exception 'ACCOUNTING_ENTRY_DATE_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext('accounting_fiscal_periods'));

  select period.status
  into v_status
  from public.accounting_fiscal_periods period
  where p_date between period.date_from and period.date_to
  limit 1;

  if not found then
    raise exception 'ACCOUNTING_FISCAL_PERIOD_REQUIRED: %', p_date;
  end if;
  if v_status <> 'open' then
    raise exception 'ACCOUNTING_FISCAL_PERIOD_CLOSED: %', p_date;
  end if;
end;
$$;

create or replace function public.enforce_accounting_closed_period()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('posted', 'reversed') then
    perform public.assert_accounting_period_open(new.entry_date);
  end if;
  return new;
end;
$$;

create or replace function public.enforce_inventory_open_period()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_accounting_period_open(new.movement_date);
  return new;
end;
$$;

-- Historical entries from 2024 are retained and their year is locked.
insert into public.accounting_fiscal_periods (
  name, date_from, date_to, status, closed_at, updated_at
)
select 'السنة المالية 2024 — مغلقة', date '2024-01-01', date '2024-12-31', 'closed', now(), now()
where not exists (
  select 1 from public.accounting_fiscal_periods
  where daterange(date_from, date_to, '[]') && daterange(date '2024-01-01', date '2024-12-31', '[]')
);

-- Create operational monthly periods for the active financial year.
insert into public.accounting_fiscal_periods (name, date_from, date_to, status)
select
  'الفترة ' || to_char(month_start, 'YYYY-MM'),
  month_start::date,
  (month_start + interval '1 month - 1 day')::date,
  'open'
from generate_series(date '2026-01-01', date '2026-12-01', interval '1 month') month_start
where not exists (
  select 1 from public.accounting_fiscal_periods period
  where daterange(period.date_from, period.date_to, '[]')
    && daterange(month_start::date, (month_start + interval '1 month - 1 day')::date, '[]')
);

-- Replace the existing journal trigger: drafts are allowed, posting is guarded.
drop trigger if exists enforce_accounting_closed_period on public.accounting_journal_entries;
create trigger enforce_accounting_closed_period
before insert or update of status, entry_date on public.accounting_journal_entries
for each row execute function public.enforce_accounting_closed_period();

-- Stock postings without journals (such as receipts and transfers) obey the same periods.
drop trigger if exists enforce_inventory_open_period on public.inventory_stock_movements;
create trigger enforce_inventory_open_period
before insert or update of movement_date on public.inventory_stock_movements
for each row execute function public.enforce_inventory_open_period();

revoke all on function public.assert_accounting_period_open(date) from public, anon, authenticated;
revoke all on function public.enforce_accounting_closed_period() from public, anon, authenticated;
revoke all on function public.enforce_inventory_open_period() from public, anon, authenticated;
grant execute on function public.assert_accounting_period_open(date) to service_role;
