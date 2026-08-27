-- Enforce least-privilege reads and draft mutations for financial records.
-- Named administrators and service_role retain full access.
-- This migration does not modify or invoke any ZATCA function, credential,
-- onboarding setting, sequence, XML, signature, QR, ICV, PIH or submission flow.

create or replace function public.business_permission_allowed(
  p_permissions text[],
  p_manage boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'service_role' or exists (
    select 1
    from public.employees employee
    left join public.employee_emails credential
      on credential.employee_id = employee.id
     and credential.status = 'active'
    left join public.user_roles role
      on role.name_ar = employee.employee_role
     and role.status = 'فعال'
    where (
      credential.auth_user_id = auth.uid()
      or lower(employee.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    and (
      employee.employee_role in ('مدير النظام', 'مدير عام', 'المدير العام')
      or exists (
        select 1
        from unnest(p_permissions) permission_key
        where case when p_manage then
          coalesce(role.permissions ->> permission_key, '') in ('true', 'manage')
        else
          coalesce(role.permissions ->> permission_key, '') in ('true', 'read', 'manage')
        end
      )
    )
  );
$$;

revoke all on function public.business_permission_allowed(text[], boolean) from public, anon;
grant execute on function public.business_permission_allowed(text[], boolean) to authenticated, service_role;

-- Sales invoices: sales users can read; only invoice managers can create or mutate.
drop policy if exists authenticated_all on public.sales_invoices;
drop policy if exists sales_invoices_authorized_select on public.sales_invoices;
drop policy if exists sales_invoices_authorized_insert on public.sales_invoices;
drop policy if exists sales_invoices_authorized_update on public.sales_invoices;
drop policy if exists sales_invoices_authorized_delete on public.sales_invoices;
create policy sales_invoices_authorized_select
on public.sales_invoices for select to authenticated
using ((select public.business_permission_allowed(
  array['sales.invoices', 'sales.credit_notes', 'sales.receipts', 'sales.reports', 'module.sales'], false
)));
create policy sales_invoices_authorized_insert
on public.sales_invoices for insert to authenticated
with check ((select public.business_permission_allowed(array['sales.invoices'], true)));
create policy sales_invoices_authorized_update
on public.sales_invoices for update to authenticated
using ((select public.business_permission_allowed(array['sales.invoices'], true)))
with check ((select public.business_permission_allowed(array['sales.invoices'], true)));
create policy sales_invoices_authorized_delete
on public.sales_invoices for delete to authenticated
using ((select public.business_permission_allowed(array['sales.invoices'], true)));

-- Purchase invoices are created through the protected posting RPC. Direct edits and
-- deletes remain available only for unposted records and invoice managers.
drop policy if exists authenticated_all on public.purchase_invoices;
drop policy if exists purchase_invoices_authenticated_select on public.purchase_invoices;
drop policy if exists purchase_invoices_authenticated_update on public.purchase_invoices;
drop policy if exists purchase_invoices_authenticated_delete on public.purchase_invoices;
drop policy if exists purchase_invoices_authorized_select on public.purchase_invoices;
drop policy if exists purchase_invoices_authorized_update on public.purchase_invoices;
drop policy if exists purchase_invoices_authorized_delete on public.purchase_invoices;
create policy purchase_invoices_authorized_select
on public.purchase_invoices for select to authenticated
using ((select public.business_permission_allowed(
  array['purchases.invoices', 'purchases.debit_notes', 'purchases.credit_notes',
        'purchases.payments', 'purchases.reports', 'module.purchases'], false
)));
create policy purchase_invoices_authorized_update
on public.purchase_invoices for update to authenticated
using (
  accounting_status <> 'posted'
  and (select public.business_permission_allowed(array['purchases.invoices'], true))
)
with check (
  accounting_status <> 'posted'
  and (select public.business_permission_allowed(array['purchases.invoices'], true))
);
create policy purchase_invoices_authorized_delete
on public.purchase_invoices for delete to authenticated
using (
  accounting_status <> 'posted'
  and (select public.business_permission_allowed(array['purchases.invoices'], true))
);

-- Adjustment-note visibility follows the document side; financial posting remains RPC-only.
drop policy if exists invoice_adjustment_notes_authenticated on public.invoice_adjustment_notes;
drop policy if exists invoice_adjustment_notes_authorized_select on public.invoice_adjustment_notes;
drop policy if exists invoice_adjustment_notes_authorized_update on public.invoice_adjustment_notes;
create policy invoice_adjustment_notes_authorized_select
on public.invoice_adjustment_notes for select to authenticated
using (
  (note_type in ('sales_credit', 'sales_debit') and
    (select public.business_permission_allowed(
      array['sales.credit_notes', 'sales.invoices', 'sales.reports', 'module.sales'], false
    )))
  or
  (note_type in ('purchase_credit', 'purchase_debit') and
    (select public.business_permission_allowed(
      array['purchases.credit_notes', 'purchases.debit_notes', 'purchases.invoices',
            'purchases.reports', 'module.purchases'], false
    )))
  or (select public.business_permission_allowed(
    array['accounting.reports', 'accounting.tax_reports', 'module.accounting'], false
  ))
);
create policy invoice_adjustment_notes_authorized_update
on public.invoice_adjustment_notes for update to authenticated
using (
  (note_type in ('sales_credit', 'sales_debit') and
    (select public.business_permission_allowed(array['sales.credit_notes'], true)))
  or
  (note_type in ('purchase_credit', 'purchase_debit') and
    (select public.business_permission_allowed(
      array['purchases.credit_notes', 'purchases.debit_notes'], true
    )))
)
with check (
  (note_type in ('sales_credit', 'sales_debit') and
    (select public.business_permission_allowed(array['sales.credit_notes'], true)))
  or
  (note_type in ('purchase_credit', 'purchase_debit') and
    (select public.business_permission_allowed(
      array['purchases.credit_notes', 'purchases.debit_notes'], true
    )))
);

-- Receipts, supplier payments and journals are no longer visible to every login.
drop policy if exists customer_payments_select_authenticated on public.customer_payments;
drop policy if exists customer_payments_authorized_select on public.customer_payments;
create policy customer_payments_authorized_select
on public.customer_payments for select to authenticated
using ((select public.business_permission_allowed(
  array['sales.receipts', 'sales.reports', 'accounting.reports', 'module.accounting'], false
)));

drop policy if exists purchase_payments_select_authorized on public.purchase_payments;
drop policy if exists purchase_payments_authorized_select on public.purchase_payments;
create policy purchase_payments_authorized_select
on public.purchase_payments for select to authenticated
using ((select public.business_permission_allowed(
  array['purchases.payments', 'purchases.reports', 'accounting.reports', 'module.accounting'], false
)));

drop policy if exists accounting_journal_entries_select_authenticated on public.accounting_journal_entries;
drop policy if exists accounting_journal_entries_authorized_select on public.accounting_journal_entries;
create policy accounting_journal_entries_authorized_select
on public.accounting_journal_entries for select to authenticated
using ((select public.business_permission_allowed(
  array['accounting.reports', 'accounting.manual_journals', 'accounting.tax_reports',
        'accounting.reclassification', 'accounting.fixed_assets', 'module.accounting'], false
)));

drop policy if exists accounting_journal_lines_select_authenticated on public.accounting_journal_lines;
drop policy if exists accounting_journal_lines_authorized_select on public.accounting_journal_lines;
create policy accounting_journal_lines_authorized_select
on public.accounting_journal_lines for select to authenticated
using ((select public.business_permission_allowed(
  array['accounting.reports', 'accounting.manual_journals', 'accounting.tax_reports',
        'accounting.reclassification', 'accounting.fixed_assets', 'module.accounting'], false
)));

-- Account configuration remains readable only inside accounting, while writes stay RPC-only.
drop policy if exists accounting_accounts_authenticated on public.accounting_accounts;
drop policy if exists authenticated_all on public.accounting_accounts;
drop policy if exists accounting_accounts_authorized_select on public.accounting_accounts;
create policy accounting_accounts_authorized_select
on public.accounting_accounts for select to authenticated
using ((select public.business_permission_allowed(
  array['accounting.accounts', 'accounting.reports', 'accounting.manual_journals',
        'accounting.settings', 'accounting.fixed_assets', 'accounting.reclassification',
        'accounting.tax_reports', 'module.accounting'], false
)));

drop policy if exists accounting_posting_rules_authenticated on public.accounting_posting_rules;
drop policy if exists accounting_posting_rules_authorized_select on public.accounting_posting_rules;
create policy accounting_posting_rules_authorized_select
on public.accounting_posting_rules for select to authenticated
using ((select public.business_permission_allowed(
  array['accounting.settings', 'accounting.reports', 'accounting.tax_reports', 'module.accounting'], false
)));

-- TRUNCATE bypasses RLS and is never a browser operation.
revoke truncate on public.sales_invoices,
  public.purchase_invoices,
  public.invoice_adjustment_notes,
  public.customer_payments,
  public.purchase_payments,
  public.accounting_accounts,
  public.accounting_posting_rules,
  public.accounting_journal_entries,
  public.accounting_journal_lines,
  public.accounting_fiscal_periods
from authenticated;

-- Payments and posted financial notes remain writable only through protected RPCs.
revoke insert, update, delete on public.customer_payments, public.purchase_payments from authenticated;
revoke insert, delete on public.invoice_adjustment_notes from authenticated;
grant update (reason) on public.invoice_adjustment_notes to authenticated;
