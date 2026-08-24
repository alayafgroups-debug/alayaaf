-- Purchase invoice, payable, and vendor payment accounting.
-- No ZATCA XML, signing, QR, clearance, reporting, or sales invoice flow is modified.

alter table public.purchase_invoices
  add column if not exists vendor_id text,
  add column if not exists currency text not null default 'SAR',
  add column if not exists subtotal numeric(14,2) not null default 0,
  add column if not exists total_tax numeric(14,2) not null default 0,
  add column if not exists accounting_status text not null default 'unposted',
  add column if not exists accounting_journal_entry_id uuid references public.accounting_journal_entries(id) on delete restrict,
  add column if not exists accounting_posted_at timestamptz,
  add column if not exists accounting_error text,
  add column if not exists adjustment_total numeric(14,2) not null default 0,
  add column if not exists adjusted_total numeric(14,2),
  add column if not exists adjusted_remaining numeric(14,2);

update public.purchase_invoices invoice
set vendor_id = matched.vendor_id
from (
  select lower(trim(invoice_name.vendor)) as normalized_name, min(vendor.id::text) as vendor_id
  from public.purchase_invoices invoice_name
  join public.vendors vendor on lower(trim(vendor.name)) = lower(trim(invoice_name.vendor))
  where invoice_name.vendor_id is null
  group by lower(trim(invoice_name.vendor))
  having count(distinct vendor.id) = 1
) matched
where invoice.vendor_id is null
  and lower(trim(invoice.vendor)) = matched.normalized_name;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'purchase_invoices_vendor_id_fkey'
      and conrelid = 'public.purchase_invoices'::regclass
  ) then
    alter table public.purchase_invoices
      add constraint purchase_invoices_vendor_id_fkey
      foreign key (vendor_id) references public.vendors(id)
      on update restrict on delete restrict not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'purchase_invoices_accounting_status_check'
      and conrelid = 'public.purchase_invoices'::regclass
  ) then
    alter table public.purchase_invoices
      add constraint purchase_invoices_accounting_status_check
      check (accounting_status in ('unposted', 'posted', 'failed')) not valid;
  end if;
end;
$$;

create index if not exists purchase_invoices_vendor_idx
  on public.purchase_invoices(vendor_id, date desc);
create index if not exists purchase_invoices_accounting_status_idx
  on public.purchase_invoices(accounting_status, date desc);

create or replace function public.validate_purchase_invoice_totals()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_quantity numeric;
  v_price numeric;
  v_discount numeric;
  v_rate numeric;
  v_line numeric;
  v_subtotal numeric(14,2) := 0;
  v_tax numeric(14,2) := 0;
  v_total numeric(14,2);
begin
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'PURCHASE_INVOICE_ITEMS_REQUIRED';
  end if;
  if new.vendor_id is null then
    raise exception 'PURCHASE_INVOICE_VENDOR_REQUIRED';
  end if;
  if not exists (select 1 from public.vendors where id = new.vendor_id and status = 'نشط') then
    raise exception 'PURCHASE_INVOICE_VENDOR_INVALID';
  end if;

  for v_item in select value from jsonb_array_elements(new.items)
  loop
    v_quantity := coalesce(nullif(v_item->>'quantity', '')::numeric, 0);
    v_price := coalesce(nullif(v_item->>'unitPrice', '')::numeric, 0);
    v_discount := coalesce(nullif(v_item->>'discount', '')::numeric, 0);
    v_rate := coalesce(nullif(v_item->>'taxPercent', '')::numeric, 0);
    if v_quantity <= 0 or v_price < 0 or v_discount < 0 or v_discount > v_quantity * v_price then
      raise exception 'PURCHASE_INVOICE_ITEM_VALUES_INVALID';
    end if;
    if v_rate not in (0, 15) then
      raise exception 'PURCHASE_INVOICE_TAX_RATE_INVALID';
    end if;
    v_line := round(v_quantity * v_price - v_discount, 2);
    v_subtotal := v_subtotal + v_line;
    v_tax := v_tax + round(v_line * v_rate / 100, 2);
  end loop;

  v_subtotal := round(v_subtotal, 2);
  v_tax := round(v_tax, 2);
  v_total := v_subtotal + v_tax;
  new.subtotal := v_subtotal;
  new.total_tax := v_tax;
  new.total := v_total::text;
  if new.adjusted_total is null then new.adjusted_total := v_total; end if;
  if new.adjusted_remaining is null then new.adjusted_remaining := greatest(v_total - coalesce(nullif(regexp_replace(coalesce(new.paid::text, '0'), '[^0-9.-]', '', 'g'), '')::numeric, 0), 0); end if;
  return new;
end;
$$;

drop trigger if exists validate_purchase_invoice_totals on public.purchase_invoices;
create trigger validate_purchase_invoice_totals
before insert or update of vendor_id, items
on public.purchase_invoices
for each row execute function public.validate_purchase_invoice_totals();

create or replace function public.protect_posted_purchase_invoice()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.accounting_status = 'posted' then
    raise exception 'POSTED_PURCHASE_INVOICE_IMMUTABLE: %', old.id;
  end if;
  if tg_op = 'UPDATE' and old.accounting_status = 'posted' then
    if new.date is distinct from old.date
       or new.due_date is distinct from old.due_date
       or new.vendor_id is distinct from old.vendor_id
       or new.vendor is distinct from old.vendor
       or new.currency is distinct from old.currency
       or new.items is distinct from old.items
       or new.subtotal is distinct from old.subtotal
       or new.total_tax is distinct from old.total_tax
       or new.total is distinct from old.total
       or new.accounting_status is distinct from old.accounting_status
       or new.accounting_journal_entry_id is distinct from old.accounting_journal_entry_id
       or new.accounting_posted_at is distinct from old.accounting_posted_at then
      raise exception 'POSTED_PURCHASE_INVOICE_IMMUTABLE: %', old.id;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists protect_posted_purchase_invoice on public.purchase_invoices;
create trigger protect_posted_purchase_invoice
before update or delete on public.purchase_invoices
for each row execute function public.protect_posted_purchase_invoice();

create or replace function public.post_purchase_invoice_accounting(p_invoice_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.purchase_invoices%rowtype;
  v_entry_id uuid;
  v_payable_code text;
  v_default_purchase_code text;
  v_input_vat_code text;
  v_item jsonb;
  v_account_code text;
  v_line_amount numeric(14,2);
  v_items_total numeric(14,2) := 0;
  v_total numeric(14,2);
begin
  if not public.accounting_access_allowed(true) then
    raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED';
  end if;
  select * into v_invoice from public.purchase_invoices where id::text = p_invoice_id for update;
  if not found then raise exception 'PURCHASE_INVOICE_NOT_FOUND'; end if;
  if v_invoice.accounting_journal_entry_id is not null then return v_invoice.accounting_journal_entry_id; end if;
  if v_invoice.vendor_id is null then raise exception 'PURCHASE_INVOICE_VENDOR_REQUIRED'; end if;

  select payable_account_code, purchase_account_code, input_vat_account_code
  into v_payable_code, v_default_purchase_code, v_input_vat_code
  from public.accounting_posting_rules
  where rule_code = 'sales_default' and active;
  if not found then raise exception 'PURCHASE_POSTING_RULE_NOT_FOUND'; end if;
  perform public.account_name_for_posting(v_payable_code);
  perform public.account_name_for_posting(v_default_purchase_code);
  perform public.account_name_for_posting(v_input_vat_code);

  v_total := round(v_invoice.subtotal + v_invoice.total_tax, 2);
  if v_total <= 0 then raise exception 'PURCHASE_INVOICE_TOTAL_INVALID'; end if;

  insert into public.accounting_journal_entries(entry_date, reference_type, source_document_table, source_document_id, description, status)
  values (v_invoice.date::date, 'purchase_invoice', 'purchase_invoices', v_invoice.id::text,
    v_invoice.id::text || ' - ' || v_invoice.vendor, 'posted')
  returning id into v_entry_id;

  for v_item in select value from jsonb_array_elements(v_invoice.items)
  loop
    v_line_amount := round(greatest(coalesce((v_item->>'quantity')::numeric, 0) * coalesce((v_item->>'unitPrice')::numeric, 0) - coalesce((v_item->>'discount')::numeric, 0), 0), 2);
    if v_line_amount > 0 then
      v_account_code := coalesce(nullif(v_item->>'accountCode', ''), v_default_purchase_code);
      insert into public.accounting_journal_lines(journal_entry_id, account_code, account_name, debit, credit, counterparty)
      values (v_entry_id, v_account_code, public.account_name_for_posting(v_account_code), v_line_amount, 0, v_invoice.vendor);
      v_items_total := v_items_total + v_line_amount;
    end if;
  end loop;
  if abs(v_items_total - v_invoice.subtotal) > 0.02 then raise exception 'PURCHASE_ITEMS_SUBTOTAL_MISMATCH'; end if;
  if v_invoice.total_tax > 0 then
    insert into public.accounting_journal_lines(journal_entry_id, account_code, account_name, debit, credit, counterparty)
    values (v_entry_id, v_input_vat_code, public.account_name_for_posting(v_input_vat_code), v_invoice.total_tax, 0, v_invoice.vendor);
  end if;
  insert into public.accounting_journal_lines(journal_entry_id, account_code, account_name, debit, credit, counterparty)
  values (v_entry_id, v_payable_code, public.account_name_for_posting(v_payable_code), 0, v_total, v_invoice.vendor);

  if abs((select coalesce(sum(debit), 0) - coalesce(sum(credit), 0) from public.accounting_journal_lines where journal_entry_id = v_entry_id)) > 0.01 then
    raise exception 'PURCHASE_JOURNAL_NOT_BALANCED';
  end if;

  update public.purchase_invoices
  set accounting_status = 'posted', accounting_journal_entry_id = v_entry_id,
      accounting_posted_at = now(), accounting_error = null,
      adjusted_total = coalesce(adjusted_total, v_total),
      adjusted_remaining = greatest(coalesce(adjusted_total, v_total) - coalesce(nullif(regexp_replace(coalesce(paid::text, '0'), '[^0-9.-]', '', 'g'), '')::numeric, 0), 0)
  where id::text = p_invoice_id;
  return v_entry_id;
end;
$$;

create or replace function public.create_and_post_purchase_invoice(p_invoice jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := trim(p_invoice->>'id');
  v_vendor_id text := nullif(trim(p_invoice->>'vendorId'), '');
  v_vendor_name text;
begin
  if not public.accounting_access_allowed(true) then raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED'; end if;
  if v_id is null or v_id = '' then raise exception 'PURCHASE_INVOICE_ID_REQUIRED'; end if;
  select name into v_vendor_name from public.vendors where id = v_vendor_id and status = 'نشط';
  if not found then raise exception 'PURCHASE_INVOICE_VENDOR_INVALID'; end if;

  insert into public.purchase_invoices(id, vendor_id, vendor, date, due_date, po_number,
    reference_no, notes, cost_center, cost_center_name, status, total, paid, remaining,
    currency, items)
  values (v_id, v_vendor_id, v_vendor_name, (p_invoice->>'date')::date,
    nullif(p_invoice->>'dueDate', '')::date, nullif(p_invoice->>'poNumber', ''),
    nullif(p_invoice->>'referenceNo', ''), nullif(p_invoice->>'notes', ''),
    coalesce(nullif(p_invoice->>'costCenter', ''), 'بدون مركز تكلفة'),
    nullif(p_invoice->>'costCenterName', ''), 'مفتوحة', '0', '0.00', '0.00', 'SAR',
    coalesce(p_invoice->'items', '[]'::jsonb));

  perform public.post_purchase_invoice_accounting(v_id);
  return v_id;
end;
$$;

create sequence if not exists public.purchase_payment_number_seq start with 1;
create table if not exists public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique default ('VP-' || lpad(nextval('public.purchase_payment_number_seq')::text, 8, '0')),
  invoice_id text not null references public.purchase_invoices(id) on delete restrict,
  vendor_id text not null references public.vendors(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text not null,
  reference text,
  withdrawal_account_code text not null references public.accounting_accounts(code) on update restrict on delete restrict,
  journal_entry_id uuid not null unique references public.accounting_journal_entries(id) on delete restrict,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists purchase_payments_invoice_idx on public.purchase_payments(invoice_id, payment_date, created_at);
create index if not exists purchase_payments_vendor_idx on public.purchase_payments(vendor_id, payment_date, created_at);

create or replace function public.record_purchase_payment(
  p_invoice_id text,
  p_amount numeric,
  p_payment_method text,
  p_reference text default null,
  p_payment_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.purchase_invoices%rowtype;
  v_payment_id uuid := gen_random_uuid();
  v_entry_id uuid;
  v_payable_code text;
  v_cash_code text;
  v_effective_total numeric(14,2);
  v_paid numeric(14,2);
  v_next_paid numeric(14,2);
begin
  if not public.accounting_access_allowed(true) then raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED'; end if;
  select * into v_invoice from public.purchase_invoices where id::text = p_invoice_id for update;
  if not found or v_invoice.accounting_status <> 'posted' or v_invoice.accounting_journal_entry_id is null then raise exception 'POSTED_PURCHASE_INVOICE_REQUIRED'; end if;
  if p_amount is null or round(p_amount, 2) <= 0 then raise exception 'PURCHASE_PAYMENT_AMOUNT_INVALID'; end if;
  if p_payment_date is null then raise exception 'PURCHASE_PAYMENT_DATE_REQUIRED'; end if;
  if nullif(trim(p_payment_method), '') is null
     or trim(p_payment_method) not in ('نقدي', 'شيك', 'تحويل بنكي', 'بطاقة ائتمانية') then
    raise exception 'PURCHASE_PAYMENT_METHOD_INVALID';
  end if;

  select payable_account_code into v_payable_code from public.accounting_posting_rules where rule_code = 'sales_default' and active;
  if not found or v_payable_code is null then raise exception 'PURCHASE_POSTING_RULE_NOT_FOUND'; end if;
  v_cash_code := case trim(p_payment_method) when 'نقدي' then '1111' when 'شيك' then '1112' else '1113' end;
  perform public.account_name_for_posting(v_payable_code);
  perform public.account_name_for_posting(v_cash_code);

  v_effective_total := round(coalesce(v_invoice.adjusted_total, v_invoice.subtotal + v_invoice.total_tax), 2);
  v_paid := coalesce(nullif(regexp_replace(coalesce(v_invoice.paid::text, '0'), '[^0-9.-]', '', 'g'), '')::numeric, 0);
  v_next_paid := round(v_paid + p_amount, 2);
  if v_next_paid > v_effective_total + 0.01 then raise exception 'PURCHASE_PAYMENT_EXCEEDS_REMAINING'; end if;

  insert into public.accounting_journal_entries(entry_date, reference_type, source_document_table, source_document_id, description, status)
  values (p_payment_date, 'purchase_payment', 'purchase_payments', v_payment_id::text,
    'سداد مورد - ' || v_invoice.id::text || ' - ' || v_invoice.vendor, 'posted')
  returning id into v_entry_id;
  insert into public.accounting_journal_lines(journal_entry_id, account_code, account_name, debit, credit, counterparty)
  values (v_entry_id, v_payable_code, public.account_name_for_posting(v_payable_code), p_amount, 0, v_invoice.vendor),
         (v_entry_id, v_cash_code, public.account_name_for_posting(v_cash_code), 0, p_amount, v_invoice.vendor);

  insert into public.purchase_payments(id, invoice_id, vendor_id, amount, payment_date,
    payment_method, reference, withdrawal_account_code, journal_entry_id)
  values (v_payment_id, v_invoice.id::text, v_invoice.vendor_id, round(p_amount, 2), p_payment_date,
    trim(p_payment_method), nullif(trim(p_reference), ''), v_cash_code, v_entry_id);

  update public.purchase_invoices
  set paid = v_next_paid::text,
      remaining = greatest(v_effective_total - v_next_paid, 0)::text,
      adjusted_remaining = greatest(v_effective_total - v_next_paid, 0),
      status = case when v_next_paid >= v_effective_total - 0.01 then 'مدفوعة بالكامل' else 'مدفوعة جزئياً' end
  where id::text = p_invoice_id;
  return v_payment_id;
end;
$$;

create or replace function public.require_posted_purchase_for_debit_note()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.note_type = 'purchase_debit' and not exists (
    select 1 from public.purchase_invoices
    where id::text = new.original_invoice_id
      and accounting_status = 'posted'
      and accounting_journal_entry_id is not null
  ) then
    raise exception 'POSTED_PURCHASE_INVOICE_REQUIRED_FOR_DEBIT_NOTE';
  end if;
  return new;
end;
$$;

drop trigger if exists require_posted_purchase_for_debit_note on public.invoice_adjustment_notes;
create trigger require_posted_purchase_for_debit_note
before insert on public.invoice_adjustment_notes
for each row execute function public.require_posted_purchase_for_debit_note();

create or replace function public.require_accounting_access_for_adjustment_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.accounting_access_allowed(true) then
    raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists require_accounting_access_for_adjustment_note on public.invoice_adjustment_notes;
create trigger require_accounting_access_for_adjustment_note
before insert on public.invoice_adjustment_notes
for each row execute function public.require_accounting_access_for_adjustment_note();

-- The existing adjustment RPC must update protected purchase balance columns.
-- Its insert is guarded by the accounting-permission trigger above.
alter function public.post_invoice_adjustment_note(text, text, text, text, text, date, numeric, numeric, numeric, jsonb)
  security definer;
revoke all on function public.post_invoice_adjustment_note(text, text, text, text, text, date, numeric, numeric, numeric, jsonb) from public;
grant execute on function public.post_invoice_adjustment_note(text, text, text, text, text, date, numeric, numeric, numeric, jsonb) to authenticated;
revoke all on function public.require_accounting_access_for_adjustment_note() from public;

alter table public.purchase_invoices enable row level security;
drop policy if exists purchase_invoices_authenticated_select on public.purchase_invoices;
create policy purchase_invoices_authenticated_select
on public.purchase_invoices for select to authenticated
using (auth.uid() is not null);
drop policy if exists purchase_invoices_authenticated_update on public.purchase_invoices;
create policy purchase_invoices_authenticated_update
on public.purchase_invoices for update to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);
drop policy if exists purchase_invoices_authenticated_delete on public.purchase_invoices;
create policy purchase_invoices_authenticated_delete
on public.purchase_invoices for delete to authenticated
using (auth.uid() is not null);

-- Clients may edit draft descriptive fields, but payment and accounting columns are
-- writable only by the SECURITY DEFINER posting/payment functions above.
revoke insert, update on public.purchase_invoices from anon, authenticated;
grant select, delete on public.purchase_invoices to authenticated;
grant update (vendor_id, vendor, date, due_date, po_number, reference_no, notes,
  cost_center, cost_center_name, items) on public.purchase_invoices to authenticated;

alter table public.purchase_payments enable row level security;
create policy purchase_payments_select_authorized
on public.purchase_payments for select to authenticated
using (public.accounting_access_allowed(false));

grant select on public.purchase_payments to authenticated;
revoke all on function public.post_purchase_invoice_accounting(text) from public;
revoke all on function public.create_and_post_purchase_invoice(jsonb) from public;
revoke all on function public.record_purchase_payment(text, numeric, text, text, date) from public;
grant execute on function public.post_purchase_invoice_accounting(text) to authenticated;
grant execute on function public.create_and_post_purchase_invoice(jsonb) to authenticated;
grant execute on function public.record_purchase_payment(text, numeric, text, text, date) to authenticated;
