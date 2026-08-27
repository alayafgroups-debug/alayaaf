-- Physical counts freeze observed variances for audit. They do not change stock or accounting.
-- Inventory differences are posted later through the separate inventory adjustments workflow.

create sequence if not exists public.inventory_count_number_seq start 1;

create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  count_number text not null unique default ('CNT-' || lpad(nextval('public.inventory_count_number_seq')::text, 6, '0')),
  count_date date not null default current_date,
  warehouse_id uuid not null references public.inventory_warehouses(id) on update restrict on delete restrict,
  snapshot_at timestamptz not null,
  notes text not null default '',
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  finalized_at timestamptz,
  finalized_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_count_lines (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.inventory_counts(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on update restrict on delete restrict,
  system_quantity numeric(14,4) not null,
  system_value numeric(18,4) not null,
  unit_cost numeric(14,4) not null check (unit_cost >= 0),
  counted_quantity numeric(14,4) check (counted_quantity is null or counted_quantity >= 0),
  variance_quantity numeric(14,4),
  variance_value numeric(18,2),
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (count_id, product_id)
);

create unique index if not exists inventory_counts_one_draft_per_warehouse_idx
on public.inventory_counts(warehouse_id) where status = 'draft';
create index if not exists inventory_counts_date_status_idx on public.inventory_counts(count_date, status);
create index if not exists inventory_count_lines_product_idx on public.inventory_count_lines(product_id);

alter table public.inventory_counts enable row level security;
alter table public.inventory_count_lines enable row level security;
revoke all on public.inventory_counts, public.inventory_count_lines from public, anon;
revoke insert, update, delete, truncate on public.inventory_counts, public.inventory_count_lines from authenticated;
grant select on public.inventory_counts, public.inventory_count_lines to authenticated;

drop policy if exists inventory_counts_authorized_select on public.inventory_counts;
create policy inventory_counts_authorized_select on public.inventory_counts for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));
drop policy if exists inventory_count_lines_authorized_select on public.inventory_count_lines;
create policy inventory_count_lines_authorized_select on public.inventory_count_lines for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));

create or replace function public.start_inventory_count(p_warehouse_id uuid, p_notes text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_snapshot_at timestamptz;
  v_product public.inventory_products%rowtype;
  v_quantity numeric(18,4);
  v_value numeric(18,4);
  v_unit_cost numeric(14,4);
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = p_warehouse_id and active) then raise exception 'INVENTORY_COUNT_WAREHOUSE_INVALID'; end if;
  if exists (select 1 from public.inventory_counts where warehouse_id = p_warehouse_id and status = 'draft') then raise exception 'INVENTORY_COUNT_DRAFT_ALREADY_EXISTS'; end if;
  if not exists (select 1 from public.inventory_products where item_type = 'product' and track_inventory and active) then raise exception 'INVENTORY_COUNT_PRODUCTS_REQUIRED'; end if;

  -- Prevent ledger inserts while taking one consistent current snapshot.
  lock table public.inventory_stock_movements in share mode;
  v_snapshot_at := clock_timestamp();

  insert into public.inventory_counts (id, count_date, warehouse_id, snapshot_at, notes, created_by)
  values (v_id, current_date, p_warehouse_id, v_snapshot_at, trim(coalesce(p_notes, '')), auth.uid());

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

create or replace function public.save_inventory_count(p_id uuid, p_count jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count public.inventory_counts%rowtype;
  v_lines jsonb := p_count->'lines';
  v_line jsonb;
  v_product_id uuid;
  v_counted numeric(14,4);
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select * into v_count from public.inventory_counts where id = p_id for update;
  if not found then raise exception 'INVENTORY_COUNT_NOT_FOUND'; end if;
  if v_count.status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_COUNT_EDITABLE'; end if;
  if jsonb_typeof(v_lines) <> 'array' then raise exception 'INVENTORY_COUNT_LINES_INVALID'; end if;
  if jsonb_array_length(v_lines) <> (select count(*) from public.inventory_count_lines where count_id = p_id) then raise exception 'INVENTORY_COUNT_LINES_INVALID'; end if;
  begin
    if (select count(*) from (select (line->>'productId')::uuid from jsonb_array_elements(v_lines) line group by (line->>'productId')::uuid) grouped) <> jsonb_array_length(v_lines) then
      raise exception 'INVENTORY_COUNT_DUPLICATE_PRODUCT';
    end if;
  exception when invalid_text_representation then raise exception 'INVENTORY_COUNT_LINE_VALUES_INVALID'; end;

  for v_line in select value from jsonb_array_elements(v_lines) loop
    begin
      v_product_id := (v_line->>'productId')::uuid;
      if v_line->'countedQuantity' is null or jsonb_typeof(v_line->'countedQuantity') = 'null' then
        v_counted := null;
      else
        v_counted := round((v_line->>'countedQuantity')::numeric, 4);
      end if;
    exception when others then raise exception 'INVENTORY_COUNT_LINE_VALUES_INVALID'; end;
    if v_counted is not null and (v_counted::text in ('NaN','Infinity','-Infinity') or v_counted < 0) then raise exception 'INVENTORY_COUNT_LINE_VALUES_INVALID'; end if;
    update public.inventory_count_lines
    set counted_quantity = v_counted,
        notes = trim(coalesce(v_line->>'notes', '')),
        variance_quantity = null,
        variance_value = null
    where count_id = p_id and product_id = v_product_id;
    if not found then raise exception 'INVENTORY_COUNT_PRODUCT_INVALID'; end if;
  end loop;

  update public.inventory_counts
  set notes = trim(coalesce(p_count->>'notes', '')), updated_at = now()
  where id = p_id;
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

  -- Make the stale-snapshot check atomic with finalization.
  lock table public.inventory_stock_movements in share mode;
  if exists (
    select 1 from public.inventory_stock_movements
    where warehouse_id = v_count.warehouse_id and created_at > v_count.snapshot_at
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

create or replace function public.delete_inventory_count_draft(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select status into v_status from public.inventory_counts where id = p_id for update;
  if not found then raise exception 'INVENTORY_COUNT_NOT_FOUND'; end if;
  if v_status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_COUNT_DELETABLE'; end if;
  delete from public.inventory_count_lines where count_id = p_id;
  delete from public.inventory_counts where id = p_id;
end;
$$;

revoke all on function public.start_inventory_count(uuid, text) from public, anon;
revoke all on function public.save_inventory_count(uuid, jsonb) from public, anon;
revoke all on function public.finalize_inventory_count(uuid) from public, anon;
revoke all on function public.delete_inventory_count_draft(uuid) from public, anon;
grant execute on function public.start_inventory_count(uuid, text) to authenticated, service_role;
grant execute on function public.save_inventory_count(uuid, jsonb) to authenticated, service_role;
grant execute on function public.finalize_inventory_count(uuid) to authenticated, service_role;
grant execute on function public.delete_inventory_count_draft(uuid) to authenticated, service_role;
