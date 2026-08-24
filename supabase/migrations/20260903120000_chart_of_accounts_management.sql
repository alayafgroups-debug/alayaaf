-- Server-validated chart of accounts management.
-- No ZATCA XML, signing, QR, clearance, reporting, or invoice submission flow is modified.

create or replace function public.save_accounting_account(p_account jsonb)
returns public.accounting_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := trim(p_account->>'code');
  v_parent_code text := nullif(trim(p_account->>'parentCode'), '');
  v_name_ar text := trim(p_account->>'nameAr');
  v_name_en text := trim(coalesce(p_account->>'nameEn', ''));
  v_existing public.accounting_accounts%rowtype;
  v_parent public.accounting_accounts%rowtype;
  v_result public.accounting_accounts%rowtype;
  v_level integer;
  v_is_new boolean;
begin
  if not public.accounting_access_allowed(true) then
    raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED';
  end if;
  if v_code is null or v_code !~ '^[0-9]{1,12}$' then
    raise exception 'ACCOUNT_CODE_INVALID';
  end if;
  if v_name_ar is null or v_name_ar = '' then
    raise exception 'ACCOUNT_ARABIC_NAME_REQUIRED';
  end if;

  select * into v_existing
  from public.accounting_accounts
  where code = v_code
  for update;
  v_is_new := not found;

  if v_is_new and v_parent_code is null then
    raise exception 'NEW_ROOT_ACCOUNT_NOT_ALLOWED';
  end if;
  if not v_is_new and v_existing.is_system and v_parent_code is distinct from nullif(v_existing.parent_code, '') then
    raise exception 'SYSTEM_ACCOUNT_PARENT_IMMUTABLE';
  end if;

  if v_parent_code is null then
    v_level := 0;
  else
    if v_parent_code = v_code then
      raise exception 'ACCOUNT_CANNOT_PARENT_ITSELF';
    end if;
    select * into v_parent
    from public.accounting_accounts
    where code = v_parent_code
    for update;
    if not found then
      raise exception 'ACCOUNT_PARENT_NOT_FOUND';
    end if;

    if not v_is_new and exists (
      with recursive descendants as (
        select code from public.accounting_accounts where parent_code = v_code
        union all
        select child.code
        from public.accounting_accounts child
        join descendants parent on child.parent_code = parent.code
      )
      select 1 from descendants where code = v_parent_code
    ) then
      raise exception 'ACCOUNT_PARENT_CYCLE';
    end if;

    if v_is_new and (
      exists (select 1 from public.accounting_journal_lines where account_code = v_parent_code)
      or exists (select 1 from public.accounting_bank_accounts where account_code = v_parent_code)
      or exists (
        select 1 from public.accounting_posting_rules
        where active and v_parent_code in (
          receivable_account_code, revenue_account_code, output_vat_account_code,
          payable_account_code, purchase_account_code, input_vat_account_code
        )
      )
    ) then
      raise exception 'POSTED_OR_CONFIGURED_ACCOUNT_CANNOT_BECOME_GROUP';
    end if;
    v_level := v_parent.level + 1;
  end if;

  if v_is_new then
    insert into public.accounting_accounts (
      code, company_name, name_ar, name_en, parent_code, cash_flow_type,
      account_type, level, enable_payments, show_expense_claims,
      is_main_category, category_color, currency_badge, is_system, updated_at
    ) values (
      v_code, 'شركة إدارة العياف للمقاولات', v_name_ar, v_name_en, v_parent_code,
      coalesce(p_account->>'cashFlowType', ''), coalesce(p_account->>'accountType', 'التشغيليات'),
      v_level, coalesce((p_account->>'enablePayments')::boolean, false),
      coalesce((p_account->>'showExpenseClaims')::boolean, false), false, null,
      nullif(p_account->>'currencyBadge', ''), false, now()
    ) returning * into v_result;
  else
    update public.accounting_accounts
    set name_ar = v_name_ar,
        name_en = v_name_en,
        parent_code = case when is_system then parent_code else v_parent_code end,
        level = case when is_system then level else v_level end,
        cash_flow_type = coalesce(p_account->>'cashFlowType', cash_flow_type),
        account_type = coalesce(p_account->>'accountType', account_type),
        enable_payments = coalesce((p_account->>'enablePayments')::boolean, enable_payments),
        show_expense_claims = coalesce((p_account->>'showExpenseClaims')::boolean, show_expense_claims),
        updated_at = now()
    where code = v_code
    returning * into v_result;
  end if;

  return v_result;
end;
$$;

create or replace function public.delete_accounting_account(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounting_accounts%rowtype;
begin
  if not public.accounting_access_allowed(true) then
    raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED';
  end if;
  select * into v_account from public.accounting_accounts where code = trim(p_code) for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
  if v_account.is_system then raise exception 'SYSTEM_ACCOUNT_IMMUTABLE'; end if;
  if exists (select 1 from public.accounting_accounts where parent_code = v_account.code) then
    raise exception 'ACCOUNT_HAS_CHILDREN';
  end if;
  if exists (select 1 from public.accounting_journal_lines where account_code = v_account.code) then
    raise exception 'ACCOUNT_HAS_JOURNAL_ACTIVITY';
  end if;
  if exists (select 1 from public.accounting_bank_accounts where account_code = v_account.code) then
    raise exception 'ACCOUNT_LINKED_TO_BANK';
  end if;
  if exists (
    select 1 from public.accounting_posting_rules
    where v_account.code in (
      receivable_account_code, revenue_account_code, output_vat_account_code,
      payable_account_code, purchase_account_code, input_vat_account_code
    )
  ) then
    raise exception 'ACCOUNT_USED_IN_POSTING_RULE';
  end if;
  if exists (select 1 from public.cost_centers where linked_account_code = v_account.code) then
    raise exception 'ACCOUNT_LINKED_TO_COST_CENTER';
  end if;
  if exists (select 1 from public.expense_voucher_items where account_code = v_account.code) then
    raise exception 'ACCOUNT_USED_BY_EXPENSE_VOUCHER';
  end if;

  delete from public.accounting_accounts where code = v_account.code;
end;
$$;

create or replace function public.save_sales_accounting_posting_rule(
  p_receivable_account_code text,
  p_revenue_account_code text,
  p_output_vat_account_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.accounting_access_allowed(true) then
    raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED';
  end if;
  perform public.account_name_for_posting(p_receivable_account_code);
  perform public.account_name_for_posting(p_revenue_account_code);
  perform public.account_name_for_posting(p_output_vat_account_code);

  update public.accounting_posting_rules
  set receivable_account_code = p_receivable_account_code,
      revenue_account_code = p_revenue_account_code,
      output_vat_account_code = p_output_vat_account_code,
      updated_at = now()
  where rule_code = 'sales_default' and active;
  if not found then raise exception 'ACCOUNTING_POSTING_RULE_NOT_FOUND'; end if;
end;
$$;

alter table public.accounting_accounts enable row level security;
revoke insert, update, delete on public.accounting_accounts from anon, authenticated;
grant select on public.accounting_accounts to authenticated;
revoke insert, update, delete on public.accounting_posting_rules from anon, authenticated;
grant select on public.accounting_posting_rules to authenticated;
revoke all on function public.save_accounting_account(jsonb) from public;
revoke all on function public.delete_accounting_account(text) from public;
revoke all on function public.save_sales_accounting_posting_rule(text, text, text) from public;
grant execute on function public.save_accounting_account(jsonb) to authenticated;
grant execute on function public.delete_accounting_account(text) to authenticated;
grant execute on function public.save_sales_accounting_posting_rule(text, text, text) to authenticated;
