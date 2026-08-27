-- One-time opening inventory quantities and values with a balanced accounting journal.
-- This workflow is not a tax invoice and does not modify or submit any ZATCA document.

create sequence if not exists public.inventory_opening_balance_number_seq start 1;

create table if not exists public.inventory_opening_balances (
  id uuid primary key default gen_random_uuid(),
  opening_number text not null unique default ('OPN-' || lpad(nextval('public.inventory_opening_balance_number_seq')::text, 6, '0')),
  opening_date date not null,
  offset_account_code text not null references public.accounting_accounts(code) on update restrict on delete restrict,
  reference text not null default '',
  notes text not null default '',
  status text not null default 'draft' check (status in ('draft', 'posted')),
  accounting_status text not null default 'pending' check (accounting_status in ('pending', 'posted')),
  accounting_journal_entry_id uuid unique references public.accounting_journal_entries(id) on delete restrict,
  total_value numeric(14,2) not null default 0 check (total_value >= 0),
  posted_at timestamptz,
  posted_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_opening_balance_lines (
  id uuid primary key default gen_random_uuid(),
  opening_balance_id uuid not null references public.inventory_opening_balances(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on update restrict on delete restrict,
  warehouse_id uuid not null references public.inventory_warehouses(id) on update restrict on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_cost numeric(14,4) not null check (unit_cost > 0),
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (opening_balance_id, product_id, warehouse_id)
);

create index if not exists inventory_opening_balances_date_status_idx
  on public.inventory_opening_balances(opening_date, status);
create index if not exists inventory_opening_balances_offset_account_idx
  on public.inventory_opening_balances(offset_account_code);
create index if not exists inventory_opening_lines_product_idx
  on public.inventory_opening_balance_lines(product_id);
create index if not exists inventory_opening_lines_warehouse_idx
  on public.inventory_opening_balance_lines(warehouse_id);
create unique index if not exists inventory_single_opening_per_stock_location_uidx
  on public.inventory_stock_movements(product_id, warehouse_id)
  where movement_type = 'opening';

alter table public.inventory_opening_balances enable row level security;
alter table public.inventory_opening_balance_lines enable row level security;
revoke all on public.inventory_opening_balances, public.inventory_opening_balance_lines from public, anon;
revoke insert, update, delete, truncate on public.inventory_opening_balances, public.inventory_opening_balance_lines from authenticated;
grant select on public.inventory_opening_balances, public.inventory_opening_balance_lines to authenticated;

drop policy if exists inventory_opening_balances_authorized_select on public.inventory_opening_balances;
create policy inventory_opening_balances_authorized_select
on public.inventory_opening_balances for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));

drop policy if exists inventory_opening_balance_lines_authorized_select on public.inventory_opening_balance_lines;
create policy inventory_opening_balance_lines_authorized_select
on public.inventory_opening_balance_lines for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));

create or replace function public.save_inventory_opening_balance(p_id uuid, p_opening jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_existing public.inventory_opening_balances%rowtype;
  v_date date;
  v_offset_account text := trim(coalesce(p_opening->>'offsetAccountCode', ''));
  v_lines jsonb := p_opening->'lines';
  v_line jsonb;
  v_product_id uuid;
  v_warehouse_id uuid;
  v_quantity numeric(14,4);
  v_unit_cost numeric(14,4);
  v_amount numeric(14,2);
  v_total numeric(14,2) := 0;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  begin
    v_date := (p_opening->>'openingDate')::date;
  exception when others then raise exception 'INVENTORY_OPENING_VALUES_INVALID'; end;
  if v_date is null or v_date > current_date then raise exception 'INVENTORY_OPENING_DATE_INVALID'; end if;
  perform public.account_name_for_posting(v_offset_account);
  if v_offset_account not like '3%' then raise exception 'INVENTORY_OPENING_OFFSET_ACCOUNT_CLASS_INVALID'; end if;
  if jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) = 0 then raise exception 'INVENTORY_OPENING_LINES_REQUIRED'; end if;
  if jsonb_array_length(v_lines) > 500 then raise exception 'INVENTORY_OPENING_LINES_LIMIT'; end if;
  if (
    select count(*) from (
      select line->>'productId', line->>'warehouseId'
      from jsonb_array_elements(v_lines) line
      group by line->>'productId', line->>'warehouseId'
    ) grouped
  ) <> jsonb_array_length(v_lines) then raise exception 'INVENTORY_OPENING_DUPLICATE_STOCK_LOCATION'; end if;

  if p_id is not null then
    select * into v_existing from public.inventory_opening_balances where id = p_id for update;
    if not found then raise exception 'INVENTORY_OPENING_NOT_FOUND'; end if;
    if v_existing.status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_OPENING_EDITABLE'; end if;
  end if;

  insert into public.inventory_opening_balances (
    id, opening_date, offset_account_code, reference, notes, created_by
  ) values (
    v_id, v_date, v_offset_account, trim(coalesce(p_opening->>'reference', '')),
    trim(coalesce(p_opening->>'notes', '')), auth.uid()
  ) on conflict (id) do update set
    opening_date = excluded.opening_date,
    offset_account_code = excluded.offset_account_code,
    reference = excluded.reference,
    notes = excluded.notes,
    updated_at = now();

  delete from public.inventory_opening_balance_lines where opening_balance_id = v_id;
  for v_line in select value from jsonb_array_elements(v_lines) loop
    begin
      v_product_id := (v_line->>'productId')::uuid;
      v_warehouse_id := (v_line->>'warehouseId')::uuid;
      v_quantity := round((v_line->>'quantity')::numeric, 4);
      v_unit_cost := round((v_line->>'unitCost')::numeric, 4);
    exception when others then raise exception 'INVENTORY_OPENING_LINE_VALUES_INVALID'; end;
    if v_quantity::text in ('NaN','Infinity','-Infinity') or v_unit_cost::text in ('NaN','Infinity','-Infinity')
       or v_quantity <= 0 or v_unit_cost <= 0 then raise exception 'INVENTORY_OPENING_LINE_VALUES_INVALID'; end if;
    if not exists (
      select 1 from public.inventory_products
      where id = v_product_id and item_type = 'product' and track_inventory and active
    ) then raise exception 'INVENTORY_OPENING_PRODUCT_INVALID'; end if;
    if not exists (select 1 from public.inventory_warehouses where id = v_warehouse_id and active) then
      raise exception 'INVENTORY_OPENING_WAREHOUSE_INVALID';
    end if;
    v_amount := round(v_quantity * v_unit_cost, 2);
    if v_amount <= 0 then raise exception 'INVENTORY_OPENING_LINE_AMOUNT_INVALID'; end if;
    v_total := v_total + v_amount;
    insert into public.inventory_opening_balance_lines (
      opening_balance_id, product_id, warehouse_id, quantity, unit_cost, amount
    ) values (v_id, v_product_id, v_warehouse_id, v_quantity, v_unit_cost, v_amount);
  end loop;

  update public.inventory_opening_balances set total_value = v_total where id = v_id;
  return v_id;
end;
$$;

create or replace function public.post_inventory_opening_balance(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opening public.inventory_opening_balances%rowtype;
  v_line public.inventory_opening_balance_lines%rowtype;
  v_product public.inventory_products%rowtype;
  v_journal_id uuid;
  v_total numeric(14,2);
  v_group record;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select * into v_opening from public.inventory_opening_balances where id = p_id for update;
  if not found then raise exception 'INVENTORY_OPENING_NOT_FOUND'; end if;
  if v_opening.status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_OPENING_POSTABLE'; end if;
  if not exists (select 1 from public.inventory_opening_balance_lines where opening_balance_id = p_id) then
    raise exception 'INVENTORY_OPENING_LINES_REQUIRED';
  end if;

  perform public.account_name_for_posting(v_opening.offset_account_code);
  if v_opening.offset_account_code not like '3%' then raise exception 'INVENTORY_OPENING_OFFSET_ACCOUNT_CLASS_INVALID'; end if;

  for v_line in
    select * from public.inventory_opening_balance_lines
    where opening_balance_id = p_id order by product_id, warehouse_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_line.product_id::text || ':' || v_line.warehouse_id::text, 0));
    select * into v_product from public.inventory_products
    where id = v_line.product_id and item_type = 'product' and track_inventory and active;
    if not found then raise exception 'INVENTORY_OPENING_PRODUCT_INVALID'; end if;
    if not exists (select 1 from public.inventory_warehouses where id = v_line.warehouse_id and active) then
      raise exception 'INVENTORY_OPENING_WAREHOUSE_INVALID';
    end if;
    perform public.account_name_for_posting(v_product.inventory_account_code);
    if v_product.inventory_account_code not like '1%' then raise exception 'INVENTORY_ASSET_ACCOUNT_CLASS_INVALID'; end if;
    if exists (
      select 1 from public.inventory_stock_movements
      where product_id = v_line.product_id and warehouse_id = v_line.warehouse_id
    ) then raise exception 'INVENTORY_OPENING_REQUIRES_EMPTY_STOCK_LEDGER: product=%', v_product.sku; end if;
  end loop;

  select sum(amount) into v_total
  from public.inventory_opening_balance_lines where opening_balance_id = p_id;
  if coalesce(v_total, 0) <= 0 then raise exception 'INVENTORY_OPENING_TOTAL_INVALID'; end if;

  insert into public.accounting_journal_entries (
    entry_date, reference_type, description, status, source_document_table, source_document_id
  ) values (
    v_opening.opening_date, 'inventory_opening', 'الرصيد الافتتاحي للمخزون ' || v_opening.opening_number,
    'posted', 'inventory_opening_balances', p_id::text
  ) returning id into v_journal_id;

  for v_group in
    select product.inventory_account_code as account_code, sum(line.amount) as amount
    from public.inventory_opening_balance_lines line
    join public.inventory_products product on product.id = line.product_id
    where line.opening_balance_id = p_id
    group by product.inventory_account_code
    order by product.inventory_account_code
  loop
    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit)
    values (v_journal_id, v_group.account_code, public.account_name_for_posting(v_group.account_code), v_group.amount, 0);
  end loop;

  insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit)
  values (v_journal_id, v_opening.offset_account_code, public.account_name_for_posting(v_opening.offset_account_code), 0, v_total);

  for v_line in
    select * from public.inventory_opening_balance_lines
    where opening_balance_id = p_id order by created_at, id
  loop
    insert into public.inventory_stock_movements (
      movement_date, movement_type, product_id, warehouse_id, quantity, unit_cost,
      source_table, source_id, journal_entry_id, notes, created_by
    ) values (
      v_opening.opening_date, 'opening', v_line.product_id, v_line.warehouse_id,
      v_line.quantity, v_line.unit_cost, 'inventory_opening_balances', p_id::text,
      v_journal_id, 'رصيد افتتاحي للمخزون ' || v_opening.opening_number, auth.uid()
    );
  end loop;

  update public.inventory_opening_balances
  set status = 'posted', accounting_status = 'posted', accounting_journal_entry_id = v_journal_id,
      total_value = v_total, posted_at = now(), posted_by = auth.uid(), updated_at = now()
  where id = p_id;
  return v_journal_id;
end;
$$;

create or replace function public.delete_inventory_opening_balance_draft(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select status into v_status from public.inventory_opening_balances where id = p_id for update;
  if not found then raise exception 'INVENTORY_OPENING_NOT_FOUND'; end if;
  if v_status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_OPENING_DELETABLE'; end if;
  delete from public.inventory_opening_balance_lines where opening_balance_id = p_id;
  delete from public.inventory_opening_balances where id = p_id;
end;
$$;

revoke all on function public.save_inventory_opening_balance(uuid, jsonb) from public, anon;
revoke all on function public.post_inventory_opening_balance(uuid) from public, anon;
revoke all on function public.delete_inventory_opening_balance_draft(uuid) from public, anon;
grant execute on function public.save_inventory_opening_balance(uuid, jsonb) to authenticated, service_role;
grant execute on function public.post_inventory_opening_balance(uuid) to authenticated, service_role;
grant execute on function public.delete_inventory_opening_balance_draft(uuid) to authenticated, service_role;
