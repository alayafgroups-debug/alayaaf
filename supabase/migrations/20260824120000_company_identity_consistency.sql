-- Canonical legal identity used by all current company-owned records.
-- Historical signed invoice XML and ZATCA submission logs are intentionally immutable.

do $$
declare
  v_company_name_ar constant text := 'شركة إدارة العياف للمقاولات';
  v_company_name_en constant text := 'Company Idarat Al Ayaf For Contracting';
begin
  update public.accounting_accounts
  set company_name = v_company_name_ar,
      updated_at = now()
  where company_name in (
    'شركة العياف التجارية',
    'شركة لاكجري العياف',
    'شركة الأياف'
  );

  update public.accounting_posting_rules
  set company_name = v_company_name_ar,
      updated_at = now()
  where company_name is distinct from v_company_name_ar;

  alter table public.accounting_posting_rules
    alter column company_name set default 'شركة إدارة العياف للمقاولات';

  if to_regclass('public.cost_centers') is not null then
    execute format(
      'update public.cost_centers set company_name = $1 where company_name in ($2, $3, $4)'
    ) using
      v_company_name_ar,
      'شركة العياف التجارية',
      'شركة لاكجري العياف',
      'شركة الأياف';
  end if;

  if to_regclass('public.app_users') is not null then
    execute format(
      'update public.app_users set company = $1 where company in ($2, $3, $4)'
    ) using
      v_company_name_ar,
      'شركة العياف التجارية',
      'شركة لاكجري العياف',
      'شركة الأياف';
  end if;

  update public.zatca_onboarding_settings
  set company_name_ar = v_company_name_ar,
      company_name_en = v_company_name_en,
      updated_at = now()
  where company_name_ar in (
      'شركة العياف التجارية',
      'شركة لاكجري العياف',
      'شركة الأياف'
    )
    or company_name_en in (
      'Al Ayaf Trading Company',
      'Luxury Al Ayaf Company',
      'Al Ayaf Company'
    );
end;
$$;

comment on column public.accounting_accounts.company_name is
  'Canonical legal company name: شركة إدارة العياف للمقاولات.';
comment on column public.accounting_posting_rules.company_name is
  'Canonical legal company name: شركة إدارة العياف للمقاولات.';
