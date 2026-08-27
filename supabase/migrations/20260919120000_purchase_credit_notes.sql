-- Add supplier credit notes as internal purchase accounting documents.
-- Purchase credit notes reduce the supplier balance and reverse purchase/input-VAT amounts.
-- This migration does not modify or invoke ZATCA XML, UBL, signing, QR, ICV, PIH or submission flows.

alter table public.invoice_adjustment_notes
  drop constraint if exists invoice_adjustment_notes_note_type_check;
alter table public.invoice_adjustment_notes
  add constraint invoice_adjustment_notes_note_type_check
  check (note_type in ('sales_credit', 'sales_debit', 'purchase_debit', 'purchase_credit'));

create or replace function public.require_posted_purchase_for_debit_note()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.note_type in ('purchase_debit', 'purchase_credit') and not exists (
    select 1 from public.purchase_invoices
    where id::text = new.original_invoice_id
      and accounting_status = 'posted'
      and accounting_journal_entry_id is not null
  ) then
    raise exception 'POSTED_PURCHASE_INVOICE_REQUIRED_FOR_ADJUSTMENT_NOTE';
  end if;
  return new;
end;
$$;

-- The established posting function already routes every non-sales note through
-- purchase accounts and decreases the purchase invoice balance. Extend only its
-- accepted type list so purchase_credit uses that same protected atomic flow.
do $$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(p.oid)
  into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'post_invoice_adjustment_note'
    and pg_get_function_identity_arguments(p.oid) =
      'p_note_number text, p_note_type text, p_original_invoice_id text, p_counterparty text, p_currency text, p_issue_date date, p_subtotal numeric, p_tax numeric, p_total numeric, p_items jsonb';

  v_updated := replace(
    v_definition,
    'if p_note_type not in (''sales_credit'', ''sales_debit'', ''purchase_debit'') then',
    'if p_note_type not in (''sales_credit'', ''sales_debit'', ''purchase_debit'', ''purchase_credit'') then'
  );
  if v_updated is null or v_updated = v_definition then
    raise exception 'PURCHASE_CREDIT_POSTING_PATCH_NOT_APPLIED';
  end if;
  execute v_updated;
end;
$$;

-- Keep VAT signs consistent: both purchase adjustment-note types reverse input VAT.
do $$
declare
  v_function text;
  v_definition text;
  v_updated text;
begin
  foreach v_function in array array[
    'save_vat_document_classification',
    'enforce_vat_classification_integrity',
    'get_vat_accounting_reconciliation'
  ]
  loop
    select pg_get_functiondef(p.oid)
    into v_definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = v_function
    limit 1;

    v_updated := replace(
      v_definition,
      '(''sales_credit'', ''purchase_debit'')',
      '(''sales_credit'', ''purchase_debit'', ''purchase_credit'')'
    );
    if v_updated is null or v_updated = v_definition then
      raise exception 'PURCHASE_CREDIT_VAT_PATCH_NOT_APPLIED: %', v_function;
    end if;
    execute v_updated;
  end loop;
end;
$$;

revoke all on function public.post_invoice_adjustment_note(
  text, text, text, text, text, date, numeric, numeric, numeric, jsonb
) from public, anon;
grant execute on function public.post_invoice_adjustment_note(
  text, text, text, text, text, date, numeric, numeric, numeric, jsonb
) to authenticated, service_role;
