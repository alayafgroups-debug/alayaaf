-- Remove anonymous/GraphQL exposure from financial and inventory data and close
-- direct execution gaps. Authenticated application grants and RLS remain intact.
-- This migration intentionally excludes every ZATCA table, function and flow.

revoke all on public.sales_invoices,
  public.purchase_invoices,
  public.invoice_adjustment_notes,
  public.customer_payments,
  public.purchase_payments,
  public.accounting_accounts,
  public.accounting_posting_rules,
  public.accounting_journal_entries,
  public.accounting_journal_lines,
  public.accounting_fiscal_periods,
  public.accounting_vat_line_classifications,
  public.accounting_bank_accounts,
  public.accounting_bank_statement_imports,
  public.accounting_bank_statement_lines,
  public.accounting_reclassifications,
  public.accounting_reclassification_items,
  public.fixed_assets,
  public.fixed_asset_depreciation,
  public.fixed_asset_disposals,
  public.inventory_products,
  public.inventory_warehouses,
  public.inventory_stock_movements,
  public.inventory_receipts,
  public.inventory_receipt_lines,
  public.inventory_issues,
  public.inventory_issue_lines,
  public.inventory_transfers,
  public.inventory_transfer_lines,
  public.inventory_counts,
  public.inventory_count_lines,
  public.inventory_adjustments,
  public.inventory_adjustment_lines,
  public.inventory_boms,
  public.inventory_bom_lines,
  public.inventory_manufacturing_orders,
  public.inventory_manufacturing_order_lines,
  public.inventory_assembly_boms,
  public.inventory_assembly_bom_lines,
  public.inventory_assembly_orders,
  public.inventory_assembly_order_lines,
  public.inventory_opening_balances,
  public.inventory_opening_balance_lines
from anon;

-- Permission helpers may be used by RLS but are not public API endpoints.
revoke all on function public.accounting_access_allowed(boolean) from public, anon;
revoke all on function public.accounting_bank_access_allowed(boolean) from public, anon;
grant execute on function public.accounting_access_allowed(boolean) to authenticated, service_role;
grant execute on function public.accounting_bank_access_allowed(boolean) to authenticated, service_role;

-- VAT reporting is authenticated-only.
revoke all on function public.get_vat_report_summary(date, date) from public, anon;
grant execute on function public.get_vat_report_summary(date, date) to authenticated, service_role;

-- Trigger functions are not callable browser APIs.
revoke all on function public.verify_employee_request_signature() from public, anon, authenticated;

-- Inventory mutations and balance reads are authenticated RPCs with internal
-- permission checks; remove inherited PUBLIC execution explicitly.
revoke all on function public.save_inventory_product(uuid, jsonb) from public, anon;
revoke all on function public.delete_inventory_product(uuid) from public, anon;
revoke all on function public.save_inventory_warehouse(uuid, text, text, text, boolean) from public, anon;
revoke all on function public.delete_inventory_warehouse(uuid) from public, anon;
revoke all on function public.list_inventory_balances() from public, anon;
grant execute on function public.save_inventory_product(uuid, jsonb) to authenticated, service_role;
grant execute on function public.delete_inventory_product(uuid) to authenticated, service_role;
grant execute on function public.save_inventory_warehouse(uuid, text, text, text, boolean) to authenticated, service_role;
grant execute on function public.delete_inventory_warehouse(uuid) to authenticated, service_role;
grant execute on function public.list_inventory_balances() to authenticated, service_role;

-- The signature read RPC is available only after authentication.
revoke all on function public.get_my_employee_signature() from public, anon;
grant execute on function public.get_my_employee_signature() to authenticated;

-- Keep untrusted roles from creating objects that could shadow SECURITY DEFINER
-- dependencies. This is idempotent and already true on the deployed project.
revoke create on schema public from public;
