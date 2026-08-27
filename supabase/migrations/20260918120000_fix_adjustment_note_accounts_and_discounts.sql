-- Keep adjustment-note accounting aligned with invoice item account keys and VAT taxable amounts.
-- This migration does not modify ZATCA XML, UBL, signing, QR, ICV, PIH or submission flows.

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
security definer
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
        coalesce(nullif(v_item->>'quantity', '')::numeric, 0)
          * coalesce(nullif(v_item->>'unitPrice', '')::numeric, 0)
          - coalesce(nullif(v_item->>'discount', '')::numeric, 0),
        0
      ),
      2
    );
    if v_line_amount > 0 then
      v_account_code := coalesce(
        nullif(v_item->>'accountCode', ''),
        nullif(v_item->>'account', ''),
        case when p_note_type in ('sales_credit', 'sales_debit')
          then v_default_revenue_code else v_default_purchase_code end
      );
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

revoke all on function public.post_invoice_adjustment_note(
  text, text, text, text, text, date, numeric, numeric, numeric, jsonb
) from public, anon;
grant execute on function public.post_invoice_adjustment_note(
  text, text, text, text, text, date, numeric, numeric, numeric, jsonb
) to authenticated, service_role;
