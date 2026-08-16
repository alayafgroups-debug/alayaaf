alter table public.customers
  add column if not exists country text,
  add column if not exists tax_registration_mode text not null default 'not_registered',
  add column if not exists tax_number text,
  add column if not exists city text,
  add column if not exists street text,
  add column if not exists building_number text,
  add column if not exists district text,
  add column if not exists postal_code text,
  add column if not exists invoice_ref text,
  add column if not exists currency text not null default 'SAR',
  add column if not exists payment_terms text,
  add column if not exists business_type text,
  add column if not exists license_number text;

alter table public.vendors
  add column if not exists country text,
  add column if not exists tax_registration_mode text not null default 'not_registered',
  add column if not exists tax_number text,
  add column if not exists city text,
  add column if not exists street text,
  add column if not exists building_number text,
  add column if not exists district text,
  add column if not exists postal_code text,
  add column if not exists invoice_ref text,
  add column if not exists currency text not null default 'SAR',
  add column if not exists payment_terms text,
  add column if not exists business_type text,
  add column if not exists license_number text;

alter table public.customers
  drop constraint if exists customers_tax_registration_mode_check,
  add constraint customers_tax_registration_mode_check
    check (tax_registration_mode in ('not_registered', 'registered_sa')),
  drop constraint if exists customers_tax_number_check,
  add constraint customers_tax_number_check
    check (
      tax_registration_mode <> 'registered_sa'
      or tax_number ~ '^3[0-9]{14}$'
    );

alter table public.vendors
  drop constraint if exists vendors_tax_registration_mode_check,
  add constraint vendors_tax_registration_mode_check
    check (tax_registration_mode in ('not_registered', 'registered_sa')),
  drop constraint if exists vendors_tax_number_check,
  add constraint vendors_tax_number_check
    check (
      tax_registration_mode <> 'registered_sa'
      or tax_number ~ '^3[0-9]{14}$'
    );

comment on column public.customers.tax_number is
  'Saudi VAT number used on standard B2B sales invoices and ZATCA clearance.';
comment on column public.customers.tax_registration_mode is
  'Controls whether the customer is treated as VAT-registered in Saudi Arabia.';
