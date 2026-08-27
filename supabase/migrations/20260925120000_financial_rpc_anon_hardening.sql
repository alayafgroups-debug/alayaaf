-- Remove anonymous execution from remaining financial SECURITY DEFINER functions.
-- Function bodies and all ZATCA objects are intentionally unchanged.

revoke all on function public.create_and_post_purchase_invoice(jsonb) from public, anon;
grant execute on function public.create_and_post_purchase_invoice(jsonb) to authenticated, service_role;

revoke all on function public.import_accounting_bank_statement(uuid, text, date, date, numeric, numeric, jsonb) from public, anon;
grant execute on function public.import_accounting_bank_statement(uuid, text, date, date, numeric, numeric, jsonb) to authenticated, service_role;

revoke all on function public.match_bank_statement_line(uuid, uuid, text) from public, anon;
grant execute on function public.match_bank_statement_line(uuid, uuid, text) to authenticated, service_role;

revoke all on function public.post_purchase_invoice_accounting(text) from public, anon;
grant execute on function public.post_purchase_invoice_accounting(text) to authenticated, service_role;

revoke all on function public.post_sales_invoice_accounting(text) from public, anon;
grant execute on function public.post_sales_invoice_accounting(text) to authenticated, service_role;

revoke all on function public.record_purchase_payment(text, numeric, text, text, date) from public, anon;
grant execute on function public.record_purchase_payment(text, numeric, text, text, date) to authenticated, service_role;

revoke all on function public.refresh_bank_statement_import_status(uuid) from public, anon;
grant execute on function public.refresh_bank_statement_import_status(uuid) to authenticated, service_role;

revoke all on function public.require_accounting_access_for_adjustment_note() from public, anon;
revoke all on function public.sync_bank_import_status() from public, anon;

revoke all on function public.unmatch_bank_statement_line(uuid) from public, anon;
grant execute on function public.unmatch_bank_statement_line(uuid) to authenticated, service_role;
