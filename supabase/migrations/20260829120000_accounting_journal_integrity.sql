-- Accounting journal integrity safeguards.
-- This migration does not modify invoices, ZATCA documents, XML, QR data, or submission flows.

create index if not exists accounting_journal_entries_posted_date_idx
  on public.accounting_journal_entries (entry_date, created_at, id)
  where status = 'posted';

create index if not exists accounting_journal_lines_entry_account_idx
  on public.accounting_journal_lines (journal_entry_id, account_code);

create index if not exists accounting_journal_lines_account_entry_idx
  on public.accounting_journal_lines (account_code, journal_entry_id);

-- NOT VALID preserves historical data while immediately protecting new rows.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'accounting_journal_lines_account_fk'
      and conrelid = 'public.accounting_journal_lines'::regclass
  ) then
    alter table public.accounting_journal_lines
      add constraint accounting_journal_lines_account_fk
      foreign key (account_code)
      references public.accounting_accounts(code)
      on update restrict
      on delete restrict
      not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'accounting_accounts_parent_fk'
      and conrelid = 'public.accounting_accounts'::regclass
  ) then
    alter table public.accounting_accounts
      add constraint accounting_accounts_parent_fk
      foreign key (parent_code)
      references public.accounting_accounts(code)
      on update restrict
      on delete restrict
      not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'accounting_accounts_not_self_parent'
      and conrelid = 'public.accounting_accounts'::regclass
  ) then
    alter table public.accounting_accounts
      add constraint accounting_accounts_not_self_parent
      check (parent_code is null or parent_code <> code)
      not valid;
  end if;
end;
$$;

create or replace function public.enforce_postable_accounting_line()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.accounting_accounts where code = new.account_code
  ) then
    raise exception 'ACCOUNTING_ACCOUNT_NOT_FOUND: %', new.account_code;
  end if;

  if exists (
    select 1 from public.accounting_accounts where parent_code = new.account_code
  ) then
    raise exception 'ACCOUNTING_AGGREGATE_ACCOUNT_NOT_POSTABLE: %', new.account_code;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_postable_accounting_line on public.accounting_journal_lines;
create trigger enforce_postable_accounting_line
before insert or update of account_code
on public.accounting_journal_lines
for each row
execute function public.enforce_postable_accounting_line();

create or replace function public.assert_posted_journal_entry_balanced(p_entry_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status text;
  v_line_count integer;
  v_debit numeric(18,2);
  v_credit numeric(18,2);
begin
  select status into v_status
  from public.accounting_journal_entries
  where id = p_entry_id;

  if not found or v_status <> 'posted' then
    return;
  end if;

  select count(*), coalesce(sum(debit), 0), coalesce(sum(credit), 0)
  into v_line_count, v_debit, v_credit
  from public.accounting_journal_lines
  where journal_entry_id = p_entry_id;

  if v_line_count < 2 then
    raise exception 'POSTED_JOURNAL_REQUIRES_TWO_LINES: %', p_entry_id;
  end if;

  if abs(v_debit - v_credit) > 0.01 then
    raise exception 'POSTED_JOURNAL_NOT_BALANCED: %, debit=%, credit=%',
      p_entry_id, v_debit, v_credit;
  end if;
end;
$$;

create or replace function public.enforce_posted_journal_balance()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_entry_id uuid;
begin
  if tg_table_name = 'accounting_journal_entries' then
    v_entry_id := case when tg_op = 'DELETE' then old.id else new.id end;
  else
    v_entry_id := case when tg_op = 'DELETE' then old.journal_entry_id else new.journal_entry_id end;
  end if;

  perform public.assert_posted_journal_entry_balanced(v_entry_id);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_posted_journal_balance_entry on public.accounting_journal_entries;
create constraint trigger enforce_posted_journal_balance_entry
after insert or update of status
on public.accounting_journal_entries
deferrable initially deferred
for each row
execute function public.enforce_posted_journal_balance();

drop trigger if exists enforce_posted_journal_balance_line on public.accounting_journal_lines;
create constraint trigger enforce_posted_journal_balance_line
after insert or update or delete
on public.accounting_journal_lines
deferrable initially deferred
for each row
execute function public.enforce_posted_journal_balance();

create or replace function public.protect_posted_journal_entry()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status = 'posted' then
    if new.status = 'reversed'
       and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') then
      return new;
    end if;
    raise exception 'POSTED_JOURNAL_ENTRY_IMMUTABLE: %', old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_posted_journal_entry on public.accounting_journal_entries;
create trigger protect_posted_journal_entry
before update
on public.accounting_journal_entries
for each row
execute function public.protect_posted_journal_entry();

create or replace function public.protect_posted_journal_line()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_entry_id uuid := case when tg_op = 'DELETE' then old.journal_entry_id else new.journal_entry_id end;
begin
  if exists (
    select 1 from public.accounting_journal_entries
    where id = v_entry_id and status = 'posted'
  ) then
    raise exception 'POSTED_JOURNAL_LINE_IMMUTABLE: %', v_entry_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Inserts remain allowed because existing posting functions create the posted header
-- before adding its balanced lines in the same transaction. Updates/deletes are blocked.
drop trigger if exists protect_posted_journal_line on public.accounting_journal_lines;
create trigger protect_posted_journal_line
before update or delete
on public.accounting_journal_lines
for each row
execute function public.protect_posted_journal_line();

create or replace view public.accounting_journal_integrity_audit
with (security_invoker = true)
as
select
  entry.id as journal_entry_id,
  entry.entry_date,
  entry.reference_type,
  entry.source_document_table,
  entry.source_document_id,
  entry.status,
  count(line.id) as line_count,
  coalesce(sum(line.debit), 0)::numeric(18,2) as total_debit,
  coalesce(sum(line.credit), 0)::numeric(18,2) as total_credit,
  (coalesce(sum(line.debit), 0) - coalesce(sum(line.credit), 0))::numeric(18,2) as difference,
  case
    when count(line.id) < 2 then 'INSUFFICIENT_LINES'
    when abs(coalesce(sum(line.debit), 0) - coalesce(sum(line.credit), 0)) > 0.01 then 'UNBALANCED'
    else 'VALID'
  end as integrity_status
from public.accounting_journal_entries entry
left join public.accounting_journal_lines line
  on line.journal_entry_id = entry.id
where entry.status = 'posted'
group by entry.id, entry.entry_date, entry.reference_type,
  entry.source_document_table, entry.source_document_id, entry.status;

revoke all on public.accounting_journal_integrity_audit from anon;
grant select on public.accounting_journal_integrity_audit to authenticated;
