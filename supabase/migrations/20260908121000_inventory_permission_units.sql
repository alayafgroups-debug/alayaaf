-- Align inventory authorization with the role editor and preserve historical quantity units.

create or replace function public.inventory_access_allowed(p_permission text, p_manage boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'service_role' or exists (
    select 1
    from public.employees employee
    left join public.user_roles role on role.name_ar = employee.employee_role and role.status = 'فعال'
    where lower(employee.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (
        employee.employee_role in ('مدير النظام', 'مدير عام', 'المدير العام')
        or case when p_manage
          then coalesce(role.permissions ->> p_permission, '') in ('true', 'manage')
            or coalesce(role.permissions ->> 'module.inventory', '') in ('true', 'manage')
          else coalesce(role.permissions ->> p_permission, '') in ('true', 'read', 'manage')
            or coalesce(role.permissions ->> 'module.inventory', '') in ('true', 'read', 'manage')
        end
      )
  );
$$;

alter policy inventory_products_authorized_select on public.inventory_products
using ((select public.inventory_access_allowed('inventory.items', false)));
alter policy inventory_warehouses_authorized_select on public.inventory_warehouses
using ((select public.inventory_access_allowed('inventory.warehouses', false)));
alter policy inventory_stock_movements_authorized_select on public.inventory_stock_movements
using ((select public.inventory_access_allowed('inventory.movements', false)) or (select public.inventory_access_allowed('inventory.reports', false)));

create or replace function public.save_inventory_product(p_id uuid, p_product jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_existing public.inventory_products%rowtype;
  v_sku text := upper(trim(coalesce(p_product->>'sku', '')));
  v_name text := trim(p_product->>'nameAr');
  v_name_en text := trim(coalesce(p_product->>'nameEn', ''));
  v_type text := trim(p_product->>'itemType');
  v_unit text := trim(p_product->>'unit');
  v_inventory_account text := nullif(trim(coalesce(p_product->>'inventoryAccountCode', '')), '');
  v_cogs_account text := nullif(trim(coalesce(p_product->>'cogsAccountCode', '')), '');
  v_revenue_account text := trim(p_product->>'revenueAccountCode');
  v_active boolean := coalesce((p_product->>'active')::boolean, true);
begin
  if not public.inventory_access_allowed('inventory.items', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  if v_name is null or v_name = '' then raise exception 'INVENTORY_PRODUCT_NAME_REQUIRED'; end if;
  if v_type not in ('product', 'service') then raise exception 'INVENTORY_PRODUCT_TYPE_INVALID'; end if;
  if v_unit is null or v_unit = '' then raise exception 'INVENTORY_PRODUCT_UNIT_REQUIRED'; end if;
  if v_sku = '' then v_sku := 'ITM-' || lpad(nextval('public.inventory_product_sku_seq')::text, 6, '0'); end if;
  if v_sku !~ '^[A-Z0-9._-]+$' then raise exception 'INVENTORY_PRODUCT_SKU_INVALID'; end if;

  perform public.account_name_for_posting(v_revenue_account);
  if v_revenue_account not like '4%' then raise exception 'INVENTORY_REVENUE_ACCOUNT_CLASS_INVALID'; end if;
  if v_type = 'product' then
    perform public.account_name_for_posting(v_inventory_account);
    perform public.account_name_for_posting(v_cogs_account);
    if v_inventory_account not like '1%' then raise exception 'INVENTORY_ASSET_ACCOUNT_CLASS_INVALID'; end if;
    if v_cogs_account not like '5%' then raise exception 'INVENTORY_COGS_ACCOUNT_CLASS_INVALID'; end if;
  else
    v_inventory_account := null;
    v_cogs_account := null;
  end if;

  if p_id is not null then
    select * into v_existing from public.inventory_products where id = p_id for update;
    if not found then raise exception 'INVENTORY_PRODUCT_NOT_FOUND'; end if;
    if exists (select 1 from public.inventory_stock_movements where product_id = p_id)
       and (v_existing.item_type <> v_type or v_existing.unit <> v_unit
         or v_existing.inventory_account_code is distinct from v_inventory_account
         or v_existing.cogs_account_code is distinct from v_cogs_account) then
      raise exception 'INVENTORY_PRODUCT_POSTING_CLASS_IMMUTABLE';
    end if;
  end if;

  insert into public.inventory_products (
    id, sku, name_ar, name_en, item_type, unit, track_inventory,
    inventory_account_code, cogs_account_code, revenue_account_code, active, created_by
  ) values (
    v_id, v_sku, v_name, v_name_en, v_type, v_unit, v_type = 'product',
    v_inventory_account, v_cogs_account, v_revenue_account, v_active, auth.uid()
  ) on conflict (id) do update set
    sku = excluded.sku, name_ar = excluded.name_ar, name_en = excluded.name_en,
    item_type = excluded.item_type, unit = excluded.unit, track_inventory = excluded.track_inventory,
    inventory_account_code = excluded.inventory_account_code, cogs_account_code = excluded.cogs_account_code,
    revenue_account_code = excluded.revenue_account_code, active = excluded.active, updated_at = now();
  return v_id;
end;
$$;

create or replace function public.delete_inventory_product(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.inventory_access_allowed('inventory.items', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  if exists (select 1 from public.inventory_stock_movements where product_id = p_id) then raise exception 'INVENTORY_PRODUCT_HAS_MOVEMENTS'; end if;
  delete from public.inventory_products where id = p_id;
  if not found then raise exception 'INVENTORY_PRODUCT_NOT_FOUND'; end if;
end;
$$;

create or replace function public.save_inventory_warehouse(p_id uuid, p_code text, p_name_ar text, p_location text, p_active boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_code text := upper(trim(p_code));
  v_name text := trim(p_name_ar);
begin
  if not public.inventory_access_allowed('inventory.warehouses', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  if v_code is null or v_code = '' or v_code !~ '^[A-Z0-9._-]+$' then raise exception 'INVENTORY_WAREHOUSE_CODE_INVALID'; end if;
  if v_name is null or v_name = '' then raise exception 'INVENTORY_WAREHOUSE_NAME_REQUIRED'; end if;
  if p_id is not null and not exists (select 1 from public.inventory_warehouses where id = p_id) then raise exception 'INVENTORY_WAREHOUSE_NOT_FOUND'; end if;

  insert into public.inventory_warehouses (id, code, name_ar, location, active, created_by)
  values (v_id, v_code, v_name, trim(coalesce(p_location, '')), coalesce(p_active, true), auth.uid())
  on conflict (id) do update set code = excluded.code, name_ar = excluded.name_ar,
    location = excluded.location, active = excluded.active, updated_at = now();
  return v_id;
end;
$$;

create or replace function public.delete_inventory_warehouse(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.inventory_access_allowed('inventory.warehouses', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  if exists (select 1 from public.inventory_stock_movements where warehouse_id = p_id) then raise exception 'INVENTORY_WAREHOUSE_HAS_MOVEMENTS'; end if;
  delete from public.inventory_warehouses where id = p_id;
  if not found then raise exception 'INVENTORY_WAREHOUSE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.list_inventory_balances()
returns table (product_id uuid, warehouse_id uuid, quantity numeric, inventory_value numeric)
language sql
stable
security definer
set search_path = public
as $$
  select movement.product_id, movement.warehouse_id,
    sum(case when movement.movement_type in ('receipt','transfer_in','adjustment_in','opening') then movement.quantity else -movement.quantity end),
    sum(case when movement.movement_type in ('receipt','transfer_in','adjustment_in','opening') then movement.quantity * movement.unit_cost else -(movement.quantity * movement.unit_cost) end)
  from public.inventory_stock_movements movement
  where public.inventory_access_allowed('inventory.movements', false)
     or public.inventory_access_allowed('inventory.reports', false)
  group by movement.product_id, movement.warehouse_id;
$$;

drop function if exists public.inventory_manage_allowed();
revoke all on function public.inventory_access_allowed(text, boolean) from public, anon;
grant execute on function public.inventory_access_allowed(text, boolean) to authenticated, service_role;
