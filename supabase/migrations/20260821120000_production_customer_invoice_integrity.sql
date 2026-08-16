create sequence if not exists public.customer_number_seq start with 1;
create sequence if not exists public.vendor_number_seq start with 1;

alter table public.customers
  add column if not exists customer_number text,
  add column if not exists commercial_registration text;

alter table public.vendors
  add column if not exists vendor_number text,
  add column if not exists commercial_registration text;

alter table public.customers
  alter column customer_number set default
    ('CUS-' || lpad(nextval('public.customer_number_seq')::text, 6, '0'));

alter table public.vendors
  alter column vendor_number set default
    ('VEN-' || lpad(nextval('public.vendor_number_seq')::text, 6, '0'));

update public.customers
set customer_number = 'CUS-' || lpad(nextval('public.customer_number_seq')::text, 6, '0')
where customer_number is null or btrim(customer_number) = '';

update public.vendors
set vendor_number = 'VEN-' || lpad(nextval('public.vendor_number_seq')::text, 6, '0')
where vendor_number is null or btrim(vendor_number) = '';

alter table public.customers
  alter column customer_number set not null,
  drop constraint if exists customers_commercial_registration_check,
  add constraint customers_commercial_registration_check
    check (
      commercial_registration is null
      or commercial_registration = ''
      or commercial_registration ~ '^[0-9]{10,15}$'
    );

alter table public.vendors
  alter column vendor_number set not null,
  drop constraint if exists vendors_commercial_registration_check,
  add constraint vendors_commercial_registration_check
    check (
      commercial_registration is null
      or commercial_registration = ''
      or commercial_registration ~ '^[0-9]{10,15}$'
    );

alter table public.customers
  drop constraint if exists customers_building_number_check,
  add constraint customers_building_number_check
    check (building_number is null or building_number = '' or building_number ~ '^[0-9]{4}$'),
  drop constraint if exists customers_postal_code_check,
  add constraint customers_postal_code_check
    check (postal_code is null or postal_code = '' or postal_code ~ '^[0-9]{5}$');

create unique index if not exists customers_customer_number_uidx
  on public.customers(customer_number);
create unique index if not exists vendors_vendor_number_uidx
  on public.vendors(vendor_number);

alter table public.sales_invoices
  add column if not exists customer_id uuid,
  add column if not exists buyer_commercial_registration text;

alter table public.sales_invoices
  drop constraint if exists sales_invoices_customer_id_fkey,
  add constraint sales_invoices_customer_id_fkey
    foreign key (customer_id) references public.customers(id) on delete restrict,
  drop constraint if exists sales_invoices_buyer_cr_check,
  add constraint sales_invoices_buyer_cr_check
    check (
      invoice_type <> 'standard'
      or buyer_commercial_registration ~ '^[0-9]{10,15}$'
    );

alter table public.invoice_adjustment_notes
  add column if not exists reason text;

update public.invoice_adjustment_notes
set reason = case
  when note_type = 'sales_credit' then 'تخفيض قيمة الفاتورة الأصلية'
  when note_type = 'sales_debit' then 'زيادة قيمة الفاتورة الأصلية'
  else 'تعديل على المستند الأصلي'
end
where reason is null or btrim(reason) = '';

alter table public.invoice_adjustment_notes
  alter column reason set default 'تعديل على المستند الأصلي',
  alter column reason set not null;

comment on column public.customers.customer_number is
  'Human-readable customer number. UUID id remains the internal relational key.';
comment on column public.sales_invoices.buyer_commercial_registration is
  'Buyer commercial registration used as BT-46/CRN on standard B2B invoices.';
comment on column public.invoice_adjustment_notes.reason is
  'Actual business reason transmitted on ZATCA credit/debit notes.';

create or replace function public.validate_sales_invoice_totals()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_item jsonb;
  v_quantity numeric;
  v_unit_price numeric;
  v_discount numeric;
  v_tax_percent numeric;
  v_net numeric := 0;
  v_tax numeric := 0;
  v_total numeric;
begin
  if jsonb_typeof(coalesce(new.items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(new.items, '[]'::jsonb)) = 0 then
    raise exception 'SALES_INVOICE_ITEMS_REQUIRED';
  end if;

  for v_item in select value from jsonb_array_elements(new.items)
  loop
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);
    v_unit_price := coalesce((v_item->>'unitPrice')::numeric, 0);
    v_discount := coalesce((v_item->>'discount')::numeric, 0);
    v_tax_percent := coalesce((v_item->>'taxPercent')::numeric, 15);
    if v_quantity <= 0 or v_unit_price < 0 or v_discount < 0
       or v_discount > v_quantity * v_unit_price then
      raise exception 'INVALID_SALES_INVOICE_LINE';
    end if;
    v_net := v_net + (v_quantity * v_unit_price - v_discount);
    v_tax := v_tax + ((v_quantity * v_unit_price - v_discount) * v_tax_percent / 100);
  end loop;

  v_total := coalesce(
    nullif(regexp_replace(new.total::text, '[^0-9.-]', '', 'g'), '')::numeric,
    0
  );
  if abs(coalesce(new.subtotal, 0) - v_net) > 0.01
     or abs(coalesce(new.total_tax, 0) - v_tax) > 0.01
     or abs(v_total - (v_net + v_tax)) > 0.01 then
    raise exception 'SALES_INVOICE_TOTALS_DO_NOT_MATCH_LINES';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_sales_invoice_totals_trigger
  on public.sales_invoices;
create trigger validate_sales_invoice_totals_trigger
before insert or update of items, subtotal, total_tax, total
on public.sales_invoices
for each row execute function public.validate_sales_invoice_totals();

update public.accounting_accounts
set company_name = 'شركة إدارة العياف للمقاولات'
where company_name = 'شركة العياف التجارية';

insert into public.accounting_accounts (
  code, company_name, name_ar, name_en, parent_code, cash_flow_type,
  account_type, level, enable_payments, is_system
) values (
  '111', 'شركة إدارة العياف للمقاولات', 'البنك والنقدية',
  'Bank and Cash', null, 'التشغيليات', 'الأصول', 2, true, true
)
on conflict (code) do update
set company_name = excluded.company_name,
    name_ar = excluded.name_ar,
    name_en = excluded.name_en,
    enable_payments = true,
    is_system = true;

create sequence if not exists public.customer_payment_number_seq start with 1;

create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique default
    ('RCPT-' || lpad(nextval('public.customer_payment_number_seq')::text, 6, '0')),
  invoice_id text not null references public.sales_invoices(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text not null,
  reference text,
  journal_entry_id uuid not null unique references public.accounting_journal_entries(id) on delete restrict,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.customer_payments enable row level security;
revoke all on public.customer_payments from anon, authenticated;
grant select on public.customer_payments to authenticated;

drop policy if exists customer_payments_select_authenticated
  on public.customer_payments;
create policy customer_payments_select_authenticated
  on public.customer_payments for select to authenticated
  using (true);

create or replace function public.record_customer_payment(
  p_invoice_id text,
  p_amount numeric,
  p_payment_method text,
  p_reference text default null
)
returns table (
  payment_id uuid,
  payment_number text,
  journal_entry_id uuid,
  paid numeric,
  remaining numeric,
  invoice_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.sales_invoices%rowtype;
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_remaining numeric(14,2);
  v_next_paid numeric(14,2);
  v_next_remaining numeric(14,2);
  v_status text;
  v_payment_id uuid := gen_random_uuid();
  v_entry_id uuid := gen_random_uuid();
  v_payment_number text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'PAYMENT_AMOUNT_MUST_BE_POSITIVE';
  end if;
  if nullif(btrim(p_payment_method), '') is null then
    raise exception 'PAYMENT_METHOD_REQUIRED';
  end if;

  select * into v_invoice
  from public.sales_invoices
  where id = p_invoice_id
  for update;
  if not found then raise exception 'SALES_INVOICE_NOT_FOUND'; end if;

  v_total := coalesce(
    v_invoice.adjusted_total,
    nullif(regexp_replace(v_invoice.total::text, '[^0-9.-]', '', 'g'), '')::numeric,
    0
  );
  v_paid := coalesce(
    nullif(regexp_replace(v_invoice.paid::text, '[^0-9.-]', '', 'g'), '')::numeric,
    0
  );
  v_remaining := greatest(v_total - v_paid, 0);
  if p_amount > v_remaining then
    raise exception 'PAYMENT_EXCEEDS_REMAINING_BALANCE';
  end if;

  v_next_paid := v_paid + p_amount;
  v_next_remaining := greatest(v_total - v_next_paid, 0);
  v_status := case
    when v_next_remaining = 0 then 'مدفوعة بالكامل'
    when v_next_paid > 0 then 'مدفوعة جزئياً'
    else 'مفتوحة'
  end;

  insert into public.accounting_journal_entries (
    id, entry_date, reference_type, source_document_table,
    source_document_id, description, status
  ) values (
    v_entry_id, current_date, 'customer_payment', 'customer_payments',
    v_payment_id::text, 'سند قبض للفاتورة ' || p_invoice_id, 'posted'
  );

  insert into public.accounting_journal_lines (
    journal_entry_id, account_code, account_name, debit, credit, counterparty
  ) values
    (
      v_entry_id, '111', public.account_name_for_posting('111'),
      p_amount, 0, v_invoice.customer
    ),
    (
      v_entry_id, '112', public.account_name_for_posting('112'),
      0, p_amount, v_invoice.customer
    );

  insert into public.customer_payments (
    id, invoice_id, customer_id, amount, payment_method,
    reference, journal_entry_id, created_by
  ) values (
    v_payment_id, p_invoice_id, v_invoice.customer_id, p_amount,
    btrim(p_payment_method), nullif(btrim(p_reference), ''),
    v_entry_id, auth.uid()
  )
  returning customer_payments.payment_number into v_payment_number;

  update public.sales_invoices
  set paid = 'ريال ' || round(v_next_paid, 2)::text,
      remaining = 'ريال ' || round(v_next_remaining, 2)::text,
      adjusted_remaining = case
        when adjusted_total is not null then v_next_remaining
        else adjusted_remaining
      end,
      status = v_status
  where id = p_invoice_id;

  return query select
    v_payment_id, v_payment_number, v_entry_id,
    v_next_paid, v_next_remaining, v_status;
end;
$$;

revoke all on function public.record_customer_payment(text, numeric, text, text)
  from public, anon;
grant execute on function public.record_customer_payment(text, numeric, text, text)
  to authenticated;

comment on table public.customer_payments is
  'Immutable customer receipts. Each payment posts debit to bank/cash and credit to accounts receivable.';

alter function public.post_sales_invoice_accounting(text) security definer;
alter function public.post_invoice_adjustment_note(
  text, text, text, text, text, date, numeric, numeric, numeric, jsonb
) security definer;

drop policy if exists accounting_journal_entries_authenticated
  on public.accounting_journal_entries;
drop policy if exists accounting_journal_lines_authenticated
  on public.accounting_journal_lines;

drop policy if exists accounting_journal_entries_select_authenticated
  on public.accounting_journal_entries;
create policy accounting_journal_entries_select_authenticated
  on public.accounting_journal_entries for select to authenticated
  using (true);

drop policy if exists accounting_journal_lines_select_authenticated
  on public.accounting_journal_lines;
create policy accounting_journal_lines_select_authenticated
  on public.accounting_journal_lines for select to authenticated
  using (true);

revoke insert, update, delete on public.accounting_journal_entries
  from authenticated;
revoke insert, update, delete on public.accounting_journal_lines
  from authenticated;
grant select on public.accounting_journal_entries to authenticated;
grant select on public.accounting_journal_lines to authenticated;

create or replace function public.protect_posted_sales_invoice()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.accounting_status = 'posted' then
      raise exception 'لا يمكن حذف فاتورة مُرحّلة محاسبياً؛ استخدم إشعاراً دائناً لعكسها';
    end if;
    return old;
  end if;

  if old.accounting_status = 'posted' and (
    new.date is distinct from old.date
    or new.due_date is distinct from old.due_date
    or new.customer_id is distinct from old.customer_id
    or new.customer is distinct from old.customer
    or new.customer_address is distinct from old.customer_address
    or new.items is distinct from old.items
    or new.subtotal is distinct from old.subtotal
    or new.total_tax is distinct from old.total_tax
    or new.total is distinct from old.total
    or new.invoice_type is distinct from old.invoice_type
    or new.buyer_vat is distinct from old.buyer_vat
    or new.buyer_commercial_registration is distinct from old.buyer_commercial_registration
  ) then
    raise exception 'لا يمكن تعديل البيانات القانونية أو المالية لفاتورة مُرحّلة؛ استخدم إشعاراً دائناً أو مديناً';
  end if;

  return new;
end;
$$;
