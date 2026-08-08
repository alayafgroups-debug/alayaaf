-- ZATCA production onboarding state and invoice lifecycle metadata.
-- All columns are nullable/defaulted so existing invoices remain readable.

alter table public.zatca_onboarding_settings
  add column if not exists production_request_id text,
  add column if not exists production_csid text,
  add column if not exists production_secret text,
  add column if not exists production_csid_masked text,
  add column if not exists production_issued_at timestamptz,
  add column if not exists production_status text not null default 'not_requested';

alter table public.sales_invoices
  add column if not exists invoice_type text not null default 'standard',
  add column if not exists buyer_vat text,
  add column if not exists customer_address text,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists subtotal numeric(14,2) not null default 0,
  add column if not exists total_tax numeric(14,2) not null default 0,
  add column if not exists uuid text,
  add column if not exists icv text,
  add column if not exists pih text,
  add column if not exists qr_code_data text,
  add column if not exists cryptographic_stamp text,
  add column if not exists invoice_xml text,
  add column if not exists zatca_status text not null default 'pending',
  add column if not exists zatca_response jsonb,
  add column if not exists zatca_submitted_at timestamptz,
  add column if not exists zatca_approved_at timestamptz,
  add column if not exists zatca_reported_at timestamptz;

alter table public.invoice_adjustment_notes
  add column if not exists invoice_type text not null default 'standard',
  add column if not exists uuid text,
  add column if not exists icv text,
  add column if not exists pih text,
  add column if not exists qr_code_data text,
  add column if not exists cryptographic_stamp text,
  add column if not exists invoice_xml text,
  add column if not exists zatca_status text not null default 'pending',
  add column if not exists zatca_response jsonb,
  add column if not exists zatca_submitted_at timestamptz,
  add column if not exists zatca_approved_at timestamptz,
  add column if not exists zatca_reported_at timestamptz;

create unique index if not exists sales_invoices_zatca_uuid_uidx
  on public.sales_invoices(uuid) where uuid is not null;
create unique index if not exists invoice_adjustment_notes_zatca_uuid_uidx
  on public.invoice_adjustment_notes(uuid) where uuid is not null;

create table if not exists public.zatca_invoice_submission_logs (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null,
  invoice_table text not null check (invoice_table in ('sales_invoices', 'invoice_adjustment_notes')),
  document_type text not null check (document_type in ('invoice', 'creditNote', 'debitNote')),
  invoice_type text not null check (invoice_type in ('standard', 'simplified')),
  mode text not null check (mode in ('simulation', 'production')),
  endpoint text not null,
  http_status integer,
  request_uuid text,
  invoice_hash text,
  response jsonb not null default '{}'::jsonb,
  status text not null check (status in ('submitted', 'cleared', 'reported', 'rejected', 'failed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists zatca_invoice_submission_logs_invoice_idx
  on public.zatca_invoice_submission_logs(invoice_table, invoice_id, created_at desc);

alter table public.zatca_invoice_submission_logs enable row level security;
revoke all on public.zatca_invoice_submission_logs from public, anon, authenticated;
grant all on public.zatca_invoice_submission_logs to service_role;

comment on column public.zatca_onboarding_settings.production_secret is
  'Server-only production credential. Never expose through client selects.';
comment on table public.zatca_invoice_submission_logs is
  'Server-only immutable audit log for invoice submissions to ZATCA.';
