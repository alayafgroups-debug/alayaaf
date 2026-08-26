-- Real inventory master data and immutable quantity ledger foundation.
-- This migration does not modify invoices, ZATCA documents, or post inventory accounting journals.

create sequence if not exists public.inventory_product_sku_seq start 1;
create sequence if not exists public.inventory_movement_number_seq start 1;

create table if not exists public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name_ar text not null,
  name_en text not null default '',
  item_type text not null check (item_type in ('product', 'service')),
  unit text not null,
  track_inventory boolean not null,
  valuation_method text not null default 'weighted_average' check (valuation_method = 'weighted_average'),
  inventory_account_code text references public.accounting_accounts(code) on update restrict on delete restrict,
  cogs_account_code text references public.accounting_accounts(code) on update restrict on delete restrict,
  revenue_account_code text not null references public.accounting_accounts(code) on update restrict on delete restrict,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (item_type = 'product' and track_inventory and inventory_account_code is not null and cogs_account_code is not null)
    or (item_type = 'service' and not track_inventory and inventory_account_code is null and cogs_account_code is null)
  )
);

create table if not exists public.inventory_warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  location text not null default '',
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_stock_movements (
  id uuid primary key default gen_random_uuid(),
  movement_number text not null unique default ('IM-' || lpad(nextval('public.inventory_movement_number_seq')::text, 8, '0')),
  movement_date date not null,
  movement_type text not null check (movement_type in ('receipt', 'issue', 'transfer_in', 'transfer_out', 'adjustment_in', 'adjustment_out', 'opening')),
  product_id uuid not null references public.inventory_products(id) on update restrict on delete restrict,
  warehouse_id uuid not null references public.inventory_warehouses(id) on update restrict on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_cost numeric(14,4) not null default 0 check (unit_cost >= 0),
  source_table text not null,
  source_id text not null,
  journal_entry_id uuid references public.accounting_journal_entries(id) on delete restrict,
  notes text not null default '',
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (source_table, source_id, product_id, warehouse_id, movement_type)
);

create index if not exists inventory_products_type_active_idx on public.inventory_products(item_type, active);
create index if not exists inventory_stock_movements_product_date_idx on public.inventory_stock_movements(product_id, movement_date, created_at);
create index if not exists inventory_stock_movements_warehouse_date_idx on public.inventory_stock_movements(warehouse_id, movement_date, created_at);
create index if not exists inventory_stock_movements_journal_idx on public.inventory_stock_movements(journal_entry_id) where journal_entry_id is not null;

create or replace function public.inventory_manage_allowed()
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
        or coalesce(role.permissions ->> 'inventory.manage', '') in ('true', 'manage')
        or coalesce(role.permissions ->> 'module.inventory', '') = 'manage'
      )
  );
$$;

alter table public.inventory_products enable row level security;
alter table public.inventory_warehouses enable row level security;
alter table public.inventory_stock_movements enable row level security;
revoke all on public.inventory_products, public.inventory_warehouses, public.inventory_stock_movements from public, anon;
revoke insert, update, delete, truncate on public.inventory_products, public.inventory_warehouses, public.inventory_stock_movements from authenticated;
grant select on public.inventory_products, public.inventory_warehouses, public.inventory_stock_movements to authenticated;

drop policy if exists inventory_products_authorized_select on public.inventory_products;
create policy inventory_products_authorized_select on public.inventory_products for select to authenticated
using ((select public.inventory_manage_allowed()));
drop policy if exists inventory_warehouses_authorized_select on public.inventory_warehouses;
create policy inventory_warehouses_authorized_select on public.inventory_warehouses for select to authenticated
using ((select public.inventory_manage_allowed()));
drop policy if exists inventory_stock_movements_authorized_select on public.inventory_stock_movements;
create policy inventory_stock_movements_authorized_select on public.inventory_stock_movements for select to authenticated
using ((select public.inventory_manage_allowed()));

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
  if not public.inventory_manage_allowed() then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
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
       and (v_existing.item_type <> v_type or v_existing.inventory_account_code is distinct from v_inventory_account
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
  if not public.inventory_manage_allowed() then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
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
  if not public.inventory_manage_allowed() then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
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
  if not public.inventory_manage_allowed() then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  if exists (select 1 from public.inventory_stock_movements where warehouse_id = p_id) then raise exception 'INVENTORY_WAREHOUSE_HAS_MOVEMENTS'; end if;
  delete from public.inventory_warehouses where id = p_id;
  if not found then raise exception 'INVENTORY_WAREHOUSE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.list_inventory_balances()
returns table (
  product_id uuid,
  warehouse_id uuid,
  quantity numeric,
  inventory_value numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select movement.product_id, movement.warehouse_id,
    sum(case when movement.movement_type in ('receipt','transfer_in','adjustment_in','opening') then movement.quantity else -movement.quantity end) as quantity,
    sum(case when movement.movement_type in ('receipt','transfer_in','adjustment_in','opening') then movement.quantity * movement.unit_cost else -(movement.quantity * movement.unit_cost) end) as inventory_value
  from public.inventory_stock_movements movement
  where public.inventory_manage_allowed()
  group by movement.product_id, movement.warehouse_id;
$$;

revoke all on function public.inventory_manage_allowed() from public, anon;
revoke all on function public.save_inventory_product(uuid, jsonb) from public, anon;
revoke all on function public.delete_inventory_product(uuid) from public, anon;
revoke all on function public.save_inventory_warehouse(uuid, text, text, text, boolean) from public, anon;
revoke all on function public.delete_inventory_warehouse(uuid) from public, anon;
revoke all on function public.list_inventory_balances() from public, anon;
grant execute on function public.inventory_manage_allowed() to authenticated, service_role;
grant execute on function public.save_inventory_product(uuid, jsonb) to authenticated, service_role;
grant execute on function public.delete_inventory_product(uuid) to authenticated, service_role;
grant execute on function public.save_inventory_warehouse(uuid, text, text, text, boolean) to authenticated, service_role;
grant execute on function public.delete_inventory_warehouse(uuid) to authenticated, service_role;
grant execute on function public.list_inventory_balances() to authenticated, service_role;
