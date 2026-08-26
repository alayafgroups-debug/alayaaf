-- Bulk reclassification creates new posted journals and never mutates original posted entries.
-- No invoice, ZATCA XML, signature, QR, clearance, or reporting flow is modified.

create table if not exists public.accounting_reclassifications (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null unique references public.accounting_journal_entries(id) on delete restrict,
  source_account_code text not null references public.accounting_accounts(code) on update restrict on delete restrict,
  destination_account_code text not null references public.accounting_accounts(code) on update restrict on delete restrict,
  entry_date date not null,
  description text not null,
  selected_line_count integer not null check (selected_line_count > 0),
  total_debit numeric(14,2) not null default 0 check (total_debit >= 0),
  total_credit numeric(14,2) not null default 0 check (total_credit >= 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  check (source_account_code <> destination_account_code),
  check (total_debit > 0 or total_credit > 0)
);

create table if not exists public.accounting_reclassification_items (
  reclassification_id uuid not null references public.accounting_reclassifications(id) on delete restrict,
  source_journal_line_id uuid not null unique references public.accounting_journal_lines(id) on delete restrict,
  primary key (reclassification_id, source_journal_line_id)
);

create index if not exists accounting_reclassifications_created_at_idx
  on public.accounting_reclassifications(created_at desc);

create or replace function public.accounting_reclassification_manage_allowed()
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
        or coalesce(role.permissions ->> 'accounting.reclassification', '') in ('true', 'manage')
        or coalesce(role.permissions ->> 'accounting.accounts', '') in ('true', 'manage')
        or coalesce(role.permissions ->> 'module.accounting', '') in ('true', 'manage')
      )
  );
$$;

alter table public.accounting_reclassifications enable row level security;
alter table public.accounting_reclassification_items enable row level security;

drop policy if exists accounting_reclassifications_authenticated_select on public.accounting_reclassifications;
create policy accounting_reclassifications_authenticated_select
on public.accounting_reclassifications for select to authenticated
using (public.accounting_reclassification_manage_allowed());

drop policy if exists accounting_reclassification_items_authenticated_select on public.accounting_reclassification_items;
create policy accounting_reclassification_items_authenticated_select
on public.accounting_reclassification_items for select to authenticated
using (public.accounting_reclassification_manage_allowed());

revoke insert, update, delete, truncate on public.accounting_reclassifications from anon, authenticated;
revoke insert, update, delete, truncate on public.accounting_reclassification_items from anon, authenticated;
grant select on public.accounting_reclassifications to authenticated;
grant select on public.accounting_reclassification_items to authenticated;

create or replace function public.list_bulk_reclassification_candidates(
  p_source_account_code text,
  p_date_from date,
  p_date_to date
)
returns table (
  id uuid,
  journal_entry_id uuid,
  entry_date date,
  reference_type text,
  description text,
  debit numeric(14,2),
  credit numeric(14,2),
  counterparty text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.accounting_reclassification_manage_allowed() then
    raise exception 'RECLASSIFICATION_MANAGE_PERMISSION_REQUIRED';
  end if;
  if nullif(trim(p_source_account_code), '') is null then raise exception 'RECLASSIFICATION_SOURCE_REQUIRED'; end if;
  if p_date_from is null or p_date_to is null or p_date_from > p_date_to then raise exception 'RECLASSIFICATION_DATE_RANGE_INVALID'; end if;

  perform public.account_name_for_posting(trim(p_source_account_code));

  return query
  select line.id, line.journal_entry_id, entry.entry_date, entry.reference_type,
         entry.description, line.debit, line.credit, line.counterparty
  from public.accounting_journal_lines line
  join public.accounting_journal_entries entry on entry.id = line.journal_entry_id
  where line.account_code = trim(p_source_account_code)
    and entry.status = 'posted'
    and entry.entry_date between p_date_from and p_date_to
    and not exists (
      select 1 from public.accounting_reclassification_items item
      where item.source_journal_line_id = line.id
    )
  order by entry.entry_date, entry.created_at, entry.id, line.created_at, line.id
  limit 500;
end;
$$;

create or replace function public.create_bulk_reclassification(
  p_source_line_ids uuid[],
  p_destination_account_code text,
  p_entry_date date,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reclassification_id uuid := gen_random_uuid();
  v_entry_id uuid := gen_random_uuid();
  v_requested_count integer;
  v_valid_count integer;
  v_source_account_code text;
  v_source_account_name text;
  v_destination_account_name text;
  v_total_debit numeric(14,2);
  v_total_credit numeric(14,2);
begin
  if not public.accounting_reclassification_manage_allowed() then
    raise exception 'RECLASSIFICATION_MANAGE_PERMISSION_REQUIRED';
  end if;

  v_requested_count := coalesce(cardinality(p_source_line_ids), 0);
  if v_requested_count = 0 then raise exception 'RECLASSIFICATION_LINES_REQUIRED'; end if;
  if v_requested_count > 500 then raise exception 'RECLASSIFICATION_LINE_LIMIT_EXCEEDED'; end if;
  if p_entry_date is null then raise exception 'RECLASSIFICATION_DATE_REQUIRED'; end if;
  if nullif(trim(p_description), '') is null then raise exception 'RECLASSIFICATION_DESCRIPTION_REQUIRED'; end if;
  if nullif(trim(p_destination_account_code), '') is null then raise exception 'RECLASSIFICATION_DESTINATION_REQUIRED'; end if;

  if (select count(*) from unnest(p_source_line_ids) line_id) <> (select count(distinct line_id) from unnest(p_source_line_ids) line_id) then
    raise exception 'RECLASSIFICATION_DUPLICATE_LINE_IDS';
  end if;

  perform 1
  from public.accounting_journal_lines line
  join public.accounting_journal_entries entry on entry.id = line.journal_entry_id
  where line.id = any(p_source_line_ids)
  order by line.id
  for update of line, entry;

  select count(*), min(line.account_code),
         coalesce(sum(line.debit), 0)::numeric(14,2),
         coalesce(sum(line.credit), 0)::numeric(14,2)
  into v_valid_count, v_source_account_code, v_total_debit, v_total_credit
  from public.accounting_journal_lines line
  join public.accounting_journal_entries entry on entry.id = line.journal_entry_id
  where line.id = any(p_source_line_ids)
    and entry.status = 'posted';

  if v_valid_count <> v_requested_count then raise exception 'RECLASSIFICATION_REQUIRES_POSTED_LINES'; end if;
  if exists (
    select 1 from public.accounting_journal_lines line
    where line.id = any(p_source_line_ids) and line.account_code <> v_source_account_code
  ) then raise exception 'RECLASSIFICATION_REQUIRES_ONE_SOURCE_ACCOUNT'; end if;
  if exists (
    select 1 from public.accounting_reclassification_items item
    where item.source_journal_line_id = any(p_source_line_ids)
  ) then raise exception 'RECLASSIFICATION_LINE_ALREADY_USED'; end if;
  if v_source_account_code = trim(p_destination_account_code) then raise exception 'RECLASSIFICATION_ACCOUNTS_MUST_DIFFER'; end if;
  if v_total_debit <= 0 and v_total_credit <= 0 then raise exception 'RECLASSIFICATION_AMOUNT_REQUIRED'; end if;

  v_source_account_name := public.account_name_for_posting(v_source_account_code);
  v_destination_account_name := public.account_name_for_posting(trim(p_destination_account_code));

  insert into public.accounting_journal_entries (
    id, entry_date, reference_type, source_document_table, source_document_id, description, status
  ) values (
    v_entry_id, p_entry_date, 'bulk_reclassification', 'accounting_reclassifications',
    v_reclassification_id::text, trim(p_description), 'posted'
  );

  insert into public.accounting_reclassifications (
    id, journal_entry_id, source_account_code, destination_account_code, entry_date,
    description, selected_line_count, total_debit, total_credit, created_by
  ) values (
    v_reclassification_id, v_entry_id, v_source_account_code, trim(p_destination_account_code),
    p_entry_date, trim(p_description), v_requested_count, v_total_debit, v_total_credit, auth.uid()
  );

  insert into public.accounting_reclassification_items (reclassification_id, source_journal_line_id)
  select v_reclassification_id, line_id from unnest(p_source_line_ids) line_id;

  if v_total_debit > 0 then
    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
    values
      (v_entry_id, v_source_account_code, v_source_account_name, 0, v_total_debit, 'إعادة تصنيف جماعي'),
      (v_entry_id, trim(p_destination_account_code), v_destination_account_name, v_total_debit, 0, 'إعادة تصنيف جماعي');
  end if;

  if v_total_credit > 0 then
    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
    values
      (v_entry_id, v_source_account_code, v_source_account_name, v_total_credit, 0, 'إعادة تصنيف جماعي'),
      (v_entry_id, trim(p_destination_account_code), v_destination_account_name, 0, v_total_credit, 'إعادة تصنيف جماعي');
  end if;

  return v_entry_id;
end;
$$;

revoke all on function public.accounting_reclassification_manage_allowed() from public, anon;
revoke all on function public.list_bulk_reclassification_candidates(text, date, date) from public, anon;
revoke all on function public.create_bulk_reclassification(uuid[], text, date, text) from public, anon;
grant execute on function public.accounting_reclassification_manage_allowed() to authenticated;
grant execute on function public.list_bulk_reclassification_candidates(text, date, date) to authenticated;
grant execute on function public.create_bulk_reclassification(uuid[], text, date, text) to authenticated;
