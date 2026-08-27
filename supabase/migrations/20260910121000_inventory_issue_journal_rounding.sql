-- Keep inventory issue journals exactly balanced by rounding each shared
-- COGS/inventory account pair once, then posting the same amount to both sides.

create or replace function public.post_inventory_issue(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issue public.inventory_issues%rowtype;
  v_line public.inventory_issue_lines%rowtype;
  v_product public.inventory_products%rowtype;
  v_group record;
  v_stock_quantity numeric(18,4);
  v_stock_value numeric(18,4);
  v_unit_cost numeric(14,4);
  v_line_cost numeric(18,2);
  v_total_cost numeric(18,2) := 0;
  v_journal_id uuid;
  v_counterparty text;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select * into v_issue from public.inventory_issues where id = p_id for update;
  if not found then raise exception 'INVENTORY_ISSUE_NOT_FOUND'; end if;
  if v_issue.status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_ISSUE_POSTABLE'; end if;
  if not exists (select 1 from public.inventory_issue_lines where issue_id = p_id) then raise exception 'INVENTORY_ISSUE_LINES_REQUIRED'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = v_issue.warehouse_id and active) then raise exception 'INVENTORY_ISSUE_WAREHOUSE_INVALID'; end if;

  if v_issue.customer_id is not null then
    select name into v_counterparty from public.customers where id = v_issue.customer_id;
    if not found then raise exception 'INVENTORY_ISSUE_CUSTOMER_INVALID'; end if;
  end if;

  for v_line in select * from public.inventory_issue_lines where issue_id = p_id order by product_id loop
    perform pg_advisory_xact_lock(hashtextextended(v_line.product_id::text || ':' || v_issue.warehouse_id::text, 0));
    select * into v_product from public.inventory_products
    where id = v_line.product_id and item_type = 'product' and track_inventory and active;
    if not found then raise exception 'INVENTORY_ISSUE_PRODUCT_INVALID'; end if;

    select
      coalesce(sum(case when movement_type in ('receipt','transfer_in','adjustment_in','opening') then quantity else -quantity end), 0),
      coalesce(sum(case when movement_type in ('receipt','transfer_in','adjustment_in','opening') then quantity * unit_cost else -(quantity * unit_cost) end), 0)
    into v_stock_quantity, v_stock_value
    from public.inventory_stock_movements
    where product_id = v_line.product_id and warehouse_id = v_issue.warehouse_id;

    if v_stock_quantity < v_line.quantity then
      raise exception 'INVENTORY_ISSUE_INSUFFICIENT_STOCK: product=%, available=%, requested=%',
        v_product.sku, v_stock_quantity, v_line.quantity;
    end if;
    if v_stock_quantity <= 0 then raise exception 'INVENTORY_ISSUE_INSUFFICIENT_STOCK: product=%', v_product.sku; end if;

    v_unit_cost := round(greatest(v_stock_value, 0) / v_stock_quantity, 4);
    v_line_cost := round(v_line.quantity * v_unit_cost, 2);
    v_total_cost := v_total_cost + v_line_cost;
    update public.inventory_issue_lines set unit_cost = v_unit_cost where id = v_line.id;
  end loop;

  if v_total_cost > 0 then
    insert into public.accounting_journal_entries (
      entry_date, reference_type, description, status, source_document_table, source_document_id
    ) values (
      v_issue.issue_date, 'inventory_issue', 'تكلفة صرف المخزون ' || v_issue.issue_number,
      'posted', 'inventory_issues', p_id::text
    ) returning id into v_journal_id;

    for v_group in
      select product.cogs_account_code, product.inventory_account_code,
        round(sum(line.quantity * line.unit_cost), 2) as amount
      from public.inventory_issue_lines line
      join public.inventory_products product on product.id = line.product_id
      where line.issue_id = p_id
      group by product.cogs_account_code, product.inventory_account_code
      order by product.cogs_account_code, product.inventory_account_code
    loop
      if v_group.amount > 0 then
        insert into public.accounting_journal_lines (
          journal_entry_id, account_code, account_name, debit, credit, counterparty
        ) values (
          v_journal_id, v_group.cogs_account_code,
          public.account_name_for_posting(v_group.cogs_account_code),
          v_group.amount, 0, v_counterparty
        );
        insert into public.accounting_journal_lines (
          journal_entry_id, account_code, account_name, debit, credit, counterparty
        ) values (
          v_journal_id, v_group.inventory_account_code,
          public.account_name_for_posting(v_group.inventory_account_code),
          0, v_group.amount, v_counterparty
        );
      end if;
    end loop;
  end if;

  for v_line in select * from public.inventory_issue_lines where issue_id = p_id order by created_at, id loop
    insert into public.inventory_stock_movements (
      movement_date, movement_type, product_id, warehouse_id, quantity, unit_cost,
      source_table, source_id, journal_entry_id, notes, created_by
    ) values (
      v_issue.issue_date, 'issue', v_line.product_id, v_issue.warehouse_id,
      v_line.quantity, coalesce(v_line.unit_cost, 0), 'inventory_issues', p_id::text,
      v_journal_id, case when v_issue.issue_type = 'delivery' then 'إشعار تسليم ' else 'سند صرف ' end || v_issue.issue_number,
      auth.uid()
    );
  end loop;

  update public.inventory_issues
  set status = 'posted', accounting_status = case when v_journal_id is null then 'not_required' else 'posted' end,
      accounting_journal_entry_id = v_journal_id, posted_at = now(), posted_by = auth.uid(), updated_at = now()
  where id = p_id;
  return v_journal_id;
end;
$$;

revoke all on function public.post_inventory_issue(uuid) from public, anon;
grant execute on function public.post_inventory_issue(uuid) to authenticated, service_role;
