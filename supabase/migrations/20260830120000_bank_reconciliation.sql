-- Bank accounts and reconciliation. Imported bank data never posts journals automatically.
-- No ZATCA tables, signed documents, XML, QR, or submission state are modified.

create extension if not exists pgcrypto;

create table if not exists public.accounting_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bank_name text,
  iban text,
  account_code text not null references public.accounting_accounts(code) on update restrict on delete restrict,
  currency text not null default 'SAR' check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_code),
  check (iban is null or iban ~ '^SA[0-9]{22}$')
);

create table if not exists public.accounting_bank_statement_imports (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid not null references public.accounting_bank_accounts(id) on delete restrict,
  file_name text not null,
  file_hash text not null,
  statement_from date not null,
  statement_to date not null,
  opening_balance numeric(18,2),
  closing_balance numeric(18,2),
  status text not null default 'imported' check (status in ('imported', 'partially_reconciled', 'reconciled')),
  imported_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bank_account_id, file_hash),
  check (statement_from <= statement_to)
);

create table if not exists public.accounting_bank_statement_lines (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.accounting_bank_statement_imports(id) on delete restrict,
  bank_account_id uuid not null references public.accounting_bank_accounts(id) on delete restrict,
  transaction_date date not null,
  value_date date,
  reference text,
  description text not null default '',
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  running_balance numeric(18,2),
  amount numeric(18,2) generated always as (credit - debit) stored,
  row_hash text not null,
  reconciliation_status text not null default 'unmatched' check (reconciliation_status in ('unmatched', 'matched', 'excluded')),
  matched_journal_entry_id uuid references public.accounting_journal_entries(id) on delete restrict,
  matched_at timestamptz,
  matched_by uuid references auth.users(id) on delete set null,
  match_note text,
  created_at timestamptz not null default now(),
  unique (import_id, row_hash),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0)),
  check (
    (reconciliation_status = 'matched' and matched_journal_entry_id is not null and matched_at is not null)
    or (reconciliation_status <> 'matched' and matched_journal_entry_id is null)
  )
);

create index if not exists accounting_bank_imports_account_date_idx
  on public.accounting_bank_statement_imports(bank_account_id, statement_to desc, created_at desc);
create index if not exists accounting_bank_lines_account_date_idx
  on public.accounting_bank_statement_lines(bank_account_id, transaction_date, id);
create index if not exists accounting_bank_lines_unmatched_idx
  on public.accounting_bank_statement_lines(bank_account_id, transaction_date, id)
  where reconciliation_status = 'unmatched';
create unique index if not exists accounting_bank_lines_matched_journal_uidx
  on public.accounting_bank_statement_lines(bank_account_id, matched_journal_entry_id)
  where reconciliation_status = 'matched' and matched_journal_entry_id is not null;

insert into public.accounting_accounts (
  code, company_name, name_ar, name_en, parent_code, cash_flow_type,
  account_type, level, enable_payments, is_system
)
select '1114', company_name, 'صندوق المصروفات النثرية', 'Petty Cash', '111',
  'التشغيليات', 'التشغيليات', 3, true, true
from public.accounting_accounts
where code = '111'
on conflict (code) do nothing;

insert into public.accounting_bank_accounts(name, bank_name, account_code, currency)
select 'الحساب البنكي', 'البنك العربي الوطني', '1113', 'SAR'
where exists (select 1 from public.accounting_accounts where code = '1113')
on conflict (account_code) do nothing;

insert into public.accounting_bank_accounts(name, account_code, currency)
select 'الخزينة', '1111', 'SAR'
where exists (select 1 from public.accounting_accounts where code = '1111')
on conflict (account_code) do nothing;

insert into public.accounting_bank_accounts(name, account_code, currency)
select 'المصروفات النثرية', '1114', 'SAR'
where exists (select 1 from public.accounting_accounts where code = '1114')
on conflict (account_code) do nothing;

create or replace function public.accounting_bank_access_allowed(p_manage boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'service_role' or exists (
    select 1
    from public.employees employee
    left join public.user_roles role
      on role.name_ar = employee.employee_role and role.status = 'فعال'
    where lower(employee.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (
        employee.employee_role in ('مدير النظام', 'مدير عام', 'المدير العام')
        or case when p_manage then
          coalesce(role.permissions ->> 'accounting.accounts', '') in ('true', 'manage')
          or coalesce(role.permissions ->> 'module.accounting', '') in ('true', 'manage')
        else
          coalesce(role.permissions ->> 'accounting.accounts', '') in ('true', 'read', 'manage')
          or coalesce(role.permissions ->> 'module.accounting', '') in ('true', 'read', 'manage')
        end
      )
  );
$$;

create or replace function public.import_accounting_bank_statement(
  p_bank_account_id uuid,
  p_file_name text,
  p_statement_from date,
  p_statement_to date,
  p_opening_balance numeric,
  p_closing_balance numeric,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_import_id uuid;
  v_line jsonb;
  v_date date;
  v_value_date date;
  v_debit numeric(18,2);
  v_credit numeric(18,2);
  v_balance numeric(18,2);
  v_reference text;
  v_description text;
  v_hash text;
  v_file_hash text;
  v_position integer := 0;
begin
  if not public.accounting_bank_access_allowed(true) then
    raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED';
  end if;
  if p_statement_from is null or p_statement_to is null or p_statement_from > p_statement_to then
    raise exception 'BANK_STATEMENT_DATE_RANGE_INVALID';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'BANK_STATEMENT_LINES_REQUIRED';
  end if;
  if not exists (select 1 from public.accounting_bank_accounts where id = p_bank_account_id and active) then
    raise exception 'BANK_ACCOUNT_NOT_FOUND_OR_INACTIVE';
  end if;

  v_file_hash := encode(digest(concat_ws('|', p_bank_account_id::text,
    p_statement_from::text, p_statement_to::text,
    coalesce(p_opening_balance::text, ''), coalesce(p_closing_balance::text, ''),
    p_lines::text), 'sha256'), 'hex');

  insert into public.accounting_bank_statement_imports(
    bank_account_id, file_name, file_hash, statement_from, statement_to,
    opening_balance, closing_balance
  ) values (
    p_bank_account_id, nullif(trim(p_file_name), ''), v_file_hash,
    p_statement_from, p_statement_to, p_opening_balance, p_closing_balance
  ) returning id into v_import_id;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_position := v_position + 1;
    v_date := (v_line->>'date')::date;
    v_value_date := nullif(v_line->>'valueDate', '')::date;
    v_debit := round(coalesce(nullif(v_line->>'debit', '')::numeric, 0), 2);
    v_credit := round(coalesce(nullif(v_line->>'credit', '')::numeric, 0), 2);
    v_balance := nullif(v_line->>'balance', '')::numeric;
    v_reference := nullif(trim(v_line->>'reference'), '');
    v_description := coalesce(trim(v_line->>'description'), '');

    if v_date < p_statement_from or v_date > p_statement_to then
      raise exception 'BANK_LINE_DATE_OUTSIDE_STATEMENT: %', v_date;
    end if;
    if not ((v_debit >= 0.01 and v_credit = 0) or (v_credit >= 0.01 and v_debit = 0)) then
      raise exception 'BANK_LINE_DEBIT_CREDIT_INVALID: %', v_date;
    end if;

    v_hash := encode(digest(concat_ws('|', v_position::text, v_date::text,
      coalesce(v_reference, ''), v_description, v_debit::text, v_credit::text,
      coalesce(v_balance::text, '')), 'sha256'), 'hex');

    insert into public.accounting_bank_statement_lines(
      import_id, bank_account_id, transaction_date, value_date, reference,
      description, debit, credit, running_balance, row_hash
    ) values (
      v_import_id, p_bank_account_id, v_date, v_value_date, v_reference,
      v_description, v_debit, v_credit, v_balance, v_hash
    );
  end loop;

  return v_import_id;
end;
$$;

create or replace function public.get_accounting_bank_ledger_balances()
returns table (
  bank_account_id uuid,
  account_code text,
  ledger_balance numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select bank.id, bank.account_code,
    round(coalesce(sum(line.debit - line.credit) filter (where entry.id is not null), 0), 2)
  from public.accounting_bank_accounts bank
  left join public.accounting_journal_lines line
    on line.account_code = bank.account_code
  left join public.accounting_journal_entries entry
    on entry.id = line.journal_entry_id and entry.status = 'posted'
  where bank.active
    and public.accounting_bank_access_allowed(false)
  group by bank.id, bank.account_code
  order by bank.account_code;
$$;

create or replace function public.get_bank_reconciliation_candidates(p_line_id uuid)
returns table (
  journal_entry_id uuid,
  entry_date date,
  reference text,
  description text,
  ledger_amount numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with bank_line as (
    select line.id, line.transaction_date, line.amount, account.account_code
    from public.accounting_bank_statement_lines line
    join public.accounting_bank_accounts account on account.id = line.bank_account_id
    where line.id = p_line_id and line.reconciliation_status = 'unmatched'
  )
  select entry.id, entry.entry_date,
    coalesce(entry.source_document_id, entry.id::text), entry.description,
    round(sum(journal_line.debit - journal_line.credit), 2)
  from bank_line
  join public.accounting_journal_entries entry
    on entry.status = 'posted'
   and entry.entry_date between bank_line.transaction_date - 7 and bank_line.transaction_date + 7
  join public.accounting_journal_lines journal_line
    on journal_line.journal_entry_id = entry.id
   and journal_line.account_code = bank_line.account_code
  where not exists (
    select 1 from public.accounting_bank_statement_lines matched
    where matched.matched_journal_entry_id = entry.id
      and matched.bank_account_id = (select bank_account_id from public.accounting_bank_statement_lines where id = p_line_id)
      and matched.reconciliation_status = 'matched'
  )
  group by entry.id, entry.entry_date, entry.source_document_id,
    entry.description, bank_line.amount
  having abs(round(sum(journal_line.debit - journal_line.credit), 2) - bank_line.amount) <= 0.01
  order by abs(entry.entry_date - (select transaction_date from bank_line)), entry.created_at, entry.id;
$$;

create or replace function public.match_bank_statement_line(
  p_line_id uuid,
  p_journal_entry_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_code text;
  v_import_id uuid;
  v_amount numeric(18,2);
  v_transaction_date date;
  v_ledger_amount numeric(18,2);
begin
  if not public.accounting_bank_access_allowed(true) then
    raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED';
  end if;

  select account.account_code, line.import_id, line.amount, line.transaction_date
  into v_account_code, v_import_id, v_amount, v_transaction_date
  from public.accounting_bank_statement_lines line
  join public.accounting_bank_accounts account on account.id = line.bank_account_id
  where line.id = p_line_id and line.reconciliation_status = 'unmatched'
  for update of line;

  if not found then
    raise exception 'BANK_LINE_NOT_AVAILABLE';
  end if;

  perform 1 from public.accounting_bank_statement_imports
  where id = v_import_id
  for update;

  select round(sum(journal_line.debit - journal_line.credit), 2)
  into v_ledger_amount
  from public.accounting_journal_entries entry
  join public.accounting_journal_lines journal_line on journal_line.journal_entry_id = entry.id
  where entry.id = p_journal_entry_id
    and entry.status = 'posted'
    and entry.entry_date between v_transaction_date - 7 and v_transaction_date + 7
    and journal_line.account_code = v_account_code
  group by entry.id;

  if not found then
    raise exception 'BANK_MATCH_CANDIDATE_NOT_FOUND';
  end if;

  if abs(v_ledger_amount - v_amount) > 0.01 then
    raise exception 'BANK_MATCH_AMOUNT_MISMATCH: bank=%, ledger=%', v_amount, v_ledger_amount;
  end if;

  if exists (
    select 1 from public.accounting_bank_statement_lines
    where matched_journal_entry_id = p_journal_entry_id
      and bank_account_id = (select bank_account_id from public.accounting_bank_statement_lines where id = p_line_id)
      and reconciliation_status = 'matched'
  ) then
    raise exception 'BANK_JOURNAL_ALREADY_MATCHED';
  end if;

  update public.accounting_bank_statement_lines
  set reconciliation_status = 'matched',
      matched_journal_entry_id = p_journal_entry_id,
      matched_at = now(),
      matched_by = auth.uid(),
      match_note = nullif(trim(p_note), '')
  where id = p_line_id;
end;
$$;

create or replace function public.unmatch_bank_statement_line(p_line_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_import_id uuid;
begin
  if not public.accounting_bank_access_allowed(true) then
    raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED';
  end if;

  select import_id into v_import_id
  from public.accounting_bank_statement_lines
  where id = p_line_id and reconciliation_status = 'matched'
  for update;

  if not found then
    raise exception 'BANK_LINE_NOT_MATCHED';
  end if;

  perform 1 from public.accounting_bank_statement_imports
  where id = v_import_id
  for update;

  update public.accounting_bank_statement_lines
  set reconciliation_status = 'unmatched',
      matched_journal_entry_id = null,
      matched_at = null,
      matched_by = null,
      match_note = null
  where id = p_line_id;
end;
$$;

create or replace function public.refresh_bank_statement_import_status(p_import_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_matched integer;
begin
  perform 1 from public.accounting_bank_statement_imports
  where id = p_import_id
  for update;

  select count(*), count(*) filter (where reconciliation_status in ('matched', 'excluded'))
  into v_total, v_matched
  from public.accounting_bank_statement_lines
  where import_id = p_import_id;

  update public.accounting_bank_statement_imports
  set status = case
    when v_total > 0 and v_matched = v_total then 'reconciled'
    when v_matched > 0 then 'partially_reconciled'
    else 'imported'
  end
  where id = p_import_id;
end;
$$;

create or replace function public.sync_bank_import_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_bank_statement_import_status(coalesce(new.import_id, old.import_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_bank_import_status on public.accounting_bank_statement_lines;
create trigger sync_bank_import_status
after update of reconciliation_status
on public.accounting_bank_statement_lines
for each row
execute function public.sync_bank_import_status();

alter table public.accounting_bank_accounts enable row level security;
alter table public.accounting_bank_statement_imports enable row level security;
alter table public.accounting_bank_statement_lines enable row level security;

create policy accounting_bank_accounts_select_authorized
on public.accounting_bank_accounts for select to authenticated
using (public.accounting_bank_access_allowed(false));
create policy accounting_bank_accounts_manage_authorized
on public.accounting_bank_accounts for all to authenticated
using (public.accounting_bank_access_allowed(true))
with check (public.accounting_bank_access_allowed(true));
create policy accounting_bank_statement_imports_select_authorized
on public.accounting_bank_statement_imports for select to authenticated
using (public.accounting_bank_access_allowed(false));
create policy accounting_bank_statement_lines_select_authorized
on public.accounting_bank_statement_lines for select to authenticated
using (public.accounting_bank_access_allowed(false));

grant select, insert, update on public.accounting_bank_accounts to authenticated;
grant select on public.accounting_bank_statement_imports to authenticated;
grant select on public.accounting_bank_statement_lines to authenticated;
revoke all on function public.accounting_bank_access_allowed(boolean) from public;
revoke all on function public.import_accounting_bank_statement(uuid, text, date, date, numeric, numeric, jsonb) from public;
revoke all on function public.get_accounting_bank_ledger_balances() from public;
revoke all on function public.get_bank_reconciliation_candidates(uuid) from public;
revoke all on function public.match_bank_statement_line(uuid, uuid, text) from public;
revoke all on function public.unmatch_bank_statement_line(uuid) from public;
revoke all on function public.refresh_bank_statement_import_status(uuid) from public;

grant execute on function public.accounting_bank_access_allowed(boolean) to authenticated;
grant execute on function public.import_accounting_bank_statement(uuid, text, date, date, numeric, numeric, jsonb) to authenticated;
grant execute on function public.get_accounting_bank_ledger_balances() to authenticated;
grant execute on function public.get_bank_reconciliation_candidates(uuid) to authenticated;
grant execute on function public.match_bank_statement_line(uuid, uuid, text) to authenticated;
grant execute on function public.unmatch_bank_statement_line(uuid) to authenticated;
