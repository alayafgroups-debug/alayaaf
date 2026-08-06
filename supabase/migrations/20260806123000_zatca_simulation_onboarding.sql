create extension if not exists pgcrypto;

create table if not exists public.zatca_onboarding_settings (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  mode text not null default 'simulation' check (mode = 'simulation'),
  company_name_ar text not null,
  company_name_en text,
  vat_number text not null check (vat_number ~ '^[0-9]{15}$'),
  commercial_registration text not null check (commercial_registration ~ '^[0-9]{10,15}$'),
  branch_name text not null,
  branch_location text not null,
  industry text not null,
  device_manufacturer text not null,
  device_model text not null,
  device_serial text not null,
  common_name text not null,
  invoice_type text not null default '1100' check (invoice_type in ('1000', '0100', '1100')),
  status text not null default 'identity_saved' check (status in (
    'identity_saved',
    'csr_generated',
    'compliance_ready',
    'compliance_testing',
    'compliance_passed',
    'failed'
  )),
  csr_pem text,
  public_key_pem text,
  private_key_pem text,
  compliance_request_id text,
  compliance_csid text,
  compliance_secret text,
  compliance_csid_masked text,
  compliance_issued_at timestamptz,
  compliance_results jsonb not null default '[]'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists zatca_onboarding_single_simulation_idx
  on public.zatca_onboarding_settings (mode);

create table if not exists public.zatca_onboarding_audit (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid references public.zatca_onboarding_settings(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  result text not null check (result in ('success', 'failed')),
  http_status integer,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.zatca_onboarding_settings enable row level security;
alter table public.zatca_onboarding_audit enable row level security;

revoke all on public.zatca_onboarding_settings from public, anon, authenticated;
revoke all on public.zatca_onboarding_audit from public, anon, authenticated;
grant all on public.zatca_onboarding_settings to service_role;
grant all on public.zatca_onboarding_audit to service_role;

comment on table public.zatca_onboarding_settings is
  'Server-only ZATCA onboarding state. Private keys and credentials must never be queried from the browser.';
comment on table public.zatca_onboarding_audit is
  'Server-only audit trail for ZATCA onboarding and compliance operations.';
