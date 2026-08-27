-- Count adjustments explicitly apply finalized physical-count variances to stock and accounting.
-- No invoice, signed document, XML, QR, ICV, PIH, or ZATCA submission data is modified.

alter table public.accounting_posting_rules
  add column if not exists inventory_shortage_account_code text references public.accounting_accounts(code) on update restrict on delete restrict,
  add column if not exists inventory_surplus_account_code text references public.accounting_accounts(code) on update restrict on delete restrict;

create or replace function public.save_accounting_posting_defaults(p_defaults jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receivable text := trim(p_defaults->>'receivableAccountCode');
  v_revenue text := trim(p_defaults->>'revenueAccountCode');
  v_output_vat text := trim(p_defaults->>'outputVatAccountCode');
  v_payable text := trim(p_defaults->>'payableAccountCode');
  v_purchase text := trim(p_defaults->>'purchaseAccountCode');
  v_input_vat text := trim(p_defaults->>'inputVatAccountCode');
  v_shortage text := trim(p_defaults->>'inventoryShortageAccountCode');
  v_surplus text := trim(p_defaults->>'inventorySurplusAccountCode');
begin
  if not public.accounting_settings_manage_allowed() then raise exception 'ACCOUNTING_SETTINGS_PERMISSION_REQUIRED'; end if;
  perform public.account_name_for_posting(v_receivable);
  perform public.account_name_for_posting(v_revenue);
  perform public.account_name_for_posting(v_output_vat);
  perform public.account_name_for_posting(v_payable);
  perform public.account_name_for_posting(v_purchase);
  perform public.account_name_for_posting(v_input_vat);
  perform public.account_name_for_posting(v_shortage);
  perform public.account_name_for_posting(v_surplus);
  if v_receivable not like '1%' then raise exception 'RECEIVABLE_ACCOUNT_CLASS_INVALID'; end if;
  if v_revenue not like '4%' then raise exception 'REVENUE_ACCOUNT_CLASS_INVALID'; end if;
  if v_output_vat not like '2%' then raise exception 'OUTPUT_VAT_ACCOUNT_CLASS_INVALID'; end if;
  if v_payable not like '2%' then raise exception 'PAYABLE_ACCOUNT_CLASS_INVALID'; end if;
  if v_purchase not like '5%' then raise exception 'PURCHASE_ACCOUNT_CLASS_INVALID'; end if;
  if v_input_vat not like '2%' then raise exception 'INPUT_VAT_ACCOUNT_CLASS_INVALID'; end if;
  if v_shortage not like '5%' then raise exception 'INVENTORY_SHORTAGE_ACCOUNT_CLASS_INVALID'; end if;
  if v_surplus not like '4%' then raise exception 'INVENTORY_SURPLUS_ACCOUNT_CLASS_INVALID'; end if;

  update public.accounting_posting_rules
  set receivable_account_code = v_receivable,
      revenue_account_code = v_revenue,
      output_vat_account_code = v_output_vat,
      payable_account_code = v_payable,
      purchase_account_code = v_purchase,
      input_vat_account_code = v_input_vat,
      inventory_shortage_account_code = v_shortage,
      inventory_surplus_account_code = v_surplus,
      updated_at = now()
  where rule_code = 'sales_default' and active;
  if not found then raise exception 'ACCOUNTING_POSTING_RULE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.prevent_configured_inventory_account_grouping()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.parent_code is not null and exists (
    select 1 from public.accounting_posting_rules
    where active and new.parent_code in (inventory_shortage_account_code, inventory_surplus_account_code)
  ) then raise exception 'POSTED_OR_CONFIGURED_ACCOUNT_CANNOT_BECOME_GROUP'; end if;
  return new;
end;
$$;

drop trigger if exists prevent_configured_inventory_account_grouping on public.accounting_accounts;
create trigger prevent_configured_inventory_account_grouping
before insert or update of parent_code on public.accounting_accounts
for each row execute function public.prevent_configured_inventory_account_grouping();

create sequence if not exists public.inventory_adjustment_number_seq start 1;

create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  adjustment_number text not null unique default ('ADJ-' || lpad(nextval('public.inventory_adjustment_number_seq')::text, 6, '0')),
  count_id uuid not null unique references public.inventory_counts(id) on update restrict on delete restrict,
  adjustment_date date not null default current_date,
  warehouse_id uuid not null references public.inventory_warehouses(id) on update restrict on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'posted')),
  accounting_status text not null default 'pending' check (accounting_status in ('pending', 'posted', 'not_required')),
  accounting_journal_entry_id uuid unique references public.accounting_journal_entries(id) on delete restrict,
  posted_at timestamptz,
  posted_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_adjustment_lines (
  id uuid primary key default gen_random_uuid(),
  adjustment_id uuid not null references public.inventory_adjustments(id) on delete restrict,
  count_line_id uuid not null unique references public.inventory_count_lines(id) on update restrict on delete restrict,
  product_id uuid not null references public.inventory_products(id) on update restrict on delete restrict,
  movement_type text not null check (movement_type in ('adjustment_in', 'adjustment_out')),
  quantity numeric(14,4) not null check (quantity > 0),
  original_unit_cost numeric(14,4) not null check (original_unit_cost >= 0),
  unit_cost numeric(14,4) not null check (unit_cost >= 0),
  amount numeric(18,2) not null check (amount >= 0),
  cost_override_reason text not null default '',
  cost_overridden_at timestamptz,
  cost_overridden_by uuid,
  created_at timestamptz not null default now(),
  unique (adjustment_id, product_id)
);

create index if not exists inventory_adjustments_date_status_idx on public.inventory_adjustments(adjustment_date, status);
create index if not exists inventory_adjustments_warehouse_idx on public.inventory_adjustments(warehouse_id, adjustment_date);
create index if not exists inventory_adjustment_lines_product_idx on public.inventory_adjustment_lines(product_id);

alter table public.inventory_adjustments enable row level security;
alter table public.inventory_adjustment_lines enable row level security;
revoke all on public.inventory_adjustments, public.inventory_adjustment_lines from public, anon;
revoke insert, update, delete, truncate on public.inventory_adjustments, public.inventory_adjustment_lines from authenticated;
grant select on public.inventory_adjustments, public.inventory_adjustment_lines to authenticated;

drop policy if exists inventory_adjustments_authorized_select on public.inventory_adjustments;
create policy inventory_adjustments_authorized_select on public.inventory_adjustments for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));
drop policy if exists inventory_adjustment_lines_authorized_select on public.inventory_adjustment_lines;
create policy inventory_adjustment_lines_authorized_select on public.inventory_adjustment_lines for select to authenticated
using ((select public.inventory_access_allowed('inventory.movements', false)));

create or replace function public.create_inventory_adjustment_from_count(p_count_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count public.inventory_counts%rowtype;
  v_id uuid := gen_random_uuid();
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select * into v_count from public.inventory_counts where id = p_count_id for update;
  if not found then raise exception 'INVENTORY_COUNT_NOT_FOUND'; end if;
  if v_count.status <> 'finalized' then raise exception 'ONLY_FINALIZED_INVENTORY_COUNT_ADJUSTABLE'; end if;
  if exists (select 1 from public.inventory_adjustments where count_id = p_count_id) then raise exception 'INVENTORY_COUNT_ALREADY_HAS_ADJUSTMENT'; end if;
  if exists (
    select 1 from public.inventory_stock_movements
    where warehouse_id = v_count.warehouse_id
      and substring(movement_number from 4)::bigint > v_count.snapshot_movement_seq
  ) then raise exception 'INVENTORY_COUNT_STALE_SNAPSHOT'; end if;

  insert into public.inventory_adjustments (id, count_id, adjustment_date, warehouse_id, created_by)
  values (v_id, p_count_id, current_date, v_count.warehouse_id, auth.uid());

  insert into public.inventory_adjustment_lines (
    adjustment_id, count_line_id, product_id, movement_type, quantity,
    original_unit_cost, unit_cost, amount
  )
  select v_id, line.id, line.product_id,
    case when line.variance_quantity > 0 then 'adjustment_in' else 'adjustment_out' end,
    abs(line.variance_quantity), line.unit_cost, line.unit_cost,
    round(abs(line.variance_quantity) * line.unit_cost, 2)
  from public.inventory_count_lines line
  where line.count_id = p_count_id and line.variance_quantity <> 0
  order by line.product_id;
  return v_id;
end;
$$;

create or replace function public.set_inventory_adjustment_surplus_cost(p_line_id uuid, p_unit_cost numeric, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line public.inventory_adjustment_lines%rowtype;
  v_status text;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select * into v_line from public.inventory_adjustment_lines where id = p_line_id for update;
  if not found then raise exception 'INVENTORY_ADJUSTMENT_LINE_NOT_FOUND'; end if;
  select status into v_status from public.inventory_adjustments where id = v_line.adjustment_id for update;
  if v_status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_ADJUSTMENT_EDITABLE'; end if;
  if v_line.movement_type <> 'adjustment_in' or v_line.original_unit_cost <> 0 then raise exception 'INVENTORY_SURPLUS_COST_OVERRIDE_NOT_ALLOWED'; end if;
  if p_unit_cost is null or p_unit_cost::text in ('NaN','Infinity','-Infinity') or p_unit_cost <= 0 then raise exception 'INVENTORY_SURPLUS_COST_INVALID'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'INVENTORY_SURPLUS_COST_REASON_REQUIRED'; end if;
  update public.inventory_adjustment_lines
  set unit_cost = round(p_unit_cost, 4),
      amount = round(quantity * round(p_unit_cost, 4), 2),
      cost_override_reason = trim(p_reason),
      cost_overridden_at = now(),
      cost_overridden_by = auth.uid()
  where id = p_line_id;
end;
$$;

create or replace function public.post_inventory_adjustment(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adjustment public.inventory_adjustments%rowtype;
  v_count public.inventory_counts%rowtype;
  v_line public.inventory_adjustment_lines%rowtype;
  v_product public.inventory_products%rowtype;
  v_shortage_account text;
  v_surplus_account text;
  v_stock_quantity numeric(18,4);
  v_total numeric(18,2);
  v_journal_id uuid;
  v_group record;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select * into v_adjustment from public.inventory_adjustments where id = p_id for update;
  if not found then raise exception 'INVENTORY_ADJUSTMENT_NOT_FOUND'; end if;
  if v_adjustment.status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_ADJUSTMENT_POSTABLE'; end if;
  select * into v_count from public.inventory_counts where id = v_adjustment.count_id for update;
  if not found or v_count.status <> 'finalized' then raise exception 'ONLY_FINALIZED_INVENTORY_COUNT_ADJUSTABLE'; end if;

  lock table public.inventory_stock_movements in share mode;
  if exists (
    select 1 from public.inventory_stock_movements
    where warehouse_id = v_adjustment.warehouse_id
      and substring(movement_number from 4)::bigint > v_count.snapshot_movement_seq
  ) then raise exception 'INVENTORY_COUNT_STALE_SNAPSHOT'; end if;

  select inventory_shortage_account_code, inventory_surplus_account_code
  into v_shortage_account, v_surplus_account
  from public.accounting_posting_rules where rule_code = 'sales_default' and active;
  if not found then raise exception 'ACCOUNTING_POSTING_RULE_NOT_FOUND'; end if;

  for v_line in select * from public.inventory_adjustment_lines where adjustment_id = p_id order by product_id loop
    perform pg_advisory_xact_lock(hashtextextended(v_line.product_id::text || ':' || v_adjustment.warehouse_id::text, 0));
    select * into v_product from public.inventory_products
    where id = v_line.product_id and item_type = 'product' and track_inventory and active;
    if not found then raise exception 'INVENTORY_ADJUSTMENT_PRODUCT_INVALID'; end if;
    perform public.account_name_for_posting(v_product.inventory_account_code);
    if v_line.movement_type = 'adjustment_in' and v_line.unit_cost <= 0 then raise exception 'INVENTORY_SURPLUS_COST_REQUIRED: product=%', v_product.sku; end if;
    if v_line.amount > 0 and v_line.movement_type = 'adjustment_out' then
      if v_shortage_account is null then raise exception 'INVENTORY_SHORTAGE_ACCOUNT_REQUIRED'; end if;
      perform public.account_name_for_posting(v_shortage_account);
      if v_shortage_account not like '5%' then raise exception 'INVENTORY_SHORTAGE_ACCOUNT_CLASS_INVALID'; end if;
    elsif v_line.amount > 0 and v_line.movement_type = 'adjustment_in' then
      if v_surplus_account is null then raise exception 'INVENTORY_SURPLUS_ACCOUNT_REQUIRED'; end if;
      perform public.account_name_for_posting(v_surplus_account);
      if v_surplus_account not like '4%' then raise exception 'INVENTORY_SURPLUS_ACCOUNT_CLASS_INVALID'; end if;
    end if;

    if v_line.movement_type = 'adjustment_out' then
      select coalesce(sum(case when movement_type in ('receipt','transfer_in','adjustment_in','opening') then quantity else -quantity end), 0)
      into v_stock_quantity from public.inventory_stock_movements
      where product_id = v_line.product_id and warehouse_id = v_adjustment.warehouse_id;
      if v_stock_quantity < v_line.quantity then
        raise exception 'INVENTORY_ADJUSTMENT_INSUFFICIENT_STOCK: product=%, available=%, requested=%', v_product.sku, v_stock_quantity, v_line.quantity;
      end if;
    end if;
  end loop;

  select coalesce(sum(amount), 0) into v_total
  from public.inventory_adjustment_lines where adjustment_id = p_id;

  if v_total > 0 then
    insert into public.accounting_journal_entries (
      entry_date, reference_type, description, status, source_document_table, source_document_id
    ) values (
      v_adjustment.adjustment_date, 'inventory_adjustment', 'تسوية جرد المخزون ' || v_adjustment.adjustment_number,
      'posted', 'inventory_adjustments', p_id::text
    ) returning id into v_journal_id;

    for v_group in
      select line.movement_type, product.inventory_account_code as account_code, sum(line.amount) as amount
      from public.inventory_adjustment_lines line
      join public.inventory_products product on product.id = line.product_id
      where line.adjustment_id = p_id and line.amount > 0
      group by line.movement_type, product.inventory_account_code
      order by line.movement_type, product.inventory_account_code
    loop
      insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit)
      values (
        v_journal_id, v_group.account_code, public.account_name_for_posting(v_group.account_code),
        case when v_group.movement_type = 'adjustment_in' then v_group.amount else 0 end,
        case when v_group.movement_type = 'adjustment_out' then v_group.amount else 0 end
      );
    end loop;

    if exists (select 1 from public.inventory_adjustment_lines where adjustment_id = p_id and movement_type = 'adjustment_out' and amount > 0) then
      insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit)
      select v_journal_id, v_shortage_account, public.account_name_for_posting(v_shortage_account), sum(amount), 0
      from public.inventory_adjustment_lines where adjustment_id = p_id and movement_type = 'adjustment_out' and amount > 0;
    end if;
    if exists (select 1 from public.inventory_adjustment_lines where adjustment_id = p_id and movement_type = 'adjustment_in' and amount > 0) then
      insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit)
      select v_journal_id, v_surplus_account, public.account_name_for_posting(v_surplus_account), 0, sum(amount)
      from public.inventory_adjustment_lines where adjustment_id = p_id and movement_type = 'adjustment_in' and amount > 0;
    end if;
  end if;

  for v_line in select * from public.inventory_adjustment_lines where adjustment_id = p_id order by product_id loop
    insert into public.inventory_stock_movements (
      movement_date, movement_type, product_id, warehouse_id, quantity, unit_cost,
      source_table, source_id, journal_entry_id, notes, created_by
    ) values (
      v_adjustment.adjustment_date, v_line.movement_type, v_line.product_id, v_adjustment.warehouse_id,
      v_line.quantity, v_line.unit_cost, 'inventory_adjustments', p_id::text, v_journal_id,
      'تسوية جرد المخزون ' || v_adjustment.adjustment_number, auth.uid()
    );
  end loop;

  update public.inventory_adjustments
  set status = 'posted', accounting_status = case when v_journal_id is null then 'not_required' else 'posted' end,
      accounting_journal_entry_id = v_journal_id, posted_at = now(), posted_by = auth.uid(), updated_at = now()
  where id = p_id;
  return v_journal_id;
end;
$$;

create or replace function public.delete_inventory_adjustment_draft(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if not public.inventory_access_allowed('inventory.movements', true) then raise exception 'INVENTORY_PERMISSION_REQUIRED'; end if;
  select status into v_status from public.inventory_adjustments where id = p_id for update;
  if not found then raise exception 'INVENTORY_ADJUSTMENT_NOT_FOUND'; end if;
  if v_status <> 'draft' then raise exception 'ONLY_DRAFT_INVENTORY_ADJUSTMENT_DELETABLE'; end if;
  delete from public.inventory_adjustment_lines where adjustment_id = p_id;
  delete from public.inventory_adjustments where id = p_id;
end;
$$;

revoke all on function public.save_accounting_posting_defaults(jsonb) from public, anon;
revoke all on function public.create_inventory_adjustment_from_count(uuid) from public, anon;
revoke all on function public.set_inventory_adjustment_surplus_cost(uuid, numeric, text) from public, anon;
revoke all on function public.post_inventory_adjustment(uuid) from public, anon;
revoke all on function public.delete_inventory_adjustment_draft(uuid) from public, anon;
grant execute on function public.save_accounting_posting_defaults(jsonb) to authenticated, service_role;
grant execute on function public.create_inventory_adjustment_from_count(uuid) to authenticated, service_role;
grant execute on function public.set_inventory_adjustment_surplus_cost(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.post_inventory_adjustment(uuid) to authenticated, service_role;
grant execute on function public.delete_inventory_adjustment_draft(uuid) to authenticated, service_role;
