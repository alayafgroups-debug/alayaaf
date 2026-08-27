-- Inventory issue vouchers and customer delivery notices.
-- The posted issue is the sole owner of stock reduction and COGS accounting.
-- Sales invoices remain unchanged and continue to post receivable, revenue, and VAT only.
-- This migration does not modify signed invoices, XML, QR, ICV, PIH, or ZATCA submission data.

create sequence if not exists public.inventory_issue_number_seq start 1;

create table if not exists public.inventory_issues (
  id uuid primary key default gen_random_uuid(),
  issue_number text not null unique default ('ISS-' || lpad(nextval('public.inventory_issue_number_seq')::text, 6, '0')),
  issue_date date not null,
  issue_type text not null default 'issue' check (issue_type in ('issue', 'delivery')),
  warehouse_id uuid not null references public.inventory_warehouses(id) on update restrict on delete restrict,
  customer_id text references public.customers(id) on update restrict on delete restrict,
  sales_invoice_id text references public.sales_invoices(id) on update restrict on delete restrict,
  destination text not null default '',
  reference text not null default '',
  notes text not null default '',
  status text not null default 'draft' check (status in ('draft', 'posted')),
  accounting_status text not null default 'pending' check (accounting_status in ('pending', 'posted', 'not_required')),
  accounting_journal_entry_id uuid unique references public.accounting_journal_entries(id) on delete restrict,
  posted_at timestamptz,
  posted_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (issue_type <> 'delivery' or customer_id is not null)
);

create table if not exists public.inventory_issue_lines (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.inventory_issues(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on update restrict on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_cost numeric(14,4) check (unit_cost is null or unit_cost >= 0),
  created_at timestamptz not null default now(),
  unique (issue_id, product_id)
);

create index if not exists inventory_issues_date_status_idx on public.inventory_issues(issue_date, status);
create index if not exists inventory_issues_warehouse_idx on public.inventory_issues(warehouse_id, issue_date);
create index if not exists inventory_issues_customer_idx on public.inventory_issues(customer_id) where customer_id is not null;
create index if not exists inventory_issues_sales_invoice_idx on public.inventory_issues(sales_invoice_id) where sales_invoice_id is not null;
create index if not exists inventory_issue_lines_product_idx on public.inventory_issue_lines(product_id);

alter table public.inventory_issues enable row level security;
alter table public.inventory_issue_lines enable row level security;
revoke all on public.inventory_issues, public.inventory_issue_lines from public, anon;
revoke insert, update, delete, truncate on public.inventory_issues, public.inventory_issue_lines from authenticated;
grant select on public.inventory_issues, public.inventory_issue_lines to authenticated;

drop policy if exists inventory_issues_authorized_select on public.inventory_issues;
create policy inventory_issues_authorized_select on public.inventory_issues for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));
drop policy if exists inventory_issue_lines_authorized_select on public.inventory_issue_lines;
create policy inventory_issue_lines_authorized_select on public.inventory_issue_lines for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));

create or replace function public.save_inventory_issue(p_id uuid, p_issue jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_existing public.inventory_issues%rowtype;
  v_date date;
  v_type text := trim(coalesce(p_issue->>'issueType', 'issue'));
  v_warehouse_id uuid;
  v_customer_id text := nullif(trim(coalesce(p_issue->>'customerId', '')), '');
  v_sales_invoice_id text := nullif(trim(coalesce(p_issue->>'salesInvoiceId', '')), '');
  v_invoice_customer_id text;
  v_lines jsonb := p_issue->'lines';
  v_line jsonb;
  v_product_id uuid;
  v_quantity numeric(14,4);
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  begin
    v_date := (p_issue->>'issueDate')::date;
    v_warehouse_id := (p_issue->>'warehouseId')::uuid;
  exception when others then raise exception 'INVENTORY_ISSUE_VALUES_INVALID'; end;
  if v_date is null or v_date > current_date then raise exception 'INVENTORY_ISSUE_DATE_INVALID'; end if;
  if v_type not in ('issue', 'delivery') then raise exception 'INVENTORY_ISSUE_TYPE_INVALID'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = v_warehouse_id and active) then raise exception 'INVENTORY_ISSUE_WAREHOUSE_INVALID'; end if;
  if v_customer_id is not null and not exists (select 1 from public.customers where id = v_customer_id) then raise exception 'INVENTORY_ISSUE_CUSTOMER_INVALID'; end if;
  if v_type = 'delivery' and v_customer_id is null then raise exception 'INVENTORY_DELIVERY_CUSTOMER_REQUIRED'; end if;

  if v_sales_invoice_id is not null then
    select customer_id into v_invoice_customer_id from public.sales_invoices where id = v_sales_invoice_id;
    if not found then raise exception 'INVENTORY_ISSUE_SALES_INVOICE_INVALID'; end if;
    if v_invoice_customer_id is not null and v_customer_id is distinct from v_invoice_customer_id then
      raise exception 'INVENTORY_ISSUE_INVOICE_CUSTOMER_MISMATCH';
    end if;
  end if;

  if jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) = 0 then raise exception 'INVENTORY_ISSUE_LINES_REQUIRED'; end if;
  if jsonb_array_length(v_lines) > 200 then raise exception 'INVENTORY_ISSUE_LINES_LIMIT'; end if;
  if (select count(*) from (select (line->>'productId')::uuid from jsonb_array_elements(v_lines) line group by (line->>'productId')::uuid) grouped) <> jsonb_array_length(v_lines) then
    raise exception 'INVENTORY_ISSUE_DUPLICATE_PRODUCT';
  end if;

  if p_id is not null then
    select * into v_existing from public.inventory_issues where id = p_id for update;
    if not found then raise exception 'INVENTORY_ISSUE_NOT_FOUND'; end if;
    if v_existing.status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_ISSUE_EDITABLE'; end if;
  end if;

  insert into public.inventory_issues (
    id, issue_date, issue_type, warehouse_id, customer_id, sales_invoice_id,
    destination, reference, notes, created_by
  ) values (
    v_id, v_date, v_type, v_warehouse_id, v_customer_id, v_sales_invoice_id,
    trim(coalesce(p_issue->>'destination', '')), trim(coalesce(p_issue->>'reference', '')),
    trim(coalesce(p_issue->>'notes', '')), auth.uid()
  ) on conflict (id) do update set
    issue_date = excluded.issue_date, issue_type = excluded.issue_type,
    warehouse_id = excluded.warehouse_id, customer_id = excluded.customer_id,
    sales_invoice_id = excluded.sales_invoice_id, destination = excluded.destination,
    reference = excluded.reference, notes = excluded.notes, updated_at = now();

  delete from public.inventory_issue_lines where issue_id = v_id;
  for v_line in select value from jsonb_array_elements(v_lines) loop
    begin
      v_product_id := (v_line->>'productId')::uuid;
      v_quantity := round((v_line->>'quantity')::numeric, 4);
    exception when others then raise exception 'INVENTORY_ISSUE_LINE_VALUES_INVALID'; end;
    if v_quantity::text in ('NaN','Infinity','-Infinity') or v_quantity <= 0 then
      raise exception 'INVENTORY_ISSUE_LINE_VALUES_INVALID';
    end if;
    if not exists (
      select 1 from public.inventory_products
      where id = v_product_id and item_type = 'product' and track_inventory and active
    ) then raise exception 'INVENTORY_ISSUE_PRODUCT_INVALID'; end if;
    insert into public.inventory_issue_lines (issue_id, product_id, quantity)
    values (v_id, v_product_id, v_quantity);
  end loop;
  return v_id;
end;
$$;

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

  -- Lock product/warehouse pairs in a stable order so simultaneous issues cannot overspend stock.
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

    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
    select v_journal_id, product.cogs_account_code,
      public.account_name_for_posting(product.cogs_account_code),
      round(sum(line.quantity * line.unit_cost), 2), 0, v_counterparty
    from public.inventory_issue_lines line
    join public.inventory_products product on product.id = line.product_id
    where line.issue_id = p_id
    group by product.cogs_account_code;

    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
    select v_journal_id, product.inventory_account_code,
      public.account_name_for_posting(product.inventory_account_code),
      0, round(sum(line.quantity * line.unit_cost), 2), v_counterparty
    from public.inventory_issue_lines line
    join public.inventory_products product on product.id = line.product_id
    where line.issue_id = p_id
    group by product.inventory_account_code;
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

create or replace function public.delete_inventory_issue_draft(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select status into v_status from public.inventory_issues where id = p_id for update;
  if not found then raise exception 'INVENTORY_ISSUE_NOT_FOUND'; end if;
  if v_status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_ISSUE_DELETABLE'; end if;
  delete from public.inventory_issue_lines where issue_id = p_id;
  delete from public.inventory_issues where id = p_id;
end;
$$;

revoke all on function public.save_inventory_issue(uuid, jsonb) from public, anon;
revoke all on function public.post_inventory_issue(uuid) from public, anon;
revoke all on function public.delete_inventory_issue_draft(uuid) from public, anon;
grant execute on function public.save_inventory_issue(uuid, jsonb) to authenticated, service_role;
grant execute on function public.post_inventory_issue(uuid) to authenticated, service_role;
grant execute on function public.delete_inventory_issue_draft(uuid) to authenticated, service_role;
