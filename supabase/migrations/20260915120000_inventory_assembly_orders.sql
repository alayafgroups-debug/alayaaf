-- Inventory assembly orders and component lists.
-- This migration does not modify invoices, ZATCA documents, or signed tax data.

create sequence if not exists public.inventory_assembly_bom_number_seq start 1;
create sequence if not exists public.inventory_assembly_number_seq start 1;

create table if not exists public.inventory_assembly_boms (
  id uuid primary key default gen_random_uuid(),
  bom_number text not null unique default ('ASB-' || lpad(nextval('public.inventory_assembly_bom_number_seq')::text, 6, '0')),
  finished_product_id uuid not null references public.inventory_products(id) on update restrict on delete restrict,
  output_quantity numeric(14,4) not null default 1 check (output_quantity > 0),
  notes text not null default '',
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_assembly_bom_lines (
  id uuid primary key default gen_random_uuid(),
  bom_id uuid not null references public.inventory_assembly_boms(id) on delete restrict,
  component_product_id uuid not null references public.inventory_products(id) on update restrict on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (bom_id, component_product_id)
);

create table if not exists public.inventory_assembly_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('ASM-' || lpad(nextval('public.inventory_assembly_number_seq')::text, 6, '0')),
  order_date date not null,
  bom_id uuid not null references public.inventory_assembly_boms(id) on update restrict on delete restrict,
  finished_product_id uuid not null references public.inventory_products(id) on update restrict on delete restrict,
  warehouse_id uuid not null references public.inventory_warehouses(id) on update restrict on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  reference text not null default '',
  notes text not null default '',
  status text not null default 'draft' check (status in ('draft', 'posted')),
  accounting_status text not null default 'pending' check (accounting_status in ('pending', 'posted', 'not_required')),
  accounting_journal_entry_id uuid references public.accounting_journal_entries(id) on update restrict on delete restrict,
  total_cost numeric(18,2),
  posted_at timestamptz,
  posted_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_assembly_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.inventory_assembly_orders(id) on delete restrict,
  component_product_id uuid not null references public.inventory_products(id) on update restrict on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_cost numeric(14,4) check (unit_cost is null or unit_cost >= 0),
  amount numeric(18,2) check (amount is null or amount >= 0),
  created_at timestamptz not null default now(),
  unique (order_id, component_product_id)
);

create index if not exists inventory_assembly_boms_finished_product_idx on public.inventory_assembly_boms(finished_product_id, active);
create index if not exists inventory_assembly_bom_lines_component_idx on public.inventory_assembly_bom_lines(component_product_id);
create index if not exists inventory_assembly_orders_date_status_idx on public.inventory_assembly_orders(order_date, status);
create index if not exists inventory_assembly_orders_warehouse_idx on public.inventory_assembly_orders(warehouse_id, order_date);
create index if not exists inventory_assembly_order_lines_component_idx on public.inventory_assembly_order_lines(component_product_id);
create index if not exists inventory_assembly_orders_bom_idx on public.inventory_assembly_orders(bom_id);
create index if not exists inventory_assembly_orders_finished_product_idx on public.inventory_assembly_orders(finished_product_id);
create index if not exists inventory_assembly_orders_journal_idx on public.inventory_assembly_orders(accounting_journal_entry_id)
where accounting_journal_entry_id is not null;

alter table public.inventory_assembly_boms enable row level security;
alter table public.inventory_assembly_bom_lines enable row level security;
alter table public.inventory_assembly_orders enable row level security;
alter table public.inventory_assembly_order_lines enable row level security;

revoke all on public.inventory_assembly_boms, public.inventory_assembly_bom_lines, public.inventory_assembly_orders, public.inventory_assembly_order_lines from public, anon;
revoke insert, update, delete, truncate on public.inventory_assembly_boms, public.inventory_assembly_bom_lines, public.inventory_assembly_orders, public.inventory_assembly_order_lines from authenticated;
grant select on public.inventory_assembly_boms, public.inventory_assembly_bom_lines, public.inventory_assembly_orders, public.inventory_assembly_order_lines to authenticated;

drop policy if exists inventory_assembly_boms_authorized_select on public.inventory_assembly_boms;
create policy inventory_assembly_boms_authorized_select on public.inventory_assembly_boms for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));
drop policy if exists inventory_assembly_bom_lines_authorized_select on public.inventory_assembly_bom_lines;
create policy inventory_assembly_bom_lines_authorized_select on public.inventory_assembly_bom_lines for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));
drop policy if exists inventory_assembly_orders_authorized_select on public.inventory_assembly_orders;
create policy inventory_assembly_orders_authorized_select on public.inventory_assembly_orders for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));
drop policy if exists inventory_assembly_order_lines_authorized_select on public.inventory_assembly_order_lines;
create policy inventory_assembly_order_lines_authorized_select on public.inventory_assembly_order_lines for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));

create or replace function public.save_inventory_assembly_bom(p_id uuid, p_bom jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_existing public.inventory_assembly_boms%rowtype;
  v_finished_product_id uuid;
  v_output_quantity numeric(14,4);
  v_lines jsonb := p_bom->'lines';
  v_line jsonb;
  v_component_id uuid;
  v_component_quantity numeric(14,4);
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  begin
    v_finished_product_id := (p_bom->>'finishedProductId')::uuid;
    v_output_quantity := round((p_bom->>'outputQuantity')::numeric, 4);
  exception when others then raise exception 'INVENTORY_ASSEMBLY_BOM_VALUES_INVALID'; end;
  if v_output_quantity::text in ('NaN','Infinity','-Infinity') or v_output_quantity <= 0 then raise exception 'INVENTORY_ASSEMBLY_BOM_VALUES_INVALID'; end if;
  if not exists (select 1 from public.inventory_products where id = v_finished_product_id and item_type = 'product' and track_inventory and active) then raise exception 'INVENTORY_ASSEMBLY_BOM_FINISHED_PRODUCT_INVALID'; end if;
  if jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) = 0 then raise exception 'INVENTORY_ASSEMBLY_BOM_LINES_REQUIRED'; end if;
  if jsonb_array_length(v_lines) > 200 then raise exception 'INVENTORY_ASSEMBLY_BOM_LINES_LIMIT'; end if;
  begin
    if (select count(*) from (select (line->>'productId')::uuid from jsonb_array_elements(v_lines) line group by (line->>'productId')::uuid) grouped) <> jsonb_array_length(v_lines) then
      raise exception 'INVENTORY_ASSEMBLY_BOM_DUPLICATE_COMPONENT';
    end if;
  exception when invalid_text_representation then raise exception 'INVENTORY_ASSEMBLY_BOM_LINE_VALUES_INVALID'; end;

  if p_id is not null then
    select * into v_existing from public.inventory_assembly_boms where id = p_id for update;
    if not found then raise exception 'INVENTORY_ASSEMBLY_BOM_NOT_FOUND'; end if;
    if exists (select 1 from public.inventory_assembly_orders where bom_id = p_id and status = 'posted') then raise exception 'USED_INVENTORY_ASSEMBLY_BOM_IMMUTABLE'; end if;
  end if;

  insert into public.inventory_assembly_boms (id, finished_product_id, output_quantity, notes, active, created_by)
  values (v_id, v_finished_product_id, v_output_quantity, trim(coalesce(p_bom->>'notes', '')), coalesce((p_bom->>'active')::boolean, true), auth.uid())
  on conflict (id) do update set finished_product_id = excluded.finished_product_id, output_quantity = excluded.output_quantity,
    notes = excluded.notes, active = excluded.active, updated_at = now();

  delete from public.inventory_assembly_bom_lines where bom_id = v_id;
  for v_line in select value from jsonb_array_elements(v_lines) loop
    begin
      v_component_id := (v_line->>'productId')::uuid;
      v_component_quantity := round((v_line->>'quantity')::numeric, 4);
    exception when others then raise exception 'INVENTORY_ASSEMBLY_BOM_LINE_VALUES_INVALID'; end;
    if v_component_quantity::text in ('NaN','Infinity','-Infinity') or v_component_quantity <= 0 or v_component_id = v_finished_product_id then raise exception 'INVENTORY_ASSEMBLY_BOM_LINE_VALUES_INVALID'; end if;
    if not exists (select 1 from public.inventory_products where id = v_component_id and item_type = 'product' and track_inventory and active) then raise exception 'INVENTORY_ASSEMBLY_BOM_COMPONENT_INVALID'; end if;
    insert into public.inventory_assembly_bom_lines (bom_id, component_product_id, quantity) values (v_id, v_component_id, v_component_quantity);
  end loop;
  return v_id;
end;
$$;

create or replace function public.save_inventory_assembly_order(p_id uuid, p_order jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_existing public.inventory_assembly_orders%rowtype;
  v_bom public.inventory_assembly_boms%rowtype;
  v_date date;
  v_bom_id uuid;
  v_warehouse_id uuid;
  v_quantity numeric(14,4);
  v_line public.inventory_assembly_bom_lines%rowtype;
  v_required_quantity numeric(14,4);
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  begin
    v_date := (p_order->>'orderDate')::date;
    v_bom_id := (p_order->>'bomId')::uuid;
    v_warehouse_id := (p_order->>'warehouseId')::uuid;
    v_quantity := round((p_order->>'quantity')::numeric, 4);
  exception when others then raise exception 'INVENTORY_ASSEMBLY_VALUES_INVALID'; end;
  if v_date is null or v_date > current_date or v_quantity::text in ('NaN','Infinity','-Infinity') or v_quantity <= 0 then raise exception 'INVENTORY_ASSEMBLY_VALUES_INVALID'; end if;
  select * into v_bom from public.inventory_assembly_boms where id = v_bom_id and active;
  if not found then raise exception 'INVENTORY_ASSEMBLY_BOM_INVALID'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = v_warehouse_id and active) then raise exception 'INVENTORY_ASSEMBLY_WAREHOUSE_INVALID'; end if;
  if not exists (select 1 from public.inventory_assembly_bom_lines where bom_id = v_bom_id) then raise exception 'INVENTORY_ASSEMBLY_BOM_LINES_REQUIRED'; end if;

  if p_id is not null then
    select * into v_existing from public.inventory_assembly_orders where id = p_id for update;
    if not found then raise exception 'INVENTORY_ASSEMBLY_ORDER_NOT_FOUND'; end if;
    if v_existing.status <> 'draft' then raise exception 'ONLY_DRAFT_ASSEMBLY_ORDER_EDITABLE'; end if;
  end if;

  insert into public.inventory_assembly_orders (id, order_date, bom_id, finished_product_id, warehouse_id, quantity, reference, notes, created_by)
  values (v_id, v_date, v_bom_id, v_bom.finished_product_id, v_warehouse_id, v_quantity, trim(coalesce(p_order->>'reference', '')), trim(coalesce(p_order->>'notes', '')), auth.uid())
  on conflict (id) do update set order_date = excluded.order_date, bom_id = excluded.bom_id, finished_product_id = excluded.finished_product_id,
    warehouse_id = excluded.warehouse_id, quantity = excluded.quantity, reference = excluded.reference, notes = excluded.notes, updated_at = now();

  delete from public.inventory_assembly_order_lines where order_id = v_id;
  for v_line in select * from public.inventory_assembly_bom_lines where bom_id = v_bom_id order by component_product_id loop
    v_required_quantity := round(v_line.quantity * v_quantity / v_bom.output_quantity, 4);
    if v_required_quantity <= 0 then raise exception 'INVENTORY_ASSEMBLY_COMPONENT_QUANTITY_INVALID'; end if;
    insert into public.inventory_assembly_order_lines (order_id, component_product_id, quantity)
    values (v_id, v_line.component_product_id, v_required_quantity);
  end loop;
  return v_id;
end;
$$;

create or replace function public.post_inventory_assembly_order(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.inventory_assembly_orders%rowtype;
  v_line public.inventory_assembly_order_lines%rowtype;
  v_product public.inventory_products%rowtype;
  v_finished_product public.inventory_products%rowtype;
  v_lock record;
  v_stock_quantity numeric(18,4);
  v_stock_value numeric(18,4);
  v_unit_cost numeric(14,4);
  v_line_amount numeric(18,2);
  v_total_cost numeric(18,2) := 0;
  v_finished_unit_cost numeric(14,4);
  v_journal_id uuid;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select * into v_order from public.inventory_assembly_orders where id = p_id for update;
  if not found then raise exception 'INVENTORY_ASSEMBLY_ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'draft' then raise exception 'ONLY_DRAFT_ASSEMBLY_ORDER_POSTABLE'; end if;
  if not exists (select 1 from public.inventory_assembly_order_lines where order_id = p_id) then raise exception 'INVENTORY_ASSEMBLY_LINES_REQUIRED'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = v_order.warehouse_id and active) then raise exception 'INVENTORY_ASSEMBLY_WAREHOUSE_INVALID'; end if;
  select * into v_finished_product from public.inventory_products where id = v_order.finished_product_id and item_type = 'product' and track_inventory and active;
  if not found or nullif(trim(v_finished_product.inventory_account_code), '') is null then raise exception 'INVENTORY_ASSEMBLY_FINISHED_PRODUCT_INVALID'; end if;

  for v_lock in
    select distinct product_id from (
      select component_product_id as product_id from public.inventory_assembly_order_lines where order_id = p_id
      union all select v_order.finished_product_id
    ) products order by product_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_lock.product_id::text || ':' || v_order.warehouse_id::text, 0));
  end loop;

  for v_line in select * from public.inventory_assembly_order_lines where order_id = p_id order by component_product_id loop
    select * into v_product from public.inventory_products where id = v_line.component_product_id and item_type = 'product' and track_inventory and active;
    if not found or nullif(trim(v_product.inventory_account_code), '') is null then raise exception 'INVENTORY_ASSEMBLY_COMPONENT_INVALID'; end if;
    select
      coalesce(sum(case when movement_type in ('receipt','transfer_in','adjustment_in','opening') then quantity else -quantity end), 0),
      coalesce(sum(case when movement_type in ('receipt','transfer_in','adjustment_in','opening') then quantity * unit_cost else -(quantity * unit_cost) end), 0)
    into v_stock_quantity, v_stock_value
    from public.inventory_stock_movements where product_id = v_line.component_product_id and warehouse_id = v_order.warehouse_id;
    if v_stock_quantity <= 0 or v_stock_quantity < v_line.quantity then
      raise exception 'INVENTORY_ASSEMBLY_INSUFFICIENT_STOCK: product=%, available=%, required=%', v_product.sku, v_stock_quantity, v_line.quantity;
    end if;
    v_unit_cost := round(greatest(v_stock_value, 0) / v_stock_quantity, 4);
    v_line_amount := round(v_line.quantity * v_unit_cost, 2);
    v_total_cost := v_total_cost + v_line_amount;
    update public.inventory_assembly_order_lines set unit_cost = v_unit_cost, amount = v_line_amount where id = v_line.id;
  end loop;

  if v_total_cost > 0 then
    insert into public.accounting_journal_entries (entry_date, reference_type, description, status, source_document_table, source_document_id)
    values (v_order.order_date, 'inventory_assembly', 'تكلفة أمر التركيب ' || v_order.order_number, 'posted', 'inventory_assembly_orders', p_id::text)
    returning id into v_journal_id;

    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit)
    values (v_journal_id, v_finished_product.inventory_account_code, public.account_name_for_posting(v_finished_product.inventory_account_code), v_total_cost, 0);

    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit)
    select v_journal_id, product.inventory_account_code, public.account_name_for_posting(product.inventory_account_code), 0, round(sum(line.amount), 2)
    from public.inventory_assembly_order_lines line
    join public.inventory_products product on product.id = line.component_product_id
    where line.order_id = p_id
    group by product.inventory_account_code;
  end if;

  for v_line in select * from public.inventory_assembly_order_lines where order_id = p_id order by created_at, id loop
    insert into public.inventory_stock_movements (movement_date, movement_type, product_id, warehouse_id, quantity, unit_cost, source_table, source_id, journal_entry_id, notes, created_by)
    values (v_order.order_date, 'issue', v_line.component_product_id, v_order.warehouse_id, v_line.quantity, coalesce(v_line.unit_cost, 0),
      'inventory_assembly_orders', p_id::text, v_journal_id, 'صرف مكونات أمر تركيب ' || v_order.order_number, auth.uid());
  end loop;

  v_finished_unit_cost := case when v_order.quantity > 0 then round(v_total_cost / v_order.quantity, 4) else 0 end;
  insert into public.inventory_stock_movements (movement_date, movement_type, product_id, warehouse_id, quantity, unit_cost, source_table, source_id, journal_entry_id, notes, created_by)
  values (v_order.order_date, 'receipt', v_order.finished_product_id, v_order.warehouse_id, v_order.quantity, v_finished_unit_cost,
    'inventory_assembly_orders', p_id::text, v_journal_id, 'استلام منتج أمر تركيب ' || v_order.order_number, auth.uid());

  update public.inventory_assembly_orders
  set status = 'posted', accounting_status = case when v_journal_id is null then 'not_required' else 'posted' end,
    accounting_journal_entry_id = v_journal_id, total_cost = v_total_cost, posted_at = now(), posted_by = auth.uid(), updated_at = now()
  where id = p_id;
  return v_journal_id;
end;
$$;

create or replace function public.delete_inventory_assembly_order_draft(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select status into v_status from public.inventory_assembly_orders where id = p_id for update;
  if not found then raise exception 'INVENTORY_ASSEMBLY_ORDER_NOT_FOUND'; end if;
  if v_status <> 'draft' then raise exception 'ONLY_DRAFT_ASSEMBLY_ORDER_DELETABLE'; end if;
  delete from public.inventory_assembly_order_lines where order_id = p_id;
  delete from public.inventory_assembly_orders where id = p_id;
end;
$$;

revoke all on function public.save_inventory_assembly_bom(uuid, jsonb) from public, anon;
revoke all on function public.save_inventory_assembly_order(uuid, jsonb) from public, anon;
revoke all on function public.post_inventory_assembly_order(uuid) from public, anon;
revoke all on function public.delete_inventory_assembly_order_draft(uuid) from public, anon;
grant execute on function public.save_inventory_assembly_bom(uuid, jsonb) to authenticated, service_role;
grant execute on function public.save_inventory_assembly_order(uuid, jsonb) to authenticated, service_role;
grant execute on function public.post_inventory_assembly_order(uuid) to authenticated, service_role;
grant execute on function public.delete_inventory_assembly_order_draft(uuid) to authenticated, service_role;
