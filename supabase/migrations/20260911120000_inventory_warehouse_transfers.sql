-- Warehouse transfers move stock quantity and value between locations without accounting entries.
-- This migration does not modify invoices, ZATCA documents, or signed tax data.

create sequence if not exists public.inventory_transfer_number_seq start 1;

create table if not exists public.inventory_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number text not null unique default ('TRF-' || lpad(nextval('public.inventory_transfer_number_seq')::text, 6, '0')),
  transfer_date date not null,
  source_warehouse_id uuid not null references public.inventory_warehouses(id) on update restrict on delete restrict,
  destination_warehouse_id uuid not null references public.inventory_warehouses(id) on update restrict on delete restrict,
  reference text not null default '',
  notes text not null default '',
  status text not null default 'draft' check (status in ('draft', 'posted')),
  posted_at timestamptz,
  posted_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_warehouse_id <> destination_warehouse_id)
);

create table if not exists public.inventory_transfer_lines (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.inventory_transfers(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on update restrict on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_cost numeric(14,4) check (unit_cost is null or unit_cost >= 0),
  created_at timestamptz not null default now(),
  unique (transfer_id, product_id)
);

create index if not exists inventory_transfers_date_status_idx on public.inventory_transfers(transfer_date, status);
create index if not exists inventory_transfers_source_idx on public.inventory_transfers(source_warehouse_id, transfer_date);
create index if not exists inventory_transfers_destination_idx on public.inventory_transfers(destination_warehouse_id, transfer_date);
create index if not exists inventory_transfer_lines_product_idx on public.inventory_transfer_lines(product_id);

alter table public.inventory_transfers enable row level security;
alter table public.inventory_transfer_lines enable row level security;
revoke all on public.inventory_transfers, public.inventory_transfer_lines from public, anon;
revoke insert, update, delete, truncate on public.inventory_transfers, public.inventory_transfer_lines from authenticated;
grant select on public.inventory_transfers, public.inventory_transfer_lines to authenticated;

drop policy if exists inventory_transfers_authorized_select on public.inventory_transfers;
create policy inventory_transfers_authorized_select on public.inventory_transfers for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));
drop policy if exists inventory_transfer_lines_authorized_select on public.inventory_transfer_lines;
create policy inventory_transfer_lines_authorized_select on public.inventory_transfer_lines for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));

create or replace function public.save_inventory_transfer(p_id uuid, p_transfer jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_existing public.inventory_transfers%rowtype;
  v_date date;
  v_source_id uuid;
  v_destination_id uuid;
  v_lines jsonb := p_transfer->'lines';
  v_line jsonb;
  v_product_id uuid;
  v_quantity numeric(14,4);
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  begin
    v_date := (p_transfer->>'transferDate')::date;
    v_source_id := (p_transfer->>'sourceWarehouseId')::uuid;
    v_destination_id := (p_transfer->>'destinationWarehouseId')::uuid;
  exception when others then raise exception 'INVENTORY_TRANSFER_VALUES_INVALID'; end;

  if v_date is null or v_date > current_date then raise exception 'INVENTORY_TRANSFER_DATE_INVALID'; end if;
  if v_source_id = v_destination_id then raise exception 'INVENTORY_TRANSFER_WAREHOUSES_MUST_DIFFER'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = v_source_id and active) then raise exception 'INVENTORY_TRANSFER_SOURCE_INVALID'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = v_destination_id and active) then raise exception 'INVENTORY_TRANSFER_DESTINATION_INVALID'; end if;
  if jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) = 0 then raise exception 'INVENTORY_TRANSFER_LINES_REQUIRED'; end if;
  if jsonb_array_length(v_lines) > 200 then raise exception 'INVENTORY_TRANSFER_LINES_LIMIT'; end if;
  begin
    if (select count(*) from (select (line->>'productId')::uuid from jsonb_array_elements(v_lines) line group by (line->>'productId')::uuid) grouped) <> jsonb_array_length(v_lines) then
      raise exception 'INVENTORY_TRANSFER_DUPLICATE_PRODUCT';
    end if;
  exception when invalid_text_representation then raise exception 'INVENTORY_TRANSFER_LINE_VALUES_INVALID'; end;

  if p_id is not null then
    select * into v_existing from public.inventory_transfers where id = p_id for update;
    if not found then raise exception 'INVENTORY_TRANSFER_NOT_FOUND'; end if;
    if v_existing.status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_TRANSFER_EDITABLE'; end if;
  end if;

  insert into public.inventory_transfers (
    id, transfer_date, source_warehouse_id, destination_warehouse_id, reference, notes, created_by
  ) values (
    v_id, v_date, v_source_id, v_destination_id,
    trim(coalesce(p_transfer->>'reference', '')), trim(coalesce(p_transfer->>'notes', '')), auth.uid()
  ) on conflict (id) do update set
    transfer_date = excluded.transfer_date,
    source_warehouse_id = excluded.source_warehouse_id,
    destination_warehouse_id = excluded.destination_warehouse_id,
    reference = excluded.reference,
    notes = excluded.notes,
    updated_at = now();

  delete from public.inventory_transfer_lines where transfer_id = v_id;
  for v_line in select value from jsonb_array_elements(v_lines) loop
    begin
      v_product_id := (v_line->>'productId')::uuid;
      v_quantity := round((v_line->>'quantity')::numeric, 4);
    exception when others then raise exception 'INVENTORY_TRANSFER_LINE_VALUES_INVALID'; end;
    if v_quantity::text in ('NaN', 'Infinity', '-Infinity') or v_quantity <= 0 then
      raise exception 'INVENTORY_TRANSFER_LINE_VALUES_INVALID';
    end if;
    if not exists (
      select 1 from public.inventory_products
      where id = v_product_id and item_type = 'product' and track_inventory and active
    ) then raise exception 'INVENTORY_TRANSFER_PRODUCT_INVALID'; end if;
    insert into public.inventory_transfer_lines (transfer_id, product_id, quantity)
    values (v_id, v_product_id, v_quantity);
  end loop;
  return v_id;
end;
$$;

create or replace function public.post_inventory_transfer(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer public.inventory_transfers%rowtype;
  v_line public.inventory_transfer_lines%rowtype;
  v_product public.inventory_products%rowtype;
  v_lock record;
  v_stock_quantity numeric(18,4);
  v_stock_value numeric(18,4);
  v_unit_cost numeric(14,4);
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select * into v_transfer from public.inventory_transfers where id = p_id for update;
  if not found then raise exception 'INVENTORY_TRANSFER_NOT_FOUND'; end if;
  if v_transfer.status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_TRANSFER_POSTABLE'; end if;
  if not exists (select 1 from public.inventory_transfer_lines where transfer_id = p_id) then raise exception 'INVENTORY_TRANSFER_LINES_REQUIRED'; end if;
  if v_transfer.source_warehouse_id = v_transfer.destination_warehouse_id then raise exception 'INVENTORY_TRANSFER_WAREHOUSES_MUST_DIFFER'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = v_transfer.source_warehouse_id and active) then raise exception 'INVENTORY_TRANSFER_SOURCE_INVALID'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = v_transfer.destination_warehouse_id and active) then raise exception 'INVENTORY_TRANSFER_DESTINATION_INVALID'; end if;

  -- Lock every product/location pair in deterministic order, including both warehouses.
  for v_lock in
    select distinct line.product_id, warehouse_id
    from public.inventory_transfer_lines line
    cross join lateral (values (v_transfer.source_warehouse_id), (v_transfer.destination_warehouse_id)) locations(warehouse_id)
    where line.transfer_id = p_id
    order by line.product_id, warehouse_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_lock.product_id::text || ':' || v_lock.warehouse_id::text, 0));
  end loop;

  for v_line in select * from public.inventory_transfer_lines where transfer_id = p_id order by product_id loop
    select * into v_product from public.inventory_products
    where id = v_line.product_id and item_type = 'product' and track_inventory and active;
    if not found then raise exception 'INVENTORY_TRANSFER_PRODUCT_INVALID'; end if;

    select
      coalesce(sum(case when movement_type in ('receipt','transfer_in','adjustment_in','opening') then quantity else -quantity end), 0),
      coalesce(sum(case when movement_type in ('receipt','transfer_in','adjustment_in','opening') then quantity * unit_cost else -(quantity * unit_cost) end), 0)
    into v_stock_quantity, v_stock_value
    from public.inventory_stock_movements
    where product_id = v_line.product_id and warehouse_id = v_transfer.source_warehouse_id;

    if v_stock_quantity <= 0 or v_stock_quantity < v_line.quantity then
      raise exception 'INVENTORY_TRANSFER_INSUFFICIENT_STOCK: product=%, available=%, requested=%',
        v_product.sku, v_stock_quantity, v_line.quantity;
    end if;

    v_unit_cost := round(greatest(v_stock_value, 0) / v_stock_quantity, 4);
    update public.inventory_transfer_lines set unit_cost = v_unit_cost where id = v_line.id;

    insert into public.inventory_stock_movements (
      movement_date, movement_type, product_id, warehouse_id, quantity, unit_cost,
      source_table, source_id, journal_entry_id, notes, created_by
    ) values (
      v_transfer.transfer_date, 'transfer_out', v_line.product_id, v_transfer.source_warehouse_id,
      v_line.quantity, v_unit_cost, 'inventory_transfers', p_id::text, null,
      'تحويل مخزون ' || v_transfer.transfer_number, auth.uid()
    );

    insert into public.inventory_stock_movements (
      movement_date, movement_type, product_id, warehouse_id, quantity, unit_cost,
      source_table, source_id, journal_entry_id, notes, created_by
    ) values (
      v_transfer.transfer_date, 'transfer_in', v_line.product_id, v_transfer.destination_warehouse_id,
      v_line.quantity, v_unit_cost, 'inventory_transfers', p_id::text, null,
      'تحويل مخزون ' || v_transfer.transfer_number, auth.uid()
    );
  end loop;

  update public.inventory_transfers
  set status = 'posted', posted_at = now(), posted_by = auth.uid(), updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.delete_inventory_transfer_draft(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select status into v_status from public.inventory_transfers where id = p_id for update;
  if not found then raise exception 'INVENTORY_TRANSFER_NOT_FOUND'; end if;
  if v_status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_TRANSFER_DELETABLE'; end if;
  delete from public.inventory_transfer_lines where transfer_id = p_id;
  delete from public.inventory_transfers where id = p_id;
end;
$$;

revoke all on function public.save_inventory_transfer(uuid, jsonb) from public, anon;
revoke all on function public.post_inventory_transfer(uuid) from public, anon;
revoke all on function public.delete_inventory_transfer_draft(uuid) from public, anon;
grant execute on function public.save_inventory_transfer(uuid, jsonb) to authenticated, service_role;
grant execute on function public.post_inventory_transfer(uuid) to authenticated, service_role;
grant execute on function public.delete_inventory_transfer_draft(uuid) to authenticated, service_role;
