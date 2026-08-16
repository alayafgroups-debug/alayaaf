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

do $$
begin
  if to_regclass('public.cost_centers') is not null then
    execute $migration$
      update public.cost_centers
      set company_name = 'شركة إدارة العياف للمقاولات'
      where company_name = 'شركة العياف التجارية'
    $migration$;
  end if;
end;
$$;

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
  v_receivable_account_code text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not (
    exists (
      select 1
      from public.employee_emails credential
      join public.employees employee
        on employee.id = credential.employee_id
      left join public.user_roles role
        on role.name_ar = employee.employee_role
       and role.status = 'فعال'
      where credential.auth_user_id = auth.uid()
        and credential.status = 'active'
        and (
          employee.employee_role in ('مدير النظام', 'مدير عام', 'المدير العام')
          or coalesce(role.permissions->>'sales.receipts', '') in ('true', 'manage')
          or coalesce(role.permissions->>'module.sales', '') in ('true', 'manage')
        )
    )
    or exists (
      select 1
      from public.employees employee
      left join public.user_roles role
        on role.name_ar = employee.employee_role
       and role.status = 'فعال'
      where lower(employee.email) = lower(coalesce(auth.jwt()->>'email', ''))
        and (
          employee.employee_role in ('مدير النظام', 'مدير عام', 'المدير العام')
          or coalesce(role.permissions->>'sales.receipts', '') in ('true', 'manage')
          or coalesce(role.permissions->>'module.sales', '') in ('true', 'manage')
        )
    )
  ) then
    raise exception 'FORBIDDEN_CUSTOMER_PAYMENT';
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

  select * into v_invoice
  from public.sales_invoices
  where id = p_invoice_id
  for update;
  if not found then
    raise exception 'SALES_INVOICE_NOT_FOUND';
  end if;
  if v_invoice.accounting_status <> 'posted'
     or v_invoice.accounting_journal_entry_id is null then
    raise exception 'SALES_INVOICE_MUST_BE_POSTED_BEFORE_PAYMENT';
  end if;
  if not exists (
    select 1
    from public.accounting_journal_entries entry
    where entry.id = v_invoice.accounting_journal_entry_id
      and entry.status = 'posted'
      and entry.reference_type = 'sales_invoice'
      and entry.source_document_table = 'sales_invoices'
      and entry.source_document_id = p_invoice_id
  ) then
    raise exception 'SALES_INVOICE_POSTING_ENTRY_NOT_FOUND';
  end if;

  select line.account_code into v_receivable_account_code
  from public.accounting_journal_lines line
  where line.journal_entry_id = v_invoice.accounting_journal_entry_id
    and line.debit > 0
  order by line.debit desc, line.created_at
  limit 1;
  if v_receivable_account_code is null then
    raise exception 'SALES_INVOICE_RECEIVABLE_ACCOUNT_NOT_FOUND';
  end if;

  -- Confirm that both sides are leaf accounts before creating any journal row.
  perform public.account_name_for_posting(v_deposit_account_code);
  perform public.account_name_for_posting(v_receivable_account_code);

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
      v_entry_id, v_receivable_account_code,
      public.account_name_for_posting(v_receivable_account_code),
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
