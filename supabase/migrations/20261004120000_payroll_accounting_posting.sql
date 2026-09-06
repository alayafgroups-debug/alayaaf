-- Atomic payroll accrual posting. This migration does not modify or invoke any ZATCA object or flow.

insert into public.accounting_accounts (
  code, company_name, name_ar, name_en, parent_code, cash_flow_type,
  account_type, level, is_system
) values
  ('212', 'شركة إدارة العياف للمقاولات', 'استقطاعات الموظفين المستحقة', 'Employee Deductions Payable', '21', 'التشغيليات', 'التشغيليات', 2, true),
  ('217', 'شركة إدارة العياف للمقاولات', 'التأمينات الاجتماعية المستحقة', 'Social Insurance Payable', '21', 'التشغيليات', 'التشغيليات', 2, true),
  ('516', 'شركة إدارة العياف للمقاولات', 'مصروف الرواتب والأجور', 'Salaries and Wages Expense', '51', 'التشغيليات', 'التشغيليات', 2, true)
on conflict (code) do nothing;

alter table public.accounting_posting_rules
  add column if not exists payroll_expense_account_code text not null default '516',
  add column if not exists payroll_payable_account_code text not null default '214',
  add column if not exists payroll_social_insurance_account_code text not null default '217',
  add column if not exists payroll_deductions_account_code text not null default '212';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'accounting_rules_payroll_expense_fk') then
    alter table public.accounting_posting_rules add constraint accounting_rules_payroll_expense_fk
      foreign key (payroll_expense_account_code) references public.accounting_accounts(code) on update restrict on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounting_rules_payroll_payable_fk') then
    alter table public.accounting_posting_rules add constraint accounting_rules_payroll_payable_fk
      foreign key (payroll_payable_account_code) references public.accounting_accounts(code) on update restrict on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounting_rules_payroll_social_insurance_fk') then
    alter table public.accounting_posting_rules add constraint accounting_rules_payroll_social_insurance_fk
      foreign key (payroll_social_insurance_account_code) references public.accounting_accounts(code) on update restrict on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounting_rules_payroll_deductions_fk') then
    alter table public.accounting_posting_rules add constraint accounting_rules_payroll_deductions_fk
      foreign key (payroll_deductions_account_code) references public.accounting_accounts(code) on update restrict on delete restrict;
  end if;
end
$$;

alter table public.payroll
  add column if not exists accounting_status text not null default 'unposted',
  add column if not exists accounting_journal_entry_id uuid references public.accounting_journal_entries(id) on delete restrict,
  add column if not exists accounting_posted_at timestamptz,
  add column if not exists accounting_error text,
  add column if not exists posted_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payroll_accounting_status_check') then
    alter table public.payroll add constraint payroll_accounting_status_check
      check (accounting_status in ('unposted', 'posted', 'failed'));
  end if;
end
$$;

create index if not exists payroll_accounting_journal_idx
  on public.payroll(accounting_journal_entry_id)
  where accounting_journal_entry_id is not null;
create index if not exists payroll_posted_by_idx
  on public.payroll(posted_by)
  where posted_by is not null;
create unique index if not exists payroll_employee_period_uidx
  on public.payroll(emp_id, month)
  where emp_id is not null and month is not null;

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
  v_inventory_shortage text := trim(p_defaults->>'inventoryShortageAccountCode');
  v_inventory_surplus text := trim(p_defaults->>'inventorySurplusAccountCode');
  v_payroll_expense text := trim(p_defaults->>'payrollExpenseAccountCode');
  v_payroll_payable text := trim(p_defaults->>'payrollPayableAccountCode');
  v_payroll_social text := trim(p_defaults->>'payrollSocialInsuranceAccountCode');
  v_payroll_deductions text := trim(p_defaults->>'payrollDeductionsAccountCode');
begin
  if not public.accounting_settings_manage_allowed() then raise exception 'ACCOUNTING_SETTINGS_PERMISSION_REQUIRED'; end if;
  perform public.account_name_for_posting(v_receivable);
  perform public.account_name_for_posting(v_revenue);
  perform public.account_name_for_posting(v_output_vat);
  perform public.account_name_for_posting(v_payable);
  perform public.account_name_for_posting(v_purchase);
  perform public.account_name_for_posting(v_input_vat);
  perform public.account_name_for_posting(v_inventory_shortage);
  perform public.account_name_for_posting(v_inventory_surplus);
  perform public.account_name_for_posting(v_payroll_expense);
  perform public.account_name_for_posting(v_payroll_payable);
  perform public.account_name_for_posting(v_payroll_social);
  perform public.account_name_for_posting(v_payroll_deductions);
  if v_receivable not like '1%' then raise exception 'RECEIVABLE_ACCOUNT_CLASS_INVALID'; end if;
  if v_revenue not like '4%' then raise exception 'REVENUE_ACCOUNT_CLASS_INVALID'; end if;
  if v_output_vat not like '2%' then raise exception 'OUTPUT_VAT_ACCOUNT_CLASS_INVALID'; end if;
  if v_payable not like '2%' then raise exception 'PAYABLE_ACCOUNT_CLASS_INVALID'; end if;
  if v_purchase not like '5%' then raise exception 'PURCHASE_ACCOUNT_CLASS_INVALID'; end if;
  if v_input_vat not like '2%' then raise exception 'INPUT_VAT_ACCOUNT_CLASS_INVALID'; end if;
  if v_inventory_shortage not like '5%' then raise exception 'INVENTORY_SHORTAGE_ACCOUNT_CLASS_INVALID'; end if;
  if v_inventory_surplus not like '4%' then raise exception 'INVENTORY_SURPLUS_ACCOUNT_CLASS_INVALID'; end if;
  if v_payroll_expense not like '5%' then raise exception 'PAYROLL_EXPENSE_ACCOUNT_CLASS_INVALID'; end if;
  if v_payroll_payable not like '2%' then raise exception 'PAYROLL_PAYABLE_ACCOUNT_CLASS_INVALID'; end if;
  if v_payroll_social not like '2%' then raise exception 'PAYROLL_SOCIAL_ACCOUNT_CLASS_INVALID'; end if;
  if v_payroll_deductions not like '2%' then raise exception 'PAYROLL_DEDUCTIONS_ACCOUNT_CLASS_INVALID'; end if;

  update public.accounting_posting_rules
  set receivable_account_code = v_receivable,
      revenue_account_code = v_revenue,
      output_vat_account_code = v_output_vat,
      payable_account_code = v_payable,
      purchase_account_code = v_purchase,
      input_vat_account_code = v_input_vat,
      inventory_shortage_account_code = v_inventory_shortage,
      inventory_surplus_account_code = v_inventory_surplus,
      payroll_expense_account_code = v_payroll_expense,
      payroll_payable_account_code = v_payroll_payable,
      payroll_social_insurance_account_code = v_payroll_social,
      payroll_deductions_account_code = v_payroll_deductions,
      updated_at = now()
  where rule_code = 'sales_default' and active;
  if not found then raise exception 'ACCOUNTING_POSTING_RULE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.post_payroll_period_accounting(p_period text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_entry_date date;
  v_row_count integer;
  v_gross numeric(14,2);
  v_deductions numeric(14,2);
  v_social numeric(14,2);
  v_other_deductions numeric(14,2);
  v_net numeric(14,2);
  v_expense_code text;
  v_payable_code text;
  v_social_code text;
  v_deductions_code text;
begin
  if not public.business_permission_allowed(array['hr.payroll', 'module.hr'], true) then
    raise exception 'PAYROLL_MANAGE_PERMISSION_REQUIRED';
  end if;
  if not public.accounting_access_allowed(true) then
    raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED';
  end if;
  if p_period is null or p_period !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'PAYROLL_PERIOD_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtext('payroll_posting:' || p_period));

  select id into v_entry_id
  from public.accounting_journal_entries
  where source_document_table = 'payroll' and source_document_id = p_period
  limit 1;
  if v_entry_id is not null then return v_entry_id; end if;

  perform 1 from public.payroll where month = p_period for update;
  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then raise exception 'PAYROLL_PERIOD_EMPTY'; end if;
  if exists (select 1 from public.payroll where month = p_period and status is distinct from 'معتمد') then
    raise exception 'PAYROLL_PERIOD_REQUIRES_APPROVAL';
  end if;
  if exists (
    select 1 from public.payroll
    where month = p_period
      and (accounting_journal_entry_id is not null or accounting_status = 'posted')
  ) then
    raise exception 'PAYROLL_PERIOD_ALREADY_POSTED';
  end if;
  if exists (
    select 1 from public.payroll
    where month = p_period
      and (coalesce(basic_salary, 0) < 0 or coalesce(allowances, 0) < 0
        or coalesce(deductions, 0) < 0 or coalesce(net_salary, 0) < 0
        or coalesce(social_insurance_deduction, 0) < 0
        or coalesce(social_insurance_deduction, 0) > coalesce(deductions, 0))
  ) then
    raise exception 'PAYROLL_PERIOD_AMOUNTS_INVALID';
  end if;

  select round(sum(coalesce(basic_salary, 0) + coalesce(allowances, 0)), 2),
         round(sum(coalesce(deductions, 0)), 2),
         round(sum(coalesce(social_insurance_deduction, 0)), 2),
         round(sum(coalesce(net_salary, 0)), 2)
  into v_gross, v_deductions, v_social, v_net
  from public.payroll where month = p_period;
  v_other_deductions := round(v_deductions - v_social, 2);
  if v_gross <= 0 or abs(v_gross - v_net - v_deductions) > 0.01 then
    raise exception 'PAYROLL_PERIOD_TOTALS_NOT_BALANCED';
  end if;

  v_entry_date := (to_date(p_period || '-01', 'YYYY-MM-DD') + interval '1 month - 1 day')::date;
  perform public.assert_accounting_period_open(v_entry_date);

  select payroll_expense_account_code, payroll_payable_account_code,
         payroll_social_insurance_account_code, payroll_deductions_account_code
  into v_expense_code, v_payable_code, v_social_code, v_deductions_code
  from public.accounting_posting_rules
  where rule_code = 'sales_default' and active;
  if not found then raise exception 'PAYROLL_POSTING_RULE_NOT_FOUND'; end if;
  perform public.account_name_for_posting(v_expense_code);
  perform public.account_name_for_posting(v_payable_code);
  perform public.account_name_for_posting(v_social_code);
  perform public.account_name_for_posting(v_deductions_code);

  insert into public.accounting_journal_entries (
    entry_date, reference_type, source_document_table, source_document_id, description, status
  ) values (
    v_entry_date, 'payroll', 'payroll', p_period, 'استحقاق رواتب الفترة ' || p_period, 'posted'
  ) returning id into v_entry_id;

  insert into public.accounting_journal_lines (
    journal_entry_id, account_code, account_name, debit, credit, counterparty
  ) values (
    v_entry_id, v_expense_code, public.account_name_for_posting(v_expense_code), v_gross, 0, 'الموظفون'
  ), (
    v_entry_id, v_payable_code, public.account_name_for_posting(v_payable_code), 0, v_net, 'الموظفون'
  );
  if v_social > 0 then
    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
    values (v_entry_id, v_social_code, public.account_name_for_posting(v_social_code), 0, v_social, 'التأمينات الاجتماعية');
  end if;
  if v_other_deductions > 0 then
    insert into public.accounting_journal_lines (journal_entry_id, account_code, account_name, debit, credit, counterparty)
    values (v_entry_id, v_deductions_code, public.account_name_for_posting(v_deductions_code), 0, v_other_deductions, 'استقطاعات الموظفين');
  end if;

  if abs((select coalesce(sum(debit), 0) - coalesce(sum(credit), 0)
          from public.accounting_journal_lines where journal_entry_id = v_entry_id)) > 0.01 then
    raise exception 'PAYROLL_JOURNAL_NOT_BALANCED';
  end if;

  update public.payroll
  set status = 'مرحّل', accounting_status = 'posted',
      accounting_journal_entry_id = v_entry_id, accounting_posted_at = now(),
      accounting_error = null, posted_by = auth.uid()
  where month = p_period;
  return v_entry_id;
end;
$$;

create or replace function public.protect_posted_payroll()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.accounting_status = 'posted' then
    if tg_op = 'DELETE' then raise exception 'POSTED_PAYROLL_IMMUTABLE'; end if;
    if new.emp_id is distinct from old.emp_id
       or new.emp_name is distinct from old.emp_name
       or new.department is distinct from old.department
       or new.month is distinct from old.month
       or new.basic_salary is distinct from old.basic_salary
       or new.allowances is distinct from old.allowances
       or new.deductions is distinct from old.deductions
       or new.net_salary is distinct from old.net_salary
       or new.social_insurance_deduction is distinct from old.social_insurance_deduction
       or new.social_insurance_rate is distinct from old.social_insurance_rate
       or new.status is distinct from old.status
       or new.accounting_status is distinct from old.accounting_status
       or new.accounting_journal_entry_id is distinct from old.accounting_journal_entry_id
       or new.accounting_posted_at is distinct from old.accounting_posted_at then
      raise exception 'POSTED_PAYROLL_IMMUTABLE';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists protect_posted_payroll on public.payroll;
create trigger protect_posted_payroll
before update or delete on public.payroll
for each row execute function public.protect_posted_payroll();

drop policy if exists authenticated_all on public.payroll;
drop policy if exists payroll_authorized_select on public.payroll;
drop policy if exists payroll_authorized_insert on public.payroll;
drop policy if exists payroll_authorized_update on public.payroll;
drop policy if exists payroll_authorized_delete on public.payroll;
create policy payroll_authorized_select on public.payroll for select to authenticated
using ((select public.business_permission_allowed(array['hr.payroll', 'hr.reports', 'module.hr'], false)));
create policy payroll_authorized_insert on public.payroll for insert to authenticated
with check ((select public.business_permission_allowed(array['hr.payroll', 'module.hr'], true)));
create policy payroll_authorized_update on public.payroll for update to authenticated
using ((select public.business_permission_allowed(array['hr.payroll', 'module.hr'], true)))
with check ((select public.business_permission_allowed(array['hr.payroll', 'module.hr'], true)));
create policy payroll_authorized_delete on public.payroll for delete to authenticated
using (accounting_status <> 'posted' and (select public.business_permission_allowed(array['hr.payroll', 'module.hr'], true)));

revoke truncate on public.payroll from authenticated;
revoke all on function public.post_payroll_period_accounting(text) from public, anon;
grant execute on function public.post_payroll_period_accounting(text) to authenticated, service_role;
revoke all on function public.protect_posted_payroll() from public, anon, authenticated;
