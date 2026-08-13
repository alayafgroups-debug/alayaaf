-- Connect sales invoices and adjustment notes to the chart of accounts.
-- Existing documents are preserved and are not posted retroactively.

create table if not exists public.accounting_accounts (
  code text primary key,
  company_name text not null,
  name_ar text not null,
  name_en text not null default '',
  parent_code text,
  cash_flow_type text not null default '',
  account_type text not null default '',
  level integer not null default 0,
  enable_payments boolean not null default false,
  show_expense_claims boolean not null default false,
  is_main_category boolean not null default false,
  category_color text,
  currency_badge text,
  is_system boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.accounting_accounts (
  code, company_name, name_ar, name_en, parent_code, cash_flow_type,
  account_type, level, is_system
) values
  ('112', 'شركة العياف التجارية', 'الذمم', 'Receivables', '11', 'التشغيليات', 'التشغيليات', 2, true),
  ('2111', 'شركة العياف التجارية', 'ضريبة القيمة المضافة على المشتريات', 'Input VAT', '21', 'التشغيليات', 'التشغيليات', 2, true),
  ('2112', 'شركة العياف التجارية', 'ذمم الموردين المستحقة', 'Accounts Payable', '21', 'التشغيليات', 'التشغيليات', 2, true),
  ('219', 'شركة العياف التجارية', 'ضريبة المبيعات المستحقة', 'Accrued Sales Tax', '21', 'التشغيليات', 'التشغيليات', 2, true),
  ('411', 'شركة العياف التجارية', 'إيرادات المبيعات والخدمات', 'Sales and Services Revenue', '41', 'التشغيليات', 'التشغيليات', 2, true),
  ('511', 'شركة العياف التجارية', 'المشتريات والمصروفات', 'Purchases and Expenses', '51', 'التشغيليات', 'التشغيليات', 2, true)
on conflict (code) do nothing;

create table if not exists public.invoice_adjustment_notes (
  id uuid primary key default gen_random_uuid(),
  note_number text not null unique,
  note_type text not null check (note_type in ('sales_credit', 'sales_debit', 'purchase_debit')),
  original_invoice_table text not null check (original_invoice_table in ('sales_invoices', 'purchase_invoices')),
  original_invoice_id text not null,
  counterparty text not null,
  currency text not null default 'SAR',
  issue_date date not null,
  subtotal numeric(14,2) not null check (subtotal >= 0),
  tax numeric(14,2) not null check (tax >= 0),
  total numeric(14,2) not null check (total > 0),
  items jsonb not null default '[]'::jsonb,
  status text not null default 'posted' check (status in ('draft', 'posted', 'cancelled')),
  balance_before numeric(14,2) not null,
  balance_after numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoice_adjustment_original
  on public.invoice_adjustment_notes(original_invoice_table, original_invoice_id);

create table if not exists public.accounting_journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  reference_type text not null,
  reference_id uuid unique references public.invoice_adjustment_notes(id) on delete restrict,
  source_document_table text,
  source_document_id text,
  description text not null,
  status text not null default 'posted' check (status in ('draft', 'posted', 'reversed')),
  created_at timestamptz not null default now()
);

alter table public.accounting_journal_entries
  alter column reference_id drop not null,
  add column if not exists source_document_table text,
  add column if not exists source_document_id text;

update public.accounting_journal_entries
set source_document_table = 'invoice_adjustment_notes',
    source_document_id = reference_id::text
where source_document_table is null and reference_id is not null;

create unique index if not exists accounting_journal_source_uidx
  on public.accounting_journal_entries(source_document_table, source_document_id)
  where source_document_table is not null and source_document_id is not null;

create table if not exists public.accounting_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.accounting_journal_entries(id) on delete restrict,
  account_code text not null,
  account_name text not null,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  counterparty text,
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create index if not exists accounting_journal_lines_entry_idx
  on public.accounting_journal_lines(journal_entry_id);
create index if not exists accounting_journal_lines_account_idx
  on public.accounting_journal_lines(account_code);

create table if not exists public.accounting_posting_rules (
  rule_code text primary key,
  company_name text not null default 'شركة العياف التجارية',
  receivable_account_code text not null,
  revenue_account_code text not null,
  output_vat_account_code text not null,
  payable_account_code text not null default '2112',
  purchase_account_code text not null default '511',
  input_vat_account_code text not null default '2111',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.accounting_posting_rules
  add column if not exists payable_account_code text not null default '2112',
  add column if not exists purchase_account_code text not null default '511',
  add column if not exists input_vat_account_code text not null default '2111';

insert into public.accounting_posting_rules (
  rule_code, receivable_account_code, revenue_account_code, output_vat_account_code,
  payable_account_code, purchase_account_code, input_vat_account_code
) values ('sales_default', '112', '411', '219', '2112', '511', '2111')
on conflict (rule_code) do nothing;

alter table public.sales_invoices
  add column if not exists accounting_status text not null default 'unposted',
  add column if not exists accounting_journal_entry_id uuid references public.accounting_journal_entries(id) on delete restrict,
  add column if not exists accounting_posted_at timestamptz,
  add column if not exists accounting_error text,
  add column if not exists invoice_type text not null default 'standard',
  add column if not exists buyer_vat text,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists subtotal numeric(14,2) not null default 0,
  add column if not exists total_tax numeric(14,2) not null default 0,
  add column if not exists adjustment_total numeric(14,2) not null default 0,
  add column if not exists adjusted_total numeric(14,2),
  add column if not exists adjusted_remaining numeric(14,2);

alter table public.invoice_adjustment_notes
  add column if not exists accounting_status text not null default 'unposted',
  add column if not exists accounting_journal_entry_id uuid references public.accounting_journal_entries(id) on delete restrict,
  add column if not exists accounting_posted_at timestamptz,
  add column if not exists accounting_error text;

update public.invoice_adjustment_notes n
set accounting_status = 'posted',
    accounting_journal_entry_id = j.id,
    accounting_posted_at = coalesce(n.accounting_posted_at, j.created_at),
    accounting_error = null
from public.accounting_journal_entries j
where j.reference_id = n.id
  and n.accounting_journal_entry_id is null;

create or replace function public.account_name_for_posting(p_account_code text)
returns text
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_name text;
begin
  select name_ar into v_name
  from public.accounting_accounts
  where code = p_account_code
  limit 1;

  if v_name is null then
    raise exception 'الحساب المحاسبي % غير موجود في شجرة الحسابات', p_account_code;
  end if;
  if exists (
    select 1 from public.accounting_accounts where parent_code = p_account_code
  ) then
    raise exception 'الحساب % تجميعي ولا يقبل الترحيل المباشر', p_account_code;
  end if;

  return v_name;
end;
$$;

create or replace function public.post_sales_invoice_accounting(p_invoice_id text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice public.sales_invoices%rowtype;
  v_entry_id uuid;
  v_receivable_code text;
  v_default_revenue_code text;
  v_vat_code text;
  v_total numeric(14,2);
  v_subtotal numeric(14,2);
  v_tax numeric(14,2);
  v_items_total numeric(14,2) := 0;
  v_item jsonb;
  v_line_amount numeric(14,2);
  v_account_code text;
begin
  select * into v_invoice
  from public.sales_invoices
  where id::text = p_invoice_id
  for update;

  if not found then
    raise exception 'فاتورة المبيعات غير موجودة';
  end if;

  if v_invoice.accounting_journal_entry_id is not null then
    return v_invoice.accounting_journal_entry_id;
  end if;

  select receivable_account_code, revenue_account_code, output_vat_account_code
  into v_receivable_code, v_default_revenue_code, v_vat_code
  from public.accounting_posting_rules
  where rule_code = 'sales_default' and active = true;

  if not found then
    raise exception 'قاعدة ترحيل المبيعات غير مفعلة';
  end if;

  perform public.account_name_for_posting(v_receivable_code);
  perform public.account_name_for_posting(v_default_revenue_code);
  perform public.account_name_for_posting(v_vat_code);

  v_subtotal := round(coalesce(v_invoice.subtotal, 0), 2);
  v_tax := round(coalesce(v_invoice.total_tax, 0), 2);
  v_total := round(v_subtotal + v_tax, 2);

  if v_total <= 0 then
    raise exception 'إجمالي الفاتورة يجب أن يكون أكبر من صفر';
  end if;

  insert into public.accounting_journal_entries (
    entry_date, reference_type, reference_id, source_document_table,
    source_document_id, description, status
  ) values (
    v_invoice.date::date, 'sales_invoice', null, 'sales_invoices',
    v_invoice.id::text, v_invoice.id::text || ' - ' || coalesce(v_invoice.customer, ''), 'posted'
  )
  returning id into v_entry_id;

  insert into public.accounting_journal_lines (
    journal_entry_id, account_code, account_name, debit, credit, counterparty
  ) values (
    v_entry_id, v_receivable_code, public.account_name_for_posting(v_receivable_code),
    v_total, 0, v_invoice.customer
  );

  for v_item in select value from jsonb_array_elements(coalesce(v_invoice.items, '[]'::jsonb))
  loop
    v_line_amount := round(
      greatest(
        coalesce((v_item->>'quantity')::numeric, 0) * coalesce((v_item->>'unitPrice')::numeric, 0)
          - coalesce((v_item->>'discount')::numeric, 0),
        0
      ),
      2
    );
    if v_line_amount > 0 then
      v_account_code := coalesce(nullif(v_item->>'accountCode', ''), v_default_revenue_code);
      insert into public.accounting_journal_lines (
        journal_entry_id, account_code, account_name, debit, credit, counterparty
      ) values (
        v_entry_id, v_account_code, public.account_name_for_posting(v_account_code),
        0, v_line_amount, v_invoice.customer
      );
      v_items_total := v_items_total + v_line_amount;
    end if;
  end loop;

  if v_items_total = 0 and v_subtotal > 0 then
    insert into public.accounting_journal_lines (
      journal_entry_id, account_code, account_name, debit, credit, counterparty
    ) values (
      v_entry_id, v_default_revenue_code, public.account_name_for_posting(v_default_revenue_code),
      0, v_subtotal, v_invoice.customer
    );
    v_items_total := v_subtotal;
  end if;

  if abs(v_items_total - v_subtotal) > 0.02 then
    raise exception 'مجموع بنود الإيراد لا يطابق المجموع الفرعي للفاتورة';
  end if;

  if v_tax > 0 then
    insert into public.accounting_journal_lines (
      journal_entry_id, account_code, account_name, debit, credit, counterparty
    ) values (
      v_entry_id, v_vat_code, public.account_name_for_posting(v_vat_code),
      0, v_tax, v_invoice.customer
    );
  end if;

  if abs((
    select coalesce(sum(debit), 0) - coalesce(sum(credit), 0)
    from public.accounting_journal_lines
    where journal_entry_id = v_entry_id
  )) > 0.01 then
    raise exception 'القيد المحاسبي للفاتورة غير متوازن';
  end if;

  update public.sales_invoices
  set accounting_status = 'posted',
      accounting_journal_entry_id = v_entry_id,
      accounting_posted_at = now(),
      accounting_error = null
  where id::text = p_invoice_id;

  return v_entry_id;
end;
$$;

create or replace function public.post_new_sales_invoice_accounting()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  begin
    perform public.post_sales_invoice_accounting(new.id::text);
  exception when others then
    update public.sales_invoices
    set accounting_status = 'failed',
        accounting_error = sqlerrm
    where id::text = new.id::text;
  end;
  return new;
end;
$$;

drop trigger if exists post_new_sales_invoice_accounting on public.sales_invoices;
create trigger post_new_sales_invoice_accounting
after insert on public.sales_invoices
for each row execute function public.post_new_sales_invoice_accounting();

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
    or new.customer is distinct from old.customer
    or new.items is distinct from old.items
    or new.subtotal is distinct from old.subtotal
    or new.total_tax is distinct from old.total_tax
    or new.total is distinct from old.total
    or new.invoice_type is distinct from old.invoice_type
    or new.buyer_vat is distinct from old.buyer_vat
  ) then
    raise exception 'لا يمكن تعديل البيانات المالية لفاتورة مُرحّلة؛ استخدم إشعاراً دائناً أو مديناً';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_posted_sales_invoice on public.sales_invoices;
create trigger protect_posted_sales_invoice
before update or delete on public.sales_invoices
for each row execute function public.protect_posted_sales_invoice();

create or replace function public.post_invoice_adjustment_note(
  p_note_number text,
  p_note_type text,
  p_original_invoice_id text,
  p_counterparty text,
  p_currency text,
  p_issue_date date,
  p_subtotal numeric,
  p_tax numeric,
  p_total numeric,
  p_items jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_note_id uuid;
  v_entry_id uuid;
  v_existing_note_id uuid;
  v_existing_note_type text;
  v_existing_invoice_id text;
  v_invoice_table text;
  v_base_total numeric;
  v_paid numeric;
  v_old_adjustment numeric;
  v_signed_amount numeric;
  v_before numeric;
  v_after numeric;
  v_receivable_code text;
  v_default_revenue_code text;
  v_vat_code text;
  v_item jsonb;
  v_line_amount numeric(14,2);
  v_items_total numeric(14,2) := 0;
  v_account_code text;
  v_original_journal_id uuid;
  v_payable_code text;
  v_default_purchase_code text;
  v_input_vat_code text;
begin
  if p_note_type not in ('sales_credit', 'sales_debit', 'purchase_debit') then
    raise exception 'نوع الإشعار غير مدعوم';
  end if;
  if p_total <= 0 or abs((p_subtotal + p_tax) - p_total) > 0.02 then
    raise exception 'إجماليات الإشعار غير صحيحة';
  end if;

  select id, note_type, original_invoice_id
  into v_existing_note_id, v_existing_note_type, v_existing_invoice_id
  from public.invoice_adjustment_notes
  where note_number = p_note_number;
  if v_existing_note_id is not null then
    if v_existing_note_type <> p_note_type or v_existing_invoice_id <> p_original_invoice_id then
      raise exception 'رقم الإشعار مستخدم لمستند آخر';
    end if;
    return v_existing_note_id;
  end if;

  v_invoice_table := case when p_note_type in ('sales_credit', 'sales_debit') then 'sales_invoices' else 'purchase_invoices' end;
  v_signed_amount := case when p_note_type = 'sales_debit' then p_total else -p_total end;

  if v_invoice_table = 'sales_invoices' then
    select
      coalesce(nullif(regexp_replace(coalesce(total::text, ''), '[^0-9.-]', '', 'g'), '')::numeric, 0),
      coalesce(nullif(regexp_replace(coalesce(paid::text, ''), '[^0-9.-]', '', 'g'), '')::numeric, 0),
      coalesce(adjustment_total, 0),
      accounting_journal_entry_id
    into v_base_total, v_paid, v_old_adjustment, v_original_journal_id
    from public.sales_invoices where id::text = p_original_invoice_id for update;
  else
    select
      coalesce(nullif(regexp_replace(coalesce(total::text, ''), '[^0-9.-]', '', 'g'), '')::numeric, 0),
      coalesce(nullif(regexp_replace(coalesce(paid::text, ''), '[^0-9.-]', '', 'g'), '')::numeric, 0),
      coalesce(adjustment_total, 0)
    into v_base_total, v_paid, v_old_adjustment
    from public.purchase_invoices where id::text = p_original_invoice_id for update;
  end if;

  if not found then raise exception 'الفاتورة الأصلية غير موجودة'; end if;
  if v_invoice_table = 'sales_invoices' and v_original_journal_id is null then
    raise exception 'يجب ترحيل الفاتورة الأصلية محاسبياً قبل إنشاء إشعار التعديل';
  end if;

  v_before := v_base_total + v_old_adjustment;
  v_after := v_before + v_signed_amount;
  if v_after < 0 then raise exception 'قيمة الإشعار تتجاوز قيمة الفاتورة الأصلية'; end if;

  select
    receivable_account_code, revenue_account_code, output_vat_account_code,
    payable_account_code, purchase_account_code, input_vat_account_code
  into
    v_receivable_code, v_default_revenue_code, v_vat_code,
    v_payable_code, v_default_purchase_code, v_input_vat_code
  from public.accounting_posting_rules
  where rule_code = 'sales_default' and active = true;

  if not found then raise exception 'قاعدة الترحيل المحاسبي غير مفعلة'; end if;
  if p_note_type in ('sales_credit', 'sales_debit') then
    perform public.account_name_for_posting(v_receivable_code);
    perform public.account_name_for_posting(v_default_revenue_code);
    perform public.account_name_for_posting(v_vat_code);
  else
    perform public.account_name_for_posting(v_payable_code);
    perform public.account_name_for_posting(v_default_purchase_code);
    perform public.account_name_for_posting(v_input_vat_code);
  end if;

  insert into public.invoice_adjustment_notes (
    note_number, note_type, original_invoice_table, original_invoice_id, counterparty,
    currency, issue_date, subtotal, tax, total, items, status, balance_before, balance_after,
    accounting_status
  ) values (
    p_note_number, p_note_type, v_invoice_table, p_original_invoice_id, p_counterparty,
    coalesce(nullif(p_currency, ''), 'SAR'), p_issue_date, p_subtotal, p_tax, p_total,
    coalesce(p_items, '[]'::jsonb), 'posted', v_before, v_after, 'unposted'
  ) returning id into v_note_id;

  if v_invoice_table = 'sales_invoices' then
    update public.sales_invoices set
      adjustment_total = v_old_adjustment + v_signed_amount,
      adjusted_total = v_after,
      adjusted_remaining = greatest(v_after - v_paid, 0),
      status = case
        when greatest(v_after - v_paid, 0) = 0 then 'مدفوعة بالكامل'
        when v_paid > 0 then 'مدفوعة جزئياً'
        else 'مفتوحة'
      end
    where id::text = p_original_invoice_id;
  else
    update public.purchase_invoices set
      adjustment_total = v_old_adjustment + v_signed_amount,
      adjusted_total = v_after,
      adjusted_remaining = greatest(v_after - v_paid, 0),
      status = case
        when greatest(v_after - v_paid, 0) = 0 then 'مدفوعة بالكامل'
        when v_paid > 0 then 'مدفوعة جزئياً'
        else 'مفتوحة'
      end
    where id::text = p_original_invoice_id;
  end if;

  insert into public.accounting_journal_entries (
    entry_date, reference_type, reference_id, source_document_table,
    source_document_id, description, status
  ) values (
    p_issue_date, p_note_type, v_note_id, 'invoice_adjustment_notes',
    v_note_id::text, p_note_number || ' - ' || p_counterparty, 'posted'
  ) returning id into v_entry_id;

  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_line_amount := round(
      greatest(
        coalesce((v_item->>'quantity')::numeric, 0) * coalesce((v_item->>'unitPrice')::numeric, 0),
        0
      ),
      2
    );
    if v_line_amount > 0 then
      v_account_code := coalesce(nullif(v_item->>'account', ''), v_default_revenue_code);
      if p_note_type = 'sales_credit' then
        insert into public.accounting_journal_lines (
          journal_entry_id, account_code, account_name, debit, credit, counterparty
        ) values (
          v_entry_id, v_account_code, public.account_name_for_posting(v_account_code),
          v_line_amount, 0, p_counterparty
        );
      elsif p_note_type = 'sales_debit' then
        insert into public.accounting_journal_lines (
          journal_entry_id, account_code, account_name, debit, credit, counterparty
        ) values (
          v_entry_id, v_account_code, public.account_name_for_posting(v_account_code),
          0, v_line_amount, p_counterparty
        );
      else
        v_account_code := coalesce(nullif(v_item->>'account', ''), v_default_purchase_code);
        insert into public.accounting_journal_lines (
          journal_entry_id, account_code, account_name, debit, credit, counterparty
        ) values (
          v_entry_id, v_account_code, public.account_name_for_posting(v_account_code),
          0, v_line_amount, p_counterparty
        );
      end if;
      v_items_total := v_items_total + v_line_amount;
    end if;
  end loop;

  if p_note_type in ('sales_credit', 'sales_debit') then
    if v_items_total = 0 and p_subtotal > 0 then
      insert into public.accounting_journal_lines (
        journal_entry_id, account_code, account_name, debit, credit, counterparty
      ) values (
        v_entry_id, v_default_revenue_code, public.account_name_for_posting(v_default_revenue_code),
        case when p_note_type = 'sales_credit' then p_subtotal else 0 end,
        case when p_note_type = 'sales_debit' then p_subtotal else 0 end,
        p_counterparty
      );
      v_items_total := p_subtotal;
    end if;

    if abs(v_items_total - p_subtotal) > 0.02 then
      raise exception 'مجموع حسابات بنود الإشعار لا يطابق المجموع الفرعي';
    end if;

    if p_tax > 0 then
      insert into public.accounting_journal_lines (
        journal_entry_id, account_code, account_name, debit, credit, counterparty
      ) values (
        v_entry_id, v_vat_code, public.account_name_for_posting(v_vat_code),
        case when p_note_type = 'sales_credit' then p_tax else 0 end,
        case when p_note_type = 'sales_debit' then p_tax else 0 end,
        p_counterparty
      );
    end if;

    insert into public.accounting_journal_lines (
      journal_entry_id, account_code, account_name, debit, credit, counterparty
    ) values (
      v_entry_id, v_receivable_code, public.account_name_for_posting(v_receivable_code),
      case when p_note_type = 'sales_debit' then p_total else 0 end,
      case when p_note_type = 'sales_credit' then p_total else 0 end,
      p_counterparty
    );
  else
    if v_items_total = 0 and p_subtotal > 0 then
      insert into public.accounting_journal_lines (
        journal_entry_id, account_code, account_name, debit, credit, counterparty
      ) values (
        v_entry_id, v_default_purchase_code, public.account_name_for_posting(v_default_purchase_code),
        0, p_subtotal, p_counterparty
      );
      v_items_total := p_subtotal;
    end if;

    if abs(v_items_total - p_subtotal) > 0.02 then
      raise exception 'مجموع حسابات بنود إشعار المشتريات لا يطابق المجموع الفرعي';
    end if;

    if p_tax > 0 then
      insert into public.accounting_journal_lines (
        journal_entry_id, account_code, account_name, debit, credit, counterparty
      ) values (
        v_entry_id, v_input_vat_code, public.account_name_for_posting(v_input_vat_code),
        0, p_tax, p_counterparty
      );
    end if;

    insert into public.accounting_journal_lines (
      journal_entry_id, account_code, account_name, debit, credit, counterparty
    ) values (
      v_entry_id, v_payable_code, public.account_name_for_posting(v_payable_code),
      p_total, 0, p_counterparty
    );
  end if;

  if abs((
    select coalesce(sum(debit), 0) - coalesce(sum(credit), 0)
    from public.accounting_journal_lines
    where journal_entry_id = v_entry_id
  )) > 0.01 then
    raise exception 'القيد المحاسبي للإشعار غير متوازن';
  end if;

  update public.invoice_adjustment_notes
  set accounting_status = 'posted',
      accounting_journal_entry_id = v_entry_id,
      accounting_posted_at = now(),
      accounting_error = null
  where id = v_note_id;

  return v_note_id;
end;
$$;

alter table public.accounting_accounts enable row level security;
alter table public.accounting_posting_rules enable row level security;
alter table public.invoice_adjustment_notes enable row level security;
alter table public.accounting_journal_entries enable row level security;
alter table public.accounting_journal_lines enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'accounting_accounts' and policyname = 'accounting_accounts_authenticated') then
    create policy accounting_accounts_authenticated on public.accounting_accounts for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'accounting_posting_rules' and policyname = 'accounting_posting_rules_authenticated') then
    create policy accounting_posting_rules_authenticated on public.accounting_posting_rules for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'invoice_adjustment_notes' and policyname = 'invoice_adjustment_notes_authenticated') then
    create policy invoice_adjustment_notes_authenticated on public.invoice_adjustment_notes for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'accounting_journal_entries' and policyname = 'accounting_journal_entries_authenticated') then
    create policy accounting_journal_entries_authenticated on public.accounting_journal_entries for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'accounting_journal_lines' and policyname = 'accounting_journal_lines_authenticated') then
    create policy accounting_journal_lines_authenticated on public.accounting_journal_lines for all to authenticated using (true) with check (true);
  end if;
end
$$;

grant execute on function public.post_sales_invoice_accounting(text) to authenticated;
grant execute on function public.post_invoice_adjustment_note(text, text, text, text, text, date, numeric, numeric, numeric, jsonb) to authenticated;
