-- Keep the business document status aligned with the server-only submission log.
-- This does not resend, accept, reject, unblock, or alter any signed legal artifact.

do $$
declare
  v_log record;
begin
  for v_log in
    select distinct on (invoice_table, invoice_id)
      invoice_table,
      invoice_id,
      response,
      updated_at
    from public.zatca_invoice_submission_logs
    where mode = 'production'
      and status = 'ambiguous'
      and invoice_table in ('sales_invoices', 'invoice_adjustment_notes')
    order by invoice_table, invoice_id, created_at desc
  loop
    execute format(
      'update public.%I set zatca_status = $1, zatca_response = $2, zatca_submitted_at = coalesce(zatca_submitted_at, $3) where id::text = $4 and zatca_status not in ($5, $6)',
      v_log.invoice_table
    ) using
      'ambiguous',
      coalesce(v_log.response, '{}'::jsonb),
      v_log.updated_at,
      v_log.invoice_id,
      'cleared',
      'reported';
  end loop;
end;
$$;
