-- ZATCA production foundation. This migration does not activate production or submit invoices.

alter table public.zatca_onboarding_settings
  drop constraint if exists zatca_onboarding_settings_mode_check;

alter table public.zatca_onboarding_settings
  add constraint zatca_onboarding_settings_mode_check
  check (mode in ('simulation', 'production'));

alter table public.zatca_onboarding_settings
  add column if not exists organization_key text not null default 'alayaaf',
  add column if not exists branch_key text not null default 'main',
  add column if not exists building_number text,
  add column if not exists street_name text,
  add column if not exists district text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists additional_number text,
  add column if not exists short_address text,
  add column if not exists vat_effective_date date,
  add column if not exists production_enabled boolean not null default false,
  add column if not exists production_confirmed_by uuid references auth.users(id),
  add column if not exists production_confirmed_at timestamptz,
  add column if not exists certificate_expires_at timestamptz,
  add column if not exists certificate_revoked_at timestamptz;

alter table public.zatca_onboarding_settings
  drop constraint if exists zatca_building_number_check,
  add constraint zatca_building_number_check
    check (building_number is null or building_number ~ '^[0-9]{4}$'),
  drop constraint if exists zatca_postal_code_check,
  add constraint zatca_postal_code_check
    check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  drop constraint if exists zatca_additional_number_check,
  add constraint zatca_additional_number_check
    check (additional_number is null or additional_number ~ '^[0-9]{4}$');

drop index if exists public.zatca_onboarding_single_simulation_idx;
create unique index if not exists zatca_onboarding_device_environment_uidx
  on public.zatca_onboarding_settings (organization_key, branch_key, device_serial, mode);

create table if not exists public.zatca_device_sequences (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null unique references public.zatca_onboarding_settings(id) on delete cascade,
  next_icv bigint not null default 1 check (next_icv > 0),
  last_pih text not null default 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==',
  reservation_token uuid,
  reservation_expires_at timestamptz,
  blocked_at timestamptz,
  blocked_reason text,
  updated_at timestamptz not null default now()
);

alter table public.zatca_invoice_submission_logs
  add column if not exists onboarding_id uuid;
alter table public.zatca_invoice_submission_logs
  add column if not exists idempotency_key text,
  add column if not exists icv bigint,
  add column if not exists previous_pih text,
  add column if not exists request_payload jsonb not null default '{}'::jsonb,
  add column if not exists response_text text,
  add column if not exists attempt_count integer not null default 1,
  add column if not exists retry_after timestamptz,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table public.zatca_invoice_submission_logs
    drop constraint if exists zatca_invoice_submission_logs_onboarding_id_fkey;
  alter table public.zatca_invoice_submission_logs
    add constraint zatca_invoice_submission_logs_onboarding_id_fkey
    foreign key (onboarding_id) references public.zatca_onboarding_settings(id) on delete set null;
  alter table public.zatca_invoice_submission_logs
    drop constraint if exists zatca_invoice_submission_logs_status_check;
  alter table public.zatca_invoice_submission_logs
    add constraint zatca_invoice_submission_logs_status_check
    check (status in ('submitted', 'cleared', 'reported', 'rejected', 'failed', 'ambiguous'));
end $$;

create unique index if not exists zatca_submission_idempotency_uidx
  on public.zatca_invoice_submission_logs (idempotency_key)
  where idempotency_key is not null;
create index if not exists zatca_submission_retry_idx
  on public.zatca_invoice_submission_logs (mode, status, retry_after)
  where status = 'failed';

alter table public.zatca_device_sequences enable row level security;
revoke all on public.zatca_device_sequences from public, anon, authenticated;
grant all on public.zatca_device_sequences to service_role;

create or replace function public.reserve_zatca_sequence(p_onboarding_id uuid)
returns table (reservation_token uuid, icv bigint, previous_pih text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid := gen_random_uuid();
  v_row public.zatca_device_sequences%rowtype;
begin
  insert into public.zatca_device_sequences (onboarding_id)
  values (p_onboarding_id)
  on conflict (onboarding_id) do nothing;

  select * into v_row
  from public.zatca_device_sequences
  where onboarding_id = p_onboarding_id
  for update;

  if v_row.blocked_at is not null then
    raise exception 'ZATCA_SEQUENCE_BLOCKED: %', coalesce(v_row.blocked_reason, 'manual reconciliation required');
  end if;

  if v_row.reservation_token is not null
     and v_row.reservation_expires_at > now() then
    raise exception 'ZATCA_SEQUENCE_BUSY';
  end if;

  update public.zatca_device_sequences
  set reservation_token = v_token,
      reservation_expires_at = now() + interval '2 minutes',
      updated_at = now()
  where onboarding_id = p_onboarding_id;

  return query select v_token, v_row.next_icv, v_row.last_pih;
end;
$$;

create or replace function public.finalize_zatca_sequence(
  p_onboarding_id uuid,
  p_reservation_token uuid,
  p_invoice_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.zatca_device_sequences
  set next_icv = next_icv + 1,
      last_pih = p_invoice_hash,
      reservation_token = null,
      reservation_expires_at = null,
      updated_at = now()
  where onboarding_id = p_onboarding_id
    and reservation_token = p_reservation_token;
  if not found then raise exception 'INVALID_ZATCA_SEQUENCE_RESERVATION'; end if;
end;
$$;

create or replace function public.block_zatca_sequence(
  p_onboarding_id uuid,
  p_reservation_token uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.zatca_device_sequences
  set blocked_at = now(),
      blocked_reason = p_reason,
      reservation_expires_at = null,
      updated_at = now()
  where onboarding_id = p_onboarding_id
    and reservation_token = p_reservation_token;
  if not found then raise exception 'INVALID_ZATCA_SEQUENCE_RESERVATION'; end if;
end;
$$;

create or replace function public.release_zatca_sequence(
  p_onboarding_id uuid,
  p_reservation_token uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.zatca_device_sequences
  set reservation_token = null,
      reservation_expires_at = null,
      updated_at = now()
  where onboarding_id = p_onboarding_id
    and reservation_token = p_reservation_token;
$$;

revoke all on function public.reserve_zatca_sequence(uuid) from public, anon, authenticated;
revoke all on function public.finalize_zatca_sequence(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.release_zatca_sequence(uuid, uuid) from public, anon, authenticated;
revoke all on function public.block_zatca_sequence(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_zatca_sequence(uuid) to service_role;
grant execute on function public.finalize_zatca_sequence(uuid, uuid, text) to service_role;
grant execute on function public.release_zatca_sequence(uuid, uuid) to service_role;
grant execute on function public.block_zatca_sequence(uuid, uuid, text) to service_role;

comment on column public.zatca_onboarding_settings.production_enabled is
  'Manual production submission gate. Must remain false until real credentials exist and an administrator confirms activation.';
comment on table public.zatca_device_sequences is
  'Atomic per-EGS ICV and PIH chain. Server-only.';
