-- Account 111 is an aggregate account in the chart and must never receive journal
-- lines directly. Customer receipts post to the appropriate leaf account instead.

insert into public.accounting_accounts (
  code, company_name, name_ar, name_en, parent_code, cash_flow_type,
  account_type, level, enable_payments, is_system
) values
  (
    '111', 'شركة إدارة العياف للمقاولات', 'النقد وما يعادله',
    'Cash and Equivalents', '11', 'نقد', 'التشغيليات', 2, false, true
  ),
  (
    '1111', 'شركة إدارة العياف للمقاولات', 'الخزينة',
    'Treasury', '111', 'نقد', 'التشغيليات', 3, true, true
  ),
  (
    '1112', 'شركة إدارة العياف للمقاولات', 'شيكات تحت التحصيل',
    'Cheques Under Collection', '111', 'نقد', 'التشغيليات', 3, true, true
  ),
  (
    '1113', 'شركة إدارة العياف للمقاولات', 'الحساب البنكي',
    'Bank Account', '111', 'نقد', 'التشغيليات', 3, true, true
  )
on conflict (code) do update
set company_name = excluded.company_name,
    name_ar = excluded.name_ar,
    name_en = excluded.name_en,
    parent_code = excluded.parent_code,
    cash_flow_type = excluded.cash_flow_type,
    account_type = excluded.account_type,
    level = excluded.level,
    enable_payments = excluded.enable_payments,
    is_system = excluded.is_system,
    updated_at = now();

alter table public.customer_payments
  add column if not exists deposit_account_code text;

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
  v_payment_method text := nullif(btrim(p_payment_method), '');
  v_deposit_account_code text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'PAYMENT_AMOUNT_MUST_BE_POSITIVE';
  end if;
  if v_payment_method is null then
    raise exception 'PAYMENT_METHOD_REQUIRED';
  end if;
  if v_payment_method not in ('تحويل بنكي', 'نقدي', 'بطاقة', 'شيك') then
    raise exception 'UNSUPPORTED_PAYMENT_METHOD';
  end if;

  v_deposit_account_code := case v_payment_method
    when 'نقدي' then '1111'
    when 'شيك' then '1112'
    else '1113'
  end;

  -- Confirm that both sides are leaf accounts before creating any journal row.
  perform public.account_name_for_posting(v_deposit_account_code);
  perform public.account_name_for_posting('112');

  select * into v_invoice
  from public.sales_invoices
  where id = p_invoice_id
  for update;
  if not found then
    raise exception 'SALES_INVOICE_NOT_FOUND';
  end if;

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
      v_entry_id, v_deposit_account_code,
      public.account_name_for_posting(v_deposit_account_code),
      p_amount, 0, v_invoice.customer
    ),
    (
      v_entry_id, '112', public.account_name_for_posting('112'),
      0, p_amount, v_invoice.customer
    );

  insert into public.customer_payments (
    id, invoice_id, customer_id, amount, payment_method,
    reference, deposit_account_code, journal_entry_id, created_by
  ) values (
    v_payment_id, p_invoice_id, v_invoice.customer_id, p_amount,
    v_payment_method, nullif(btrim(p_reference), ''),
    v_deposit_account_code, v_entry_id, auth.uid()
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

comment on column public.customer_payments.deposit_account_code is
  'Leaf cash/bank account debited by the immutable customer receipt journal entry.';
