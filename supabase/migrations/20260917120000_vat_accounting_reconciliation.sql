-- Keep VAT reporting classifications aligned with posted source documents and journals.
-- This migration does not modify ZATCA XML, UBL, signing, QR, ICV, PIH or submission flows.

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
    select items, date::date, 'sales', 'sales_invoice',
      accounting_status = 'posted' and accounting_journal_entry_id is not null,
      coalesce(total_tax, 0)
    into v_items, v_document_date, v_document_side, v_document_type, v_report_eligible, v_document_tax
    from public.sales_invoices where id::text = p_document_id;
  elsif p_document_table = 'purchase_invoices' then
    select items, date::date, 'purchases', 'purchase_invoice',
      accounting_status = 'posted' and accounting_journal_entry_id is not null,
      coalesce(total_tax, 0)
    into v_items, v_document_date, v_document_side, v_document_type, v_report_eligible, v_document_tax
    from public.purchase_invoices where id::text = p_document_id;
  elsif p_document_table = 'invoice_adjustment_notes' then
    select items, issue_date,
      case when note_type in ('sales_credit', 'sales_debit') then 'sales' else 'purchases' end,
      note_type,
      accounting_status = 'posted' and accounting_journal_entry_id is not null,
      coalesce(tax, 0)
    into v_items, v_document_date, v_document_side, v_document_type, v_report_eligible, v_document_tax
    from public.invoice_adjustment_notes where id::text = p_document_id and status = 'posted';
  else
    raise exception 'VAT_DOCUMENT_TABLE_INVALID';
  end if;

  if not found then raise exception 'VAT_DOCUMENT_NOT_FOUND'; end if;
  if not v_report_eligible then raise exception 'VAT_DOCUMENT_MUST_BE_POSTED_AND_IMMUTABLE'; end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then raise exception 'VAT_DOCUMENT_ITEMS_REQUIRED'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) <> jsonb_array_length(v_items) then
    raise exception 'VAT_CLASSIFICATION_REQUIRED_FOR_EVERY_LINE';
  end if;

  if v_document_type in ('sales_credit', 'purchase_debit') then v_sign := -1; end if;

  delete from public.accounting_vat_line_classifications
  where document_table = p_document_table and document_id = p_document_id;

  for v_input in select value from jsonb_array_elements(p_lines)
  loop
    v_index := (v_input->>'lineIndex')::integer;
    v_tax_category := v_input->>'taxCategory';
    v_supply_type := v_input->>'supplyType';
    v_item := v_items->v_index;

    if v_item is null then raise exception 'VAT_LINE_INDEX_INVALID: %', v_index; end if;
    if v_tax_category not in ('standard', 'zero_rated', 'exempt', 'out_of_scope') then raise exception 'VAT_TAX_CATEGORY_INVALID: %', v_tax_category; end if;
    if v_supply_type not in ('domestic', 'export', 'import', 'reverse_charge') then raise exception 'VAT_SUPPLY_TYPE_INVALID: %', v_supply_type; end if;
    if v_document_side = 'sales' and v_supply_type in ('import', 'reverse_charge') then raise exception 'VAT_SALES_SUPPLY_TYPE_INVALID'; end if;
    if v_document_side = 'purchases' and v_supply_type = 'export' then raise exception 'VAT_PURCHASE_SUPPLY_TYPE_INVALID'; end if;
    if v_document_side = 'sales' and v_tax_category = 'standard' and v_supply_type <> 'domestic' then raise exception 'VAT_STANDARD_SALES_MUST_BE_DOMESTIC'; end if;
    if v_supply_type = 'export' and v_tax_category <> 'zero_rated' then raise exception 'VAT_EXPORT_MUST_BE_ZERO_RATED'; end if;

    v_rate := round(coalesce(
      nullif(v_item->>'taxPercent', '')::numeric,
      case when p_document_table = 'invoice_adjustment_notes' and abs(v_document_tax) > 0 then 15 else 0 end
    ), 4);
    if v_tax_category = 'standard' and v_rate <> 15 then raise exception 'VAT_STANDARD_RATE_MUST_BE_15: line %', v_index; end if;
    if v_tax_category <> 'standard' and v_rate <> 0 then raise exception 'VAT_NON_STANDARD_RATE_MUST_BE_ZERO: line %', v_index; end if;

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

  if abs(abs(v_classified_tax) - abs(v_document_tax)) > 0.02 then
    raise exception 'VAT_DOCUMENT_TAX_MISMATCH: classified=%, document=%', v_classified_tax, v_document_tax;
  end if;

  return v_count;
end;
$$;

create or replace function public.enforce_vat_classification_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table text := case when tg_op = 'DELETE' then old.document_table else new.document_table end;
  v_id text := case when tg_op = 'DELETE' then old.document_id else new.document_id end;
  v_items jsonb;
  v_tax numeric(18,2);
  v_sign integer := 1;
  v_count integer;
  v_classified_tax numeric(18,2);
begin
  if v_table = 'sales_invoices' then
    select items, coalesce(total_tax, 0) into v_items, v_tax
    from public.sales_invoices
    where id::text = v_id and accounting_status = 'posted' and accounting_journal_entry_id is not null;
  elsif v_table = 'purchase_invoices' then
    select items, coalesce(total_tax, 0) into v_items, v_tax
    from public.purchase_invoices
    where id::text = v_id and accounting_status = 'posted' and accounting_journal_entry_id is not null;
  elsif v_table = 'invoice_adjustment_notes' then
    select items, coalesce(tax, 0), case when note_type in ('sales_credit', 'purchase_debit') then -1 else 1 end
    into v_items, v_tax, v_sign
    from public.invoice_adjustment_notes
    where id::text = v_id and status = 'posted' and accounting_status = 'posted' and accounting_journal_entry_id is not null;
  else
    raise exception 'VAT_DOCUMENT_TABLE_INVALID';
  end if;

  if not found then raise exception 'VAT_DOCUMENT_MUST_BE_POSTED_AND_IMMUTABLE'; end if;

  select count(*), coalesce(sum(tax_amount), 0)
  into v_count, v_classified_tax
  from public.accounting_vat_line_classifications
  where document_table = v_table and document_id = v_id;

  if v_count <> jsonb_array_length(v_items) then raise exception 'VAT_CLASSIFICATION_REQUIRED_FOR_EVERY_LINE'; end if;
  if abs(v_classified_tax - (abs(v_tax) * v_sign)) > 0.02 then
    raise exception 'VAT_DOCUMENT_TAX_MISMATCH: classified=%, document=%', v_classified_tax, v_tax;
  end if;
  return null;
end;
$$;

drop trigger if exists enforce_vat_classification_integrity on public.accounting_vat_line_classifications;
create constraint trigger enforce_vat_classification_integrity
after insert or update or delete on public.accounting_vat_line_classifications
deferrable initially deferred
for each row execute function public.enforce_vat_classification_integrity();

create or replace function public.get_vat_accounting_reconciliation(p_date_from date, p_date_to date)
returns table (
  document_table text,
  document_id text,
  document_number text,
  document_date date,
  document_side text,
  document_type text,
  document_tax numeric,
  classified_tax numeric,
  journal_tax numeric,
  item_count integer,
  classification_count integer,
  reconciliation_status text
)
language sql
stable
security definer
set search_path = public
as $$
  with documents as (
    select 'sales_invoices'::text as document_table, invoice.id::text as document_id,
      invoice.id::text as document_number, invoice.date::date as document_date,
      'sales'::text as document_side, coalesce(invoice.invoice_type, 'sales_invoice')::text as document_type,
      round(coalesce(invoice.total_tax, 0), 2) as document_tax,
      case when jsonb_typeof(invoice.items) = 'array' then jsonb_array_length(invoice.items) else 0 end as item_count,
      invoice.accounting_journal_entry_id as journal_id
    from public.sales_invoices invoice where invoice.accounting_status = 'posted'
    union all
    select 'purchase_invoices', invoice.id::text, invoice.id::text, invoice.date,
      'purchases', 'purchase_invoice', round(coalesce(invoice.total_tax, 0), 2),
      case when jsonb_typeof(invoice.items) = 'array' then jsonb_array_length(invoice.items) else 0 end,
      invoice.accounting_journal_entry_id
    from public.purchase_invoices invoice where invoice.accounting_status = 'posted'
    union all
    select 'invoice_adjustment_notes', note.id::text, note.note_number, note.issue_date,
      case when note.note_type in ('sales_credit', 'sales_debit') then 'sales' else 'purchases' end,
      note.note_type,
      round(coalesce(note.tax, 0) * case when note.note_type in ('sales_credit', 'purchase_debit') then -1 else 1 end, 2),
      case when jsonb_typeof(note.items) = 'array' then jsonb_array_length(note.items) else 0 end,
      note.accounting_journal_entry_id
    from public.invoice_adjustment_notes note
    where note.status = 'posted' and note.accounting_status = 'posted'
  ), classifications as (
    select line.document_table, line.document_id,
      round(sum(line.tax_amount), 2) as classified_tax, count(*)::integer as classification_count
    from public.accounting_vat_line_classifications line
    group by line.document_table, line.document_id
  ), journal_vat as (
    select document.document_table, document.document_id, entry.status as journal_status,
      round(coalesce(sum(case
        when document.document_side = 'sales' and line.account_code = rule.output_vat_account_code then line.credit - line.debit
        when document.document_side = 'purchases' and line.account_code = rule.input_vat_account_code then line.debit - line.credit
        else 0 end), 0), 2) as journal_tax
    from documents document
    left join public.accounting_journal_entries entry on entry.id = document.journal_id
    left join public.accounting_journal_lines line on line.journal_entry_id = entry.id
    left join public.accounting_posting_rules rule on rule.rule_code = 'sales_default' and rule.active
    group by document.document_table, document.document_id, entry.status
  )
  select document.document_table, document.document_id, document.document_number,
    document.document_date, document.document_side, document.document_type,
    document.document_tax, coalesce(classification.classified_tax, 0), coalesce(journal.journal_tax, 0),
    document.item_count, coalesce(classification.classification_count, 0),
    case
      when document.journal_id is null or journal.journal_status is distinct from 'posted' then 'missing_journal'
      when coalesce(classification.classification_count, 0) = 0 then 'missing_classification'
      when classification.classification_count <> document.item_count then 'partial_classification'
      when abs(coalesce(classification.classified_tax, 0) - document.document_tax) > 0.02 then 'document_tax_mismatch'
      when abs(coalesce(journal.journal_tax, 0) - document.document_tax) > 0.02 then 'journal_tax_mismatch'
      else 'matched'
    end
  from documents document
  left join classifications classification
    on classification.document_table = document.document_table and classification.document_id = document.document_id
  left join journal_vat journal
    on journal.document_table = document.document_table and journal.document_id = document.document_id
  where document.document_date between p_date_from and p_date_to
    and public.accounting_access_allowed(false)
  order by document.document_date, document.document_number;
$$;

revoke all on function public.save_vat_document_classification(text, text, jsonb) from public, anon;
revoke all on function public.enforce_vat_classification_integrity() from public, anon, authenticated;
revoke all on function public.get_vat_accounting_reconciliation(date, date) from public, anon;
grant execute on function public.save_vat_document_classification(text, text, jsonb) to authenticated, service_role;
grant execute on function public.get_vat_accounting_reconciliation(date, date) to authenticated, service_role;
