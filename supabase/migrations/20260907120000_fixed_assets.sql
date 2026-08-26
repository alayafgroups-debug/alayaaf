-- Fixed asset register, capitalization, straight-line depreciation, and disposal.
-- All accounting effects are new immutable posted journals. No ZATCA document flow is modified.

create sequence if not exists public.fixed_asset_number_seq start 1;

create table if not exists public.fixed_assets (
  id uuid primary key default gen_random_uuid(),
  asset_number text not null unique,
  name text not null,
  category text not null,
  acquisition_date date not null,
  in_service_date date not null,
  cost numeric(14,2) not null check (cost > 0),
  residual_value numeric(14,2) not null default 0 check (residual_value >= 0),
  useful_life_months integer not null check (useful_life_months > 0),
  depreciation_method text not null default 'straight_line' check (depreciation_method = 'straight_line'),
  asset_account_code text not null references public.accounting_accounts(code) on update restrict on delete restrict,
  accumulated_depreciation_account_code text not null references public.accounting_accounts(code) on update restrict on delete restrict,
  depreciation_expense_account_code text not null references public.accounting_accounts(code) on update restrict on delete restrict,
  acquisition_credit_account_code text references public.accounting_accounts(code) on update restrict on delete restrict,
  capitalization_journal_entry_id uuid unique references public.accounting_journal_entries(id) on delete restrict,
  disposal_journal_entry_id uuid unique references public.accounting_journal_entries(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'active', 'disposed')),
  disposed_at date,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (residual_value < cost),
  check (in_service_date >= acquisition_date)
);

create table if not exists public.fixed_asset_depreciation (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.fixed_assets(id) on delete restrict,
  period_end date not null,
  amount numeric(14,2) not null check (amount > 0),
  journal_entry_id uuid not null unique references public.accounting_journal_entries(id) on delete restrict,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique(asset_id, period_end)
);

create table if not exists public.fixed_asset_disposals (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null unique references public.fixed_assets(id) on delete restrict,
  disposal_date date not null,
  proceeds numeric(14,2) not null default 0 check (proceeds >= 0),
  carrying_amount numeric(14,2) not null check (carrying_amount >= 0),
  gain_loss numeric(14,2) not null,
  proceeds_account_code text references public.accounting_accounts(code) on update restrict on delete restrict,
  gain_loss_account_code text not null references public.accounting_accounts(code) on update restrict on delete restrict,
  journal_entry_id uuid not null unique references public.accounting_journal_entries(id) on delete restrict,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists fixed_assets_status_idx on public.fixed_assets(status, acquisition_date);
create index if not exists fixed_assets_asset_account_idx on public.fixed_assets(asset_account_code);
create index if not exists fixed_assets_accumulated_account_idx on public.fixed_assets(accumulated_depreciation_account_code);
create index if not exists fixed_assets_expense_account_idx on public.fixed_assets(depreciation_expense_account_code);
create index if not exists fixed_asset_depreciation_asset_period_idx on public.fixed_asset_depreciation(asset_id, period_end);

create or replace function public.accounting_fixed_assets_manage_allowed()
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
        or coalesce(role.permissions ->> 'accounting.fixed_assets', '') in ('true', 'manage')
        or coalesce(role.permissions ->> 'module.accounting', '') = 'manage'
      )
  );
$$;

alter table public.fixed_assets enable row level security;
alter table public.fixed_asset_depreciation enable row level security;
alter table public.fixed_asset_disposals enable row level security;
revoke all on public.fixed_assets from public, anon;
revoke all on public.fixed_asset_depreciation from public, anon;
revoke all on public.fixed_asset_disposals from public, anon;
revoke insert, update, delete, truncate on public.fixed_assets from authenticated;
revoke insert, update, delete, truncate on public.fixed_asset_depreciation from authenticated;
revoke insert, update, delete, truncate on public.fixed_asset_disposals from authenticated;
grant select on public.fixed_assets, public.fixed_asset_depreciation, public.fixed_asset_disposals to authenticated;

drop policy if exists fixed_assets_authorized_select on public.fixed_assets;
create policy fixed_assets_authorized_select on public.fixed_assets for select to authenticated
using ((select public.accounting_fixed_assets_manage_allowed()));
drop policy if exists fixed_asset_depreciation_authorized_select on public.fixed_asset_depreciation;
create policy fixed_asset_depreciation_authorized_select on public.fixed_asset_depreciation for select to authenticated
using ((select public.accounting_fixed_assets_manage_allowed()));
drop policy if exists fixed_asset_disposals_authorized_select on public.fixed_asset_disposals;
create policy fixed_asset_disposals_authorized_select on public.fixed_asset_disposals for select to authenticated
using ((select public.accounting_fixed_assets_manage_allowed()));

create or replace function public.save_fixed_asset(p_id uuid, p_asset jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_existing public.fixed_assets%rowtype;
  v_name text := trim(p_asset->>'name');
  v_category text := trim(p_asset->>'category');
  v_acquisition_date date;
  v_in_service_date date;
  v_cost numeric(14,2);
  v_residual numeric(14,2);
  v_life integer;
  v_asset_account text := trim(p_asset->>'assetAccountCode');
  v_accumulated_account text := trim(p_asset->>'accumulatedDepreciationAccountCode');
  v_expense_account text := trim(p_asset->>'depreciationExpenseAccountCode');
  v_number text;
begin
  if not public.accounting_fixed_assets_manage_allowed() then raise exception 'FIXED_ASSET_PERMISSION_REQUIRED'; end if;
  if v_name is null or v_name = '' then raise exception 'FIXED_ASSET_NAME_REQUIRED'; end if;
  if v_category is null or v_category = '' then raise exception 'FIXED_ASSET_CATEGORY_REQUIRED'; end if;
  begin
    v_acquisition_date := (p_asset->>'acquisitionDate')::date;
    v_in_service_date := (p_asset->>'inServiceDate')::date;
    v_cost := round((p_asset->>'cost')::numeric, 2);
    v_residual := round(coalesce(nullif(p_asset->>'residualValue', '')::numeric, 0), 2);
    v_life := (p_asset->>'usefulLifeMonths')::integer;
  exception when others then raise exception 'FIXED_ASSET_VALUES_INVALID'; end;
  if v_cost::text in ('NaN','Infinity','-Infinity') or v_residual::text in ('NaN','Infinity','-Infinity') then raise exception 'FIXED_ASSET_VALUES_NON_FINITE'; end if;
  if v_cost <= 0 or v_residual < 0 or v_residual >= v_cost or v_life <= 0 then raise exception 'FIXED_ASSET_VALUES_INVALID'; end if;
  if v_in_service_date < v_acquisition_date then raise exception 'FIXED_ASSET_SERVICE_DATE_INVALID'; end if;
  perform public.account_name_for_posting(v_asset_account);
  perform public.account_name_for_posting(v_accumulated_account);
  perform public.account_name_for_posting(v_expense_account);
  if v_asset_account not like '1%' or v_accumulated_account not like '1%' or v_expense_account not like '5%' then raise exception 'FIXED_ASSET_ACCOUNT_CLASS_INVALID'; end if;
  if v_asset_account = v_accumulated_account then raise exception 'FIXED_ASSET_ACCOUNTS_MUST_DIFFER'; end if;

  if p_id is not null then
    select * into v_existing from public.fixed_assets where id = p_id for update;
    if not found then raise exception 'FIXED_ASSET_NOT_FOUND'; end if;
    if v_existing.status <> 'draft' then raise exception 'ONLY_DRAFT_FIXED_ASSET_EDITABLE'; end if;
    v_number := v_existing.asset_number;
  else
    v_number := 'FA-' || lpad(nextval('public.fixed_asset_number_seq')::text, 6, '0');
  end if;

  insert into public.fixed_assets (
    id, asset_number, name, category, acquisition_date, in_service_date, cost, residual_value,
    useful_life_months, asset_account_code, accumulated_depreciation_account_code,
    depreciation_expense_account_code, created_by
  ) values (
    v_id, v_number, v_name, v_category, v_acquisition_date, v_in_service_date, v_cost, v_residual,
    v_life, v_asset_account, v_accumulated_account, v_expense_account, auth.uid()
  ) on conflict (id) do update set
    name = excluded.name, category = excluded.category, acquisition_date = excluded.acquisition_date,
    in_service_date = excluded.in_service_date, cost = excluded.cost, residual_value = excluded.residual_value,
    useful_life_months = excluded.useful_life_months, asset_account_code = excluded.asset_account_code,
    accumulated_depreciation_account_code = excluded.accumulated_depreciation_account_code,
    depreciation_expense_account_code = excluded.depreciation_expense_account_code, updated_at = now();
  return v_id;
end;
$$;

create or replace function public.delete_fixed_asset_draft(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_asset public.fixed_assets%rowtype;
begin
  if not public.accounting_fixed_assets_manage_allowed() then raise exception 'FIXED_ASSET_PERMISSION_REQUIRED'; end if;
  select * into v_asset from public.fixed_assets where id = p_id for update;
  if not found then raise exception 'FIXED_ASSET_NOT_FOUND'; end if;
  if v_asset.status <> 'draft' then raise exception 'ONLY_DRAFT_FIXED_ASSET_DELETABLE'; end if;
  delete from public.fixed_assets where id = p_id;
end;
$$;

create or replace function public.capitalize_fixed_asset(p_id uuid, p_credit_account_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.fixed_assets%rowtype;
  v_entry_id uuid := gen_random_uuid();
  v_asset_name text;
  v_credit_name text;
begin
  if not public.accounting_fixed_assets_manage_allowed() then raise exception 'FIXED_ASSET_PERMISSION_REQUIRED'; end if;
  select * into v_asset from public.fixed_assets where id = p_id for update;
  if not found then raise exception 'FIXED_ASSET_NOT_FOUND'; end if;
  if v_asset.status <> 'draft' then raise exception 'ONLY_DRAFT_FIXED_ASSET_CAPITALIZABLE'; end if;
  v_asset_name := public.account_name_for_posting(v_asset.asset_account_code);
  v_credit_name := public.account_name_for_posting(trim(p_credit_account_code));
  if trim(p_credit_account_code) not like '1%' and trim(p_credit_account_code) not like '2%' then
    raise exception 'FIXED_ASSET_CREDIT_ACCOUNT_CLASS_INVALID';
  end if;
  if trim(p_credit_account_code) = v_asset.asset_account_code then raise exception 'FIXED_ASSET_CAPITALIZATION_ACCOUNTS_MUST_DIFFER'; end if;

  insert into public.accounting_journal_entries (
    id, entry_date, reference_type, source_document_table, source_document_id, description, status
  ) values (
    v_entry_id, v_asset.acquisition_date, 'fixed_asset_capitalization', 'fixed_assets', v_asset.id::text,
    'رسملة أصل ثابت ' || v_asset.asset_number || ' — ' || v_asset.name, 'posted'
  );
  insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
  values
    (v_entry_id, v_asset.asset_account_code, v_asset_name, v_asset.cost, 0, v_asset.name),
    (v_entry_id, trim(p_credit_account_code), v_credit_name, 0, v_asset.cost, v_asset.name);
  update public.fixed_assets set status = 'active', acquisition_credit_account_code = trim(p_credit_account_code),
    capitalization_journal_entry_id = v_entry_id, updated_at = now() where id = p_id;
  return v_entry_id;
end;
$$;

create or replace function public.post_fixed_asset_depreciation(p_id uuid, p_period_end date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.fixed_assets%rowtype;
  v_entry_id uuid := gen_random_uuid();
  v_expected_period date;
  v_accumulated numeric(14,2);
  v_posted_count integer;
  v_depreciable numeric(14,2);
  v_monthly numeric(14,2);
  v_amount numeric(14,2);
  v_expense_name text;
  v_accumulated_name text;
begin
  if not public.accounting_fixed_assets_manage_allowed() then raise exception 'FIXED_ASSET_PERMISSION_REQUIRED'; end if;
  select * into v_asset from public.fixed_assets where id = p_id for update;
  if not found then raise exception 'FIXED_ASSET_NOT_FOUND'; end if;
  if v_asset.status <> 'active' then raise exception 'ONLY_ACTIVE_FIXED_ASSET_DEPRECIABLE'; end if;
  if p_period_end is null or p_period_end <> (date_trunc('month', p_period_end)::date + interval '1 month - 1 day')::date then raise exception 'DEPRECIATION_PERIOD_MUST_BE_MONTH_END'; end if;
  if p_period_end > current_date then raise exception 'FUTURE_DEPRECIATION_NOT_ALLOWED'; end if;
  select coalesce(sum(amount), 0), max(period_end), count(*)
  into v_accumulated, v_expected_period, v_posted_count
  from public.fixed_asset_depreciation where asset_id = p_id;
  v_expected_period := case when v_expected_period is null
    then (date_trunc('month', v_asset.in_service_date)::date + interval '1 month - 1 day')::date
    else (date_trunc('month', v_expected_period + 1)::date + interval '1 month - 1 day')::date end;
  if p_period_end <> v_expected_period then raise exception 'DEPRECIATION_PERIOD_OUT_OF_SEQUENCE: expected %', v_expected_period; end if;
  v_depreciable := v_asset.cost - v_asset.residual_value;
  if v_accumulated >= v_depreciable or v_posted_count >= v_asset.useful_life_months then raise exception 'FIXED_ASSET_FULLY_DEPRECIATED'; end if;
  v_monthly := round(v_depreciable / v_asset.useful_life_months, 2);
  v_amount := case when v_posted_count + 1 = v_asset.useful_life_months
    then v_depreciable - v_accumulated
    else least(v_monthly, v_depreciable - v_accumulated) end;
  if v_amount <= 0 then raise exception 'DEPRECIATION_AMOUNT_INVALID'; end if;
  v_expense_name := public.account_name_for_posting(v_asset.depreciation_expense_account_code);
  v_accumulated_name := public.account_name_for_posting(v_asset.accumulated_depreciation_account_code);

  insert into public.accounting_journal_entries (
    id, entry_date, reference_type, source_document_table, source_document_id, description, status
  ) values (
    v_entry_id, p_period_end, 'fixed_asset_depreciation', 'fixed_asset_depreciation',
    p_id::text || ':' || to_char(p_period_end, 'YYYY-MM-DD'),
    'إهلاك أصل ثابت ' || v_asset.asset_number || ' — ' || v_asset.name, 'posted'
  );
  insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
  values
    (v_entry_id, v_asset.depreciation_expense_account_code, v_expense_name, v_amount, 0, v_asset.name),
    (v_entry_id, v_asset.accumulated_depreciation_account_code, v_accumulated_name, 0, v_amount, v_asset.name);
  insert into public.fixed_asset_depreciation (asset_id, period_end, amount, journal_entry_id, created_by)
  values (p_id, p_period_end, v_amount, v_entry_id, auth.uid());
  return v_entry_id;
end;
$$;

create or replace function public.dispose_fixed_asset(
  p_id uuid,
  p_disposal_date date,
  p_proceeds numeric,
  p_proceeds_account_code text,
  p_gain_loss_account_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.fixed_assets%rowtype;
  v_entry_id uuid := gen_random_uuid();
  v_accumulated numeric(14,2);
  v_carrying numeric(14,2);
  v_proceeds numeric(14,2);
  v_gain_loss numeric(14,2);
  v_last_depreciation_date date;
  v_asset_name text;
  v_accumulated_name text;
  v_proceeds_name text;
  v_gain_loss_name text;
begin
  if not public.accounting_fixed_assets_manage_allowed() then raise exception 'FIXED_ASSET_PERMISSION_REQUIRED'; end if;
  select * into v_asset from public.fixed_assets where id = p_id for update;
  if not found then raise exception 'FIXED_ASSET_NOT_FOUND'; end if;
  if v_asset.status <> 'active' then raise exception 'ONLY_ACTIVE_FIXED_ASSET_DISPOSABLE'; end if;
  if p_disposal_date is null or p_disposal_date < v_asset.in_service_date or p_disposal_date > current_date then raise exception 'FIXED_ASSET_DISPOSAL_DATE_INVALID'; end if;
  begin v_proceeds := round(coalesce(p_proceeds, 0), 2); exception when others then raise exception 'FIXED_ASSET_PROCEEDS_INVALID'; end;
  if v_proceeds::text in ('NaN','Infinity','-Infinity') or v_proceeds < 0 then raise exception 'FIXED_ASSET_PROCEEDS_INVALID'; end if;
  select coalesce(sum(amount), 0), max(period_end) into v_accumulated, v_last_depreciation_date
  from public.fixed_asset_depreciation where asset_id = p_id;
  if v_last_depreciation_date is not null and p_disposal_date < v_last_depreciation_date then
    raise exception 'DISPOSAL_DATE_BEFORE_LAST_DEPRECIATION';
  end if;
  v_carrying := greatest(v_asset.cost - v_accumulated, 0);
  v_gain_loss := v_proceeds - v_carrying;
  v_asset_name := public.account_name_for_posting(v_asset.asset_account_code);
  v_accumulated_name := public.account_name_for_posting(v_asset.accumulated_depreciation_account_code);
  v_gain_loss_name := public.account_name_for_posting(trim(p_gain_loss_account_code));
  if trim(p_gain_loss_account_code) not like '4%' and trim(p_gain_loss_account_code) not like '5%' then
    raise exception 'FIXED_ASSET_GAIN_LOSS_ACCOUNT_CLASS_INVALID';
  end if;
  if v_proceeds > 0 then
    v_proceeds_name := public.account_name_for_posting(trim(p_proceeds_account_code));
    if trim(p_proceeds_account_code) not like '1%' then raise exception 'FIXED_ASSET_PROCEEDS_ACCOUNT_CLASS_INVALID'; end if;
  end if;

  insert into public.accounting_journal_entries (
    id, entry_date, reference_type, source_document_table, source_document_id, description, status
  ) values (
    v_entry_id, p_disposal_date, 'fixed_asset_disposal', 'fixed_asset_disposals', p_id::text,
    'استبعاد أصل ثابت ' || v_asset.asset_number || ' — ' || v_asset.name, 'posted'
  );
  if v_proceeds > 0 then
    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
    values (v_entry_id, trim(p_proceeds_account_code), v_proceeds_name, v_proceeds, 0, v_asset.name);
  end if;
  if v_accumulated > 0 then
    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
    values (v_entry_id, v_asset.accumulated_depreciation_account_code, v_accumulated_name, v_accumulated, 0, v_asset.name);
  end if;
  if v_gain_loss < 0 then
    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
    values (v_entry_id, trim(p_gain_loss_account_code), v_gain_loss_name, abs(v_gain_loss), 0, v_asset.name);
  elsif v_gain_loss > 0 then
    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
    values (v_entry_id, trim(p_gain_loss_account_code), v_gain_loss_name, 0, v_gain_loss, v_asset.name);
  end if;
  insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
  values (v_entry_id, v_asset.asset_account_code, v_asset_name, 0, v_asset.cost, v_asset.name);

  insert into public.fixed_asset_disposals (
    asset_id, disposal_date, proceeds, carrying_amount, gain_loss, proceeds_account_code,
    gain_loss_account_code, journal_entry_id, created_by
  ) values (
    p_id, p_disposal_date, v_proceeds, v_carrying, v_gain_loss,
    case when v_proceeds > 0 then trim(p_proceeds_account_code) else null end,
    trim(p_gain_loss_account_code), v_entry_id, auth.uid()
  );
  update public.fixed_assets set status = 'disposed', disposed_at = p_disposal_date,
    disposal_journal_entry_id = v_entry_id, updated_at = now() where id = p_id;
  return v_entry_id;
end;
$$;

revoke all on function public.accounting_fixed_assets_manage_allowed() from public, anon;
revoke all on function public.save_fixed_asset(uuid, jsonb) from public, anon;
revoke all on function public.delete_fixed_asset_draft(uuid) from public, anon;
revoke all on function public.capitalize_fixed_asset(uuid, text) from public, anon;
revoke all on function public.post_fixed_asset_depreciation(uuid, date) from public, anon;
revoke all on function public.dispose_fixed_asset(uuid, date, numeric, text, text) from public, anon;
grant execute on function public.accounting_fixed_assets_manage_allowed() to authenticated, service_role;
grant execute on function public.save_fixed_asset(uuid, jsonb) to authenticated, service_role;
grant execute on function public.delete_fixed_asset_draft(uuid) to authenticated, service_role;
grant execute on function public.capitalize_fixed_asset(uuid, text) to authenticated, service_role;
grant execute on function public.post_fixed_asset_depreciation(uuid, date) to authenticated, service_role;
grant execute on function public.dispose_fixed_asset(uuid, date, numeric, text, text) to authenticated, service_role;
