-- Use the monotonic inventory movement sequence for stale-count detection.
-- Transaction timestamps can predate a snapshot when a long transaction inserts afterward.

alter table public.inventory_counts
add column if not exists snapshot_movement_seq bigint not null default 0;

create or replace function public.start_inventory_count(p_warehouse_id uuid, p_notes text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_snapshot_at timestamptz;
  v_snapshot_movement_seq bigint;
  v_product public.inventory_products%rowtype;
  v_quantity numeric(18,4);
  v_value numeric(18,4);
  v_unit_cost numeric(14,4);
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = p_warehouse_id and active) then raise exception 'INVENTORY_COUNT_WAREHOUSE_INVALID'; end if;
  if exists (select 1 from public.inventory_counts where warehouse_id = p_warehouse_id and status = 'draft') then raise exception 'INVENTORY_COUNT_DRAFT_ALREADY_EXISTS'; end if;
  if not exists (select 1 from public.inventory_products where item_type = 'product' and track_inventory and active) then raise exception 'INVENTORY_COUNT_PRODUCTS_REQUIRED'; end if;

  lock table public.inventory_stock_movements in share mode;
  v_snapshot_at := clock_timestamp();
  select case when is_called then last_value else 0 end
  into v_snapshot_movement_seq
  from public.inventory_movement_number_seq;

  insert into public.inventory_counts (
    id, count_date, warehouse_id, snapshot_at, snapshot_movement_seq, notes, created_by
  ) values (
    v_id, current_date, p_warehouse_id, v_snapshot_at, v_snapshot_movement_seq,
    trim(coalesce(p_notes, '')), auth.uid()
  );

  for v_product in
    select * from public.inventory_products
    where item_type = 'product' and track_inventory and active
    order by sku, id
  loop
    select
      coalesce(sum(case when movement_type in ('receipt','transfer_in','adjustment_in','opening') then quantity else -quantity end), 0),
      coalesce(sum(case when movement_type in ('receipt','transfer_in','adjustment_in','opening') then quantity * unit_cost else -(quantity * unit_cost) end), 0)
    into v_quantity, v_value
    from public.inventory_stock_movements
    where product_id = v_product.id and warehouse_id = p_warehouse_id;

    v_unit_cost := case when v_quantity > 0 then round(greatest(v_value, 0) / v_quantity, 4) else 0 end;
    insert into public.inventory_count_lines (
      count_id, product_id, system_quantity, system_value, unit_cost
    ) values (
      v_id, v_product.id, v_quantity, v_value, v_unit_cost
    );
  end loop;
  return v_id;
end;
$$;

create or replace function public.finalize_inventory_count(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count public.inventory_counts%rowtype;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select * into v_count from public.inventory_counts where id = p_id for update;
  if not found then raise exception 'INVENTORY_COUNT_NOT_FOUND'; end if;
  if v_count.status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_COUNT_FINALIZABLE'; end if;
  if exists (select 1 from public.inventory_count_lines where count_id = p_id and counted_quantity is null) then raise exception 'INVENTORY_COUNT_ALL_QUANTITIES_REQUIRED'; end if;

  lock table public.inventory_stock_movements in share mode;
  if exists (
    select 1 from public.inventory_stock_movements
    where warehouse_id = v_count.warehouse_id
      and substring(movement_number from 4)::bigint > v_count.snapshot_movement_seq
  ) then raise exception 'INVENTORY_COUNT_STALE_SNAPSHOT'; end if;

  update public.inventory_count_lines
  set variance_quantity = round(counted_quantity - system_quantity, 4),
      variance_value = round((counted_quantity - system_quantity) * unit_cost, 2)
  where count_id = p_id;

  update public.inventory_counts
  set status = 'finalized', finalized_at = now(), finalized_by = auth.uid(), updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.start_inventory_count(uuid, text) from public, anon;
revoke all on function public.finalize_inventory_count(uuid) from public, anon;
grant execute on function public.start_inventory_count(uuid, text) to authenticated, service_role;
grant execute on function public.finalize_inventory_count(uuid) to authenticated, service_role;
