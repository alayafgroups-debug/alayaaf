-- Add actionable context and mismatch reasons to VAT/accounting reconciliation.
-- Business-posted adjustment notes remain visible even when their journal is missing.
-- This migration does not modify or invoke ZATCA code, data or submission flows.

drop function if exists public.get_vat_accounting_reconciliation(date, date);

create function public.get_vat_accounting_reconciliation(p_date_from date, p_date_to date)
returns table (
  document_table text,
  document_id text,
  document_number text,
  document_date date,
  document_side text,
  document_type text,
  counterparty text,
  document_subtotal numeric,
  document_total numeric,
  document_tax numeric,
  classified_tax numeric,
  journal_tax numeric,
  journal_status text,
  item_count integer,
  classification_count integer,
  reconciliation_status text,
  reconciliation_reason_code text
)
language sql
stable
security definer
set search_path = public
as $$
  with documents as (
    select
      'sales_invoices'::text as document_table,
      invoice.id::text as document_id,
      invoice.id::text as document_number,
      invoice.date::date as document_date,
      'sales'::text as document_side,
      coalesce(invoice.invoice_type, 'sales_invoice')::text as document_type,
      coalesce(invoice.customer, '')::text as counterparty,
      round(coalesce(invoice.subtotal, 0), 2) as document_subtotal,
      round(coalesce(
        nullif(regexp_replace(coalesce(invoice.total::text, ''), '[^0-9.-]', '', 'g'), '')::numeric,
        coalesce(invoice.subtotal, 0) + coalesce(invoice.total_tax, 0)
      ), 2) as document_total,
      round(coalesce(invoice.total_tax, 0), 2) as document_tax,
      case when jsonb_typeof(invoice.items) = 'array' then jsonb_array_length(invoice.items) else 0 end as item_count,
      invoice.accounting_journal_entry_id as journal_id
    from public.sales_invoices invoice
    where invoice.accounting_status in ('posted', 'failed')

    union all

    select
      'purchase_invoices', invoice.id::text, invoice.id::text, invoice.date::date,
      'purchases', 'purchase_invoice', coalesce(invoice.vendor, ''),
      round(coalesce(invoice.subtotal, 0), 2),
      round(coalesce(
        nullif(regexp_replace(coalesce(invoice.total::text, ''), '[^0-9.-]', '', 'g'), '')::numeric,
        coalesce(invoice.subtotal, 0) + coalesce(invoice.total_tax, 0)
      ), 2),
      round(coalesce(invoice.total_tax, 0), 2),
      case when jsonb_typeof(invoice.items) = 'array' then jsonb_array_length(invoice.items) else 0 end,
      invoice.accounting_journal_entry_id
    from public.purchase_invoices invoice
    where invoice.accounting_status in ('posted', 'failed')

    union all

    select
      'invoice_adjustment_notes', note.id::text, note.note_number, note.issue_date,
      case when note.note_type in ('sales_credit', 'sales_debit') then 'sales' else 'purchases' end,
      note.note_type, note.counterparty,
      round(coalesce(note.subtotal, 0), 2),
      round(coalesce(note.total, 0), 2),
      round(coalesce(note.tax, 0) * case
        when note.note_type in ('sales_credit', 'purchase_debit', 'purchase_credit') then -1
        else 1
      end, 2),
      case when jsonb_typeof(note.items) = 'array' then jsonb_array_length(note.items) else 0 end,
      note.accounting_journal_entry_id
    from public.invoice_adjustment_notes note
    where note.status = 'posted'
  ), classifications as (
    select line.document_table, line.document_id,
      round(sum(line.tax_amount), 2) as classified_tax,
      count(*)::integer as classification_count
    from public.accounting_vat_line_classifications line
    group by line.document_table, line.document_id
  ), journal_vat as (
    select document.document_table, document.document_id,
      entry.status as journal_status,
      round(coalesce(sum(case
        when document.document_side = 'sales' and line.account_code = rule.output_vat_account_code
          then line.credit - line.debit
        when document.document_side = 'purchases' and line.account_code = rule.input_vat_account_code
          then line.debit - line.credit
        else 0
      end), 0), 2) as journal_tax
    from documents document
    left join public.accounting_journal_entries entry on entry.id = document.journal_id
    left join public.accounting_journal_lines line on line.journal_entry_id = entry.id
    left join public.accounting_posting_rules rule
      on rule.rule_code = 'sales_default' and rule.active
    group by document.document_table, document.document_id, entry.status
  ), compared as (
    select document.*,
      coalesce(classification.classified_tax, 0) as classified_tax,
      coalesce(classification.classification_count, 0) as classification_count,
      coalesce(journal.journal_tax, 0) as journal_tax,
      journal.journal_status,
      case
        when document.journal_id is null or journal.journal_status is distinct from 'posted' then 'missing_journal'
        when coalesce(classification.classification_count, 0) = 0 then 'missing_classification'
        when classification.classification_count <> document.item_count then 'partial_classification'
        when abs(coalesce(classification.classified_tax, 0) - document.document_tax) > 0.02 then 'document_tax_mismatch'
        when abs(coalesce(journal.journal_tax, 0) - document.document_tax) > 0.02 then 'journal_tax_mismatch'
        else 'matched'
      end as reason_code
    from documents document
    left join classifications classification
      on classification.document_table = document.document_table
     and classification.document_id = document.document_id
    left join journal_vat journal
      on journal.document_table = document.document_table
     and journal.document_id = document.document_id
  )
  select compared.document_table, compared.document_id, compared.document_number,
    compared.document_date, compared.document_side, compared.document_type,
    compared.counterparty, compared.document_subtotal, compared.document_total,
    compared.document_tax, compared.classified_tax, compared.journal_tax,
    compared.journal_status, compared.item_count, compared.classification_count,
    compared.reason_code, compared.reason_code
  from compared
  where compared.document_date between p_date_from and p_date_to
    and public.accounting_access_allowed(false)
  order by compared.document_date, compared.document_number;
$$;

revoke all on function public.get_vat_accounting_reconciliation(date, date) from public, anon;
grant execute on function public.get_vat_accounting_reconciliation(date, date) to authenticated, service_role;
