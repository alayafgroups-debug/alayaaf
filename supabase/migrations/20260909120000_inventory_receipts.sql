-- Posted inventory receipts create immutable quantity-ledger movements only.
-- Purchase invoice accounting remains unchanged, preventing duplicate GL postings.

create sequence if not exists public.inventory_receipt_number_seq start 1;

create table if not exists public.inventory_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique default ('GRN-' || lpad(nextval('public.inventory_receipt_number_seq')::text, 6, '0')),
  receipt_date date not null,
  warehouse_id uuid not null references public.inventory_warehouses(id) on update restrict on delete restrict,
  vendor_id text references public.vendors(id) on update restrict on delete restrict,
  purchase_order_id text,
  reference text not null default '',
  notes text not null default '',
  status text not null default 'draft' check (status in ('draft', 'posted')),
  accounting_status text not null default 'pending_invoice' check (accounting_status = 'pending_invoice'),
  posted_at timestamptz,
  posted_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.inventory_receipts(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on update restrict on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_cost numeric(14,4) not null check (unit_cost >= 0),
  created_at timestamptz not null default now(),
  unique (receipt_id, product_id)
);

create index if not exists inventory_receipts_date_status_idx on public.inventory_receipts(receipt_date, status);
create index if not exists inventory_receipts_warehouse_idx on public.inventory_receipts(warehouse_id, receipt_date);
create index if not exists inventory_receipts_vendor_idx on public.inventory_receipts(vendor_id) where vendor_id is not null;
create index if not exists inventory_receipt_lines_product_idx on public.inventory_receipt_lines(product_id);

alter table public.inventory_receipts enable row level security;
alter table public.inventory_receipt_lines enable row level security;
revoke all on public.inventory_receipts, public.inventory_receipt_lines from public, anon;
revoke insert, update, delete, truncate on public.inventory_receipts, public.inventory_receipt_lines from authenticated;
grant select on public.inventory_receipts, public.inventory_receipt_lines to authenticated;

drop policy if exists inventory_receipts_authorized_select on public.inventory_receipts;
create policy inventory_receipts_authorized_select on public.inventory_receipts for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));
drop policy if exists inventory_receipt_lines_authorized_select on public.inventory_receipt_lines;
create policy inventory_receipt_lines_authorized_select on public.inventory_receipt_lines for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));

create or replace function public.save_inventory_receipt(p_id uuid, p_receipt jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_existing public.inventory_receipts%rowtype;
  v_date date;
  v_warehouse_id uuid;
  v_vendor_id text := nullif(trim(coalesce(p_receipt->>'vendorId', '')), '');
  v_purchase_order_id text := nullif(trim(coalesce(p_receipt->>'purchaseOrderId', '')), '');
  v_lines jsonb := p_receipt->'lines';
  v_line jsonb;
  v_product_id uuid;
  v_quantity numeric(14,4);
  v_unit_cost numeric(14,4);
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  begin
    v_date := (p_receipt->>'receiptDate')::date;
    v_warehouse_id := (p_receipt->>'warehouseId')::uuid;
  exception when others then raise exception 'INVENTORY_RECEIPT_VALUES_INVALID'; end;
  if v_date is null or v_date > current_date then raise exception 'INVENTORY_RECEIPT_DATE_INVALID'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = v_warehouse_id and active) then raise exception 'INVENTORY_RECEIPT_WAREHOUSE_INVALID'; end if;
  if v_vendor_id is not null and not exists (select 1 from public.vendors where id = v_vendor_id) then raise exception 'INVENTORY_RECEIPT_VENDOR_INVALID'; end if;
  if jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) = 0 then raise exception 'INVENTORY_RECEIPT_LINES_REQUIRED'; end if;
  if jsonb_array_length(v_lines) > 200 then raise exception 'INVENTORY_RECEIPT_LINES_LIMIT'; end if;
  if (select count(*) from (select line->>'productId' from jsonb_array_elements(v_lines) line group by line->>'productId') grouped) <> jsonb_array_length(v_lines) then
    raise exception 'INVENTORY_RECEIPT_DUPLICATE_PRODUCT';
  end if;

  if p_id is not null then
    select * into v_existing from public.inventory_receipts where id = p_id for update;
    if not found then raise exception 'INVENTORY_RECEIPT_NOT_FOUND'; end if;
    if v_existing.status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_RECEIPT_EDITABLE'; end if;
  end if;

  insert into public.inventory_receipts (
    id, receipt_date, warehouse_id, vendor_id, purchase_order_id, reference, notes, created_by
  ) values (
    v_id, v_date, v_warehouse_id, v_vendor_id, v_purchase_order_id,
    trim(coalesce(p_receipt->>'reference', '')), trim(coalesce(p_receipt->>'notes', '')), auth.uid()
  ) on conflict (id) do update set
    receipt_date = excluded.receipt_date, warehouse_id = excluded.warehouse_id,
    vendor_id = excluded.vendor_id, purchase_order_id = excluded.purchase_order_id,
    reference = excluded.reference, notes = excluded.notes, updated_at = now();

  delete from public.inventory_receipt_lines where receipt_id = v_id;
  for v_line in select value from jsonb_array_elements(v_lines) loop
    begin
      v_product_id := (v_line->>'productId')::uuid;
      v_quantity := round((v_line->>'quantity')::numeric, 4);
      v_unit_cost := round((v_line->>'unitCost')::numeric, 4);
    exception when others then raise exception 'INVENTORY_RECEIPT_LINE_VALUES_INVALID'; end;
    if v_quantity::text in ('NaN','Infinity','-Infinity') or v_unit_cost::text in ('NaN','Infinity','-Infinity')
       or v_quantity <= 0 or v_unit_cost < 0 then raise exception 'INVENTORY_RECEIPT_LINE_VALUES_INVALID'; end if;
    if not exists (select 1 from public.inventory_products where id = v_product_id and item_type = 'product' and track_inventory and active) then
      raise exception 'INVENTORY_RECEIPT_PRODUCT_INVALID';
    end if;
    insert into public.inventory_receipt_lines (receipt_id, product_id, quantity, unit_cost)
    values (v_id, v_product_id, v_quantity, v_unit_cost);
  end loop;
  return v_id;
end;
$$;

create or replace function public.post_inventory_receipt(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.inventory_receipts%rowtype;
  v_line public.inventory_receipt_lines%rowtype;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select * into v_receipt from public.inventory_receipts where id = p_id for update;
  if not found then raise exception 'INVENTORY_RECEIPT_NOT_FOUND'; end if;
  if v_receipt.status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_RECEIPT_POSTABLE'; end if;
  if not exists (select 1 from public.inventory_receipt_lines where receipt_id = p_id) then raise exception 'INVENTORY_RECEIPT_LINES_REQUIRED'; end if;
  if not exists (select 1 from public.inventory_warehouses where id = v_receipt.warehouse_id and active) then raise exception 'INVENTORY_RECEIPT_WAREHOUSE_INVALID'; end if;

  for v_line in select * from public.inventory_receipt_lines where receipt_id = p_id order by created_at, id loop
    if not exists (select 1 from public.inventory_products where id = v_line.product_id and item_type = 'product' and track_inventory and active) then
      raise exception 'INVENTORY_RECEIPT_PRODUCT_INVALID';
    end if;
    insert into public.inventory_stock_movements (
      movement_date, movement_type, product_id, warehouse_id, quantity, unit_cost,
      source_table, source_id, notes, created_by
    ) values (
      v_receipt.receipt_date, 'receipt', v_line.product_id, v_receipt.warehouse_id,
      v_line.quantity, v_line.unit_cost, 'inventory_receipts', p_id::text,
      'استلام مخزون ' || v_receipt.receipt_number, auth.uid()
    );
  end loop;

  update public.inventory_receipts
  set status = 'posted', posted_at = now(), posted_by = auth.uid(), updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.delete_inventory_receipt_draft(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select status into v_status from public.inventory_receipts where id = p_id for update;
  if not found then raise exception 'INVENTORY_RECEIPT_NOT_FOUND'; end if;
  if v_status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_RECEIPT_DELETABLE'; end if;
  delete from public.inventory_receipt_lines where receipt_id = p_id;
  delete from public.inventory_receipts where id = p_id;
end;
$$;

revoke all on function public.save_inventory_receipt(uuid, jsonb) from public, anon;
revoke all on function public.post_inventory_receipt(uuid) from public, anon;
revoke all on function public.delete_inventory_receipt_draft(uuid) from public, anon;
grant execute on function public.save_inventory_receipt(uuid, jsonb) to authenticated, service_role;
grant execute on function public.post_inventory_receipt(uuid) to authenticated, service_role;
grant execute on function public.delete_inventory_receipt_draft(uuid) to authenticated, service_role;
