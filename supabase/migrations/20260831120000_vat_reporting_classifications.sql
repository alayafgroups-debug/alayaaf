-- Explicit VAT reporting classifications stored separately from legal invoice items.
-- This migration does not change ZATCA XML, signing, QR, clearance, or reporting payloads.

create or replace function public.accounting_access_allowed(p_manage boolean default false)
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
          coalesce(role.permissions ->> 'accounting.tax_reports', '') in ('true', 'manage')
          or coalesce(role.permissions ->> 'accounting.accounts', '') in ('true', 'manage')
          or coalesce(role.permissions ->> 'module.accounting', '') in ('true', 'manage')
        else
          coalesce(role.permissions ->> 'accounting.tax_reports', '') in ('true', 'read', 'manage')
          or coalesce(role.permissions ->> 'accounting.accounts', '') in ('true', 'read', 'manage')
          or coalesce(role.permissions ->> 'module.accounting', '') in ('true', 'read', 'manage')
        end
      )
  );
$$;

create or replace function public.accounting_bank_access_allowed(p_manage boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.accounting_access_allowed(p_manage);
$$;

create table if not exists public.accounting_vat_line_classifications (
  id uuid primary key default gen_random_uuid(),
  document_table text not null check (document_table in ('sales_invoices', 'purchase_invoices', 'invoice_adjustment_notes')),
  document_id text not null,
  document_date date not null,
  document_side text not null check (document_side in ('sales', 'purchases')),
  line_index integer not null check (line_index >= 0),
  line_description text not null default '',
  tax_category text not null check (tax_category in ('standard', 'zero_rated', 'exempt', 'out_of_scope')),
  supply_type text not null check (supply_type in ('domestic', 'export', 'import', 'reverse_charge')),
  tax_rate numeric(7,4) not null check (tax_rate >= 0 and tax_rate <= 100),
  taxable_amount numeric(18,2) not null,
  tax_amount numeric(18,2) not null,
  report_eligible boolean not null default false,
  confirmed_by uuid default auth.uid() references auth.users(id) on delete set null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_table, document_id, line_index),
  check (tax_category = 'standard' or tax_rate = 0),
  check (tax_category <> 'standard' or tax_rate = 15),
  check (document_side = 'sales' or supply_type <> 'export'),
  check (document_side = 'purchases' or supply_type not in ('import', 'reverse_charge'))
);

create index if not exists accounting_vat_lines_report_idx
  on public.accounting_vat_line_classifications(document_date, document_side, tax_category, supply_type)
  where report_eligible;
create index if not exists accounting_vat_lines_document_idx
  on public.accounting_vat_line_classifications(document_table, document_id);

create or replace function public.save_vat_document_classification(
  p_document_table text,
  p_document_id text,
  p_lines jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
  v_document_date date;
  v_document_side text;
  v_document_type text;
  v_report_eligible boolean := false;
  v_document_tax numeric(18,2) := 0;
  v_classified_tax numeric(18,2) := 0;
  v_sign integer := 1;
  v_input jsonb;
  v_item jsonb;
  v_index integer;
  v_tax_category text;
  v_supply_type text;
  v_rate numeric(7,4);
  v_base numeric(18,2);
  v_tax numeric(18,2);
  v_count integer := 0;
begin
  if not public.accounting_access_allowed(true) then
    raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED';
  end if;

  if p_document_table = 'sales_invoices' then
    select items, date::date, 'sales', 'sales_invoice', accounting_status = 'posted', coalesce(total_tax, 0)
    into v_items, v_document_date, v_document_side, v_document_type, v_report_eligible, v_document_tax
    from public.sales_invoices where id::text = p_document_id;
  elsif p_document_table = 'purchase_invoices' then
    raise exception 'PURCHASE_ACCOUNTING_POSTING_REQUIRED';
  elsif p_document_table = 'invoice_adjustment_notes' then
    select items, issue_date, case when note_type in ('sales_credit', 'sales_debit') then 'sales' else 'purchases' end,
      note_type, accounting_status = 'posted', coalesce(tax, 0)
    into v_items, v_document_date, v_document_side, v_document_type, v_report_eligible, v_document_tax
    from public.invoice_adjustment_notes where id::text = p_document_id and status = 'posted';
  else
    raise exception 'VAT_DOCUMENT_TABLE_INVALID';
  end if;

  if not found then
    raise exception 'VAT_DOCUMENT_NOT_FOUND';
  end if;
  if not v_report_eligible then
    raise exception 'VAT_DOCUMENT_MUST_BE_POSTED_AND_IMMUTABLE';
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'VAT_DOCUMENT_ITEMS_REQUIRED';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) <> jsonb_array_length(v_items) then
    raise exception 'VAT_CLASSIFICATION_REQUIRED_FOR_EVERY_LINE';
  end if;

  if v_document_type in ('sales_credit', 'purchase_debit') then
    v_sign := -1;
  end if;

  delete from public.accounting_vat_line_classifications
  where document_table = p_document_table and document_id = p_document_id;

  for v_input in select value from jsonb_array_elements(p_lines)
  loop
    v_index := (v_input->>'lineIndex')::integer;
    v_tax_category := v_input->>'taxCategory';
    v_supply_type := v_input->>'supplyType';
    v_item := v_items->v_index;

    if v_item is null then
      raise exception 'VAT_LINE_INDEX_INVALID: %', v_index;
    end if;
    if v_tax_category not in ('standard', 'zero_rated', 'exempt', 'out_of_scope') then
      raise exception 'VAT_TAX_CATEGORY_INVALID: %', v_tax_category;
    end if;
    if v_supply_type not in ('domestic', 'export', 'import', 'reverse_charge') then
      raise exception 'VAT_SUPPLY_TYPE_INVALID: %', v_supply_type;
    end if;
    if v_document_side = 'sales' and v_supply_type in ('import', 'reverse_charge') then
      raise exception 'VAT_SALES_SUPPLY_TYPE_INVALID';
    end if;
    if v_document_side = 'purchases' and v_supply_type = 'export' then
      raise exception 'VAT_PURCHASE_SUPPLY_TYPE_INVALID';
    end if;
    if v_document_side = 'sales' and v_tax_category = 'standard' and v_supply_type <> 'domestic' then
      raise exception 'VAT_STANDARD_SALES_MUST_BE_DOMESTIC';
    end if;
    if v_supply_type = 'export' and v_tax_category <> 'zero_rated' then
      raise exception 'VAT_EXPORT_MUST_BE_ZERO_RATED';
    end if;

    v_rate := round(coalesce(
      nullif(v_item->>'taxPercent', '')::numeric,
      case when p_document_table = 'invoice_adjustment_notes' and abs(v_document_tax) > 0 then 15 else 0 end
    ), 4);
    if v_tax_category = 'standard' and v_rate <> 15 then
      raise exception 'VAT_STANDARD_RATE_MUST_BE_15: line %', v_index;
    end if;
    if v_tax_category <> 'standard' and v_rate <> 0 then
      raise exception 'VAT_NON_STANDARD_RATE_MUST_BE_ZERO: line %', v_index;
    end if;

    v_base := round(greatest(
      coalesce(nullif(v_item->>'quantity', '')::numeric, 0)
        * coalesce(nullif(v_item->>'unitPrice', '')::numeric, 0)
        - coalesce(nullif(v_item->>'discount', '')::numeric, 0),
      0
    ), 2) * v_sign;
    v_tax := round(abs(v_base) * v_rate / 100, 2) * v_sign;
    v_classified_tax := v_classified_tax + v_tax;

    insert into public.accounting_vat_line_classifications(
      document_table, document_id, document_date, document_side, line_index,
      line_description, tax_category, supply_type, tax_rate,
      taxable_amount, tax_amount, report_eligible
    ) values (
      p_document_table, p_document_id, v_document_date, v_document_side, v_index,
      coalesce(v_item->>'description', ''), v_tax_category, v_supply_type,
      v_rate, v_base, v_tax, v_report_eligible
    );
    v_count := v_count + 1;
  end loop;

  if p_document_table = 'invoice_adjustment_notes'
     and abs(abs(v_classified_tax) - abs(v_document_tax)) > 0.02 then
    raise exception 'VAT_ADJUSTMENT_TAX_MISMATCH: classified=%, document=%',
      v_classified_tax, v_document_tax;
  end if;

  return v_count;
end;
$$;

create or replace function public.protect_posted_adjustment_note()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.accounting_status = 'posted' then
    if tg_op = 'DELETE' then
      raise exception 'POSTED_ADJUSTMENT_NOTE_IMMUTABLE: %', old.id;
    end if;
    if new.items is distinct from old.items
       or new.subtotal is distinct from old.subtotal
       or new.tax is distinct from old.tax
       or new.total is distinct from old.total
       or new.note_type is distinct from old.note_type
       or new.issue_date is distinct from old.issue_date
       or new.status is distinct from old.status
       or new.original_invoice_id is distinct from old.original_invoice_id then
      raise exception 'POSTED_ADJUSTMENT_NOTE_IMMUTABLE: %', old.id;
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_posted_adjustment_note on public.invoice_adjustment_notes;
create trigger protect_posted_adjustment_note
before update or delete on public.invoice_adjustment_notes
for each row execute function public.protect_posted_adjustment_note();

create or replace function public.get_vat_report_summary(p_date_from date, p_date_to date)
returns table (
  document_side text,
  tax_category text,
  supply_type text,
  document_count bigint,
  taxable_amount numeric,
  tax_amount numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select line.document_side, line.tax_category, line.supply_type,
    count(distinct (line.document_table, line.document_id)),
    round(sum(line.taxable_amount), 2), round(sum(line.tax_amount), 2)
  from public.accounting_vat_line_classifications line
  where line.report_eligible
    and line.document_date between p_date_from and p_date_to
    and public.accounting_access_allowed(false)
  group by line.document_side, line.tax_category, line.supply_type
  order by line.document_side, line.tax_category, line.supply_type;
$$;

create or replace view public.accounting_vat_report_lines
with (security_invoker = true)
as
select id, document_table, document_id, document_date, document_side,
  line_index, line_description, tax_category, supply_type, tax_rate,
  taxable_amount, tax_amount, report_eligible, confirmed_at
from public.accounting_vat_line_classifications;

alter table public.accounting_vat_line_classifications enable row level security;

create policy accounting_vat_lines_select_authorized
on public.accounting_vat_line_classifications for select to authenticated
using (public.accounting_access_allowed(false));

revoke all on function public.accounting_access_allowed(boolean) from public;
revoke all on function public.save_vat_document_classification(text, text, jsonb) from public;
revoke all on function public.get_vat_report_summary(date, date) from public;
revoke all on public.accounting_vat_report_lines from anon;

grant execute on function public.accounting_access_allowed(boolean) to authenticated;
grant execute on function public.save_vat_document_classification(text, text, jsonb) to authenticated;
grant execute on function public.get_vat_report_summary(date, date) to authenticated;
grant select on public.accounting_vat_line_classifications to authenticated;
grant select on public.accounting_vat_report_lines to authenticated;
