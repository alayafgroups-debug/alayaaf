-- Keep reclassification audit data private and add indexes for account history lookups.

revoke all on public.accounting_reclassifications from anon;
revoke all on public.accounting_reclassification_items from anon;

create index if not exists accounting_reclassifications_source_account_idx
  on public.accounting_reclassifications(source_account_code);
create index if not exists accounting_reclassifications_destination_account_idx
  on public.accounting_reclassifications(destination_account_code);

drop policy if exists accounting_reclassifications_authenticated_select on public.accounting_reclassifications;
create policy accounting_reclassifications_authenticated_select
on public.accounting_reclassifications for select to authenticated
using ((select public.accounting_reclassification_manage_allowed()));

drop policy if exists accounting_reclassification_items_authenticated_select on public.accounting_reclassification_items;
create policy accounting_reclassification_items_authenticated_select
on public.accounting_reclassification_items for select to authenticated
using ((select public.accounting_reclassification_manage_allowed()));
