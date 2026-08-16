create extension if not exists supabase_vault with schema vault;

alter table public.zatca_onboarding_settings
  add column if not exists private_key_secret_id uuid,
  add column if not exists compliance_csid_secret_id uuid,
  add column if not exists compliance_secret_secret_id uuid,
  add column if not exists production_csid_secret_id uuid,
  add column if not exists production_secret_secret_id uuid;

create or replace function public.store_zatca_secret(
  p_onboarding_id uuid,
  p_kind text,
  p_secret text
)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
  v_name text;
begin
  if p_secret is null or p_secret = '' then
    raise exception 'ZATCA_SECRET_MUST_NOT_BE_EMPTY';
  end if;

  if p_kind not in (
    'private_key',
    'compliance_csid',
    'compliance_secret',
    'production_csid',
    'production_secret'
  ) then
    raise exception 'INVALID_ZATCA_SECRET_KIND';
  end if;

  select case p_kind
    when 'private_key' then private_key_secret_id
    when 'compliance_csid' then compliance_csid_secret_id
    when 'compliance_secret' then compliance_secret_secret_id
    when 'production_csid' then production_csid_secret_id
    when 'production_secret' then production_secret_secret_id
  end
  into v_secret_id
  from public.zatca_onboarding_settings
  where id = p_onboarding_id
  for update;

  if not found then
    raise exception 'ZATCA_ONBOARDING_NOT_FOUND';
  end if;

  v_name := 'zatca:' || p_onboarding_id::text || ':' || p_kind;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_secret,
      v_name,
      'ZATCA credential managed by server-only RPC'
    );
  else
    perform vault.update_secret(
      v_secret_id,
      p_secret,
      v_name,
      'ZATCA credential managed by server-only RPC'
    );
  end if;

  update public.zatca_onboarding_settings
  set private_key_secret_id = case when p_kind = 'private_key' then v_secret_id else private_key_secret_id end,
      compliance_csid_secret_id = case when p_kind = 'compliance_csid' then v_secret_id else compliance_csid_secret_id end,
      compliance_secret_secret_id = case when p_kind = 'compliance_secret' then v_secret_id else compliance_secret_secret_id end,
      production_csid_secret_id = case when p_kind = 'production_csid' then v_secret_id else production_csid_secret_id end,
      production_secret_secret_id = case when p_kind = 'production_secret' then v_secret_id else production_secret_secret_id end,
      updated_at = now()
  where id = p_onboarding_id;

  return v_secret_id;
end;
$$;

create or replace function public.delete_zatca_secret(
  p_onboarding_id uuid,
  p_kind text
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  if p_kind not in (
    'private_key',
    'compliance_csid',
    'compliance_secret',
    'production_csid',
    'production_secret'
  ) then
    raise exception 'INVALID_ZATCA_SECRET_KIND';
  end if;

  select case p_kind
    when 'private_key' then private_key_secret_id
    when 'compliance_csid' then compliance_csid_secret_id
    when 'compliance_secret' then compliance_secret_secret_id
    when 'production_csid' then production_csid_secret_id
    when 'production_secret' then production_secret_secret_id
  end
  into v_secret_id
  from public.zatca_onboarding_settings
  where id = p_onboarding_id
  for update;

  if not found then
    raise exception 'ZATCA_ONBOARDING_NOT_FOUND';
  end if;

  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;

  update public.zatca_onboarding_settings
  set private_key_secret_id = case when p_kind = 'private_key' then null else private_key_secret_id end,
      compliance_csid_secret_id = case when p_kind = 'compliance_csid' then null else compliance_csid_secret_id end,
      compliance_secret_secret_id = case when p_kind = 'compliance_secret' then null else compliance_secret_secret_id end,
      production_csid_secret_id = case when p_kind = 'production_csid' then null else production_csid_secret_id end,
      production_secret_secret_id = case when p_kind = 'production_secret' then null else production_secret_secret_id end,
      updated_at = now()
  where id = p_onboarding_id;
end;
$$;

create or replace function public.get_zatca_credentials(p_onboarding_id uuid)
returns table (
  private_key_pem text,
  compliance_csid text,
  compliance_secret text,
  production_csid text,
  production_secret text
)
language sql
security definer
stable
set search_path = public, vault
as $$
  select private_key.decrypted_secret,
         compliance_csid_value.decrypted_secret,
         compliance_secret_value.decrypted_secret,
         production_csid_value.decrypted_secret,
         production_secret_value.decrypted_secret
  from public.zatca_onboarding_settings settings
  left join vault.decrypted_secrets private_key
    on private_key.id = settings.private_key_secret_id
  left join vault.decrypted_secrets compliance_csid_value
    on compliance_csid_value.id = settings.compliance_csid_secret_id
  left join vault.decrypted_secrets compliance_secret_value
    on compliance_secret_value.id = settings.compliance_secret_secret_id
  left join vault.decrypted_secrets production_csid_value
    on production_csid_value.id = settings.production_csid_secret_id
  left join vault.decrypted_secrets production_secret_value
    on production_secret_value.id = settings.production_secret_secret_id
  where settings.id = p_onboarding_id;
$$;

create or replace function public.cleanup_zatca_vault_secrets()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if old.private_key_secret_id is not null then
    delete from vault.secrets where id = old.private_key_secret_id;
  end if;
  if old.compliance_csid_secret_id is not null then
    delete from vault.secrets where id = old.compliance_csid_secret_id;
  end if;
  if old.compliance_secret_secret_id is not null then
    delete from vault.secrets where id = old.compliance_secret_secret_id;
  end if;
  if old.production_csid_secret_id is not null then
    delete from vault.secrets where id = old.production_csid_secret_id;
  end if;
  if old.production_secret_secret_id is not null then
    delete from vault.secrets where id = old.production_secret_secret_id;
  end if;
  return old;
end;
$$;

drop trigger if exists cleanup_zatca_vault_secrets_trigger
  on public.zatca_onboarding_settings;
create trigger cleanup_zatca_vault_secrets_trigger
before delete on public.zatca_onboarding_settings
for each row execute function public.cleanup_zatca_vault_secrets();

create or replace function public.store_zatca_compliance_credentials(
  p_onboarding_id uuid,
  p_request_id text,
  p_csid text,
  p_secret text,
  p_csid_masked text,
  p_issued_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  perform public.store_zatca_secret(p_onboarding_id, 'compliance_csid', p_csid);
  perform public.store_zatca_secret(p_onboarding_id, 'compliance_secret', p_secret);

  update public.zatca_onboarding_settings
  set status = 'compliance_ready',
      compliance_request_id = p_request_id,
      compliance_csid = null,
      compliance_secret = null,
      compliance_csid_masked = p_csid_masked,
      compliance_issued_at = p_issued_at,
      last_error = null,
      updated_at = p_issued_at
  where id = p_onboarding_id;
  if not found then raise exception 'ZATCA_ONBOARDING_NOT_FOUND'; end if;
end;
$$;

create or replace function public.store_zatca_production_credentials(
  p_onboarding_id uuid,
  p_request_id text,
  p_csid text,
  p_secret text,
  p_csid_masked text,
  p_issued_at timestamptz,
  p_certificate_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  perform public.store_zatca_secret(p_onboarding_id, 'production_csid', p_csid);
  perform public.store_zatca_secret(p_onboarding_id, 'production_secret', p_secret);

  update public.zatca_onboarding_settings
  set production_request_id = p_request_id,
      production_csid = null,
      production_secret = null,
      production_csid_masked = p_csid_masked,
      production_issued_at = p_issued_at,
      production_status = 'issued',
      production_enabled = false,
      certificate_expires_at = p_certificate_expires_at,
      certificate_revoked_at = null,
      last_error = null,
      updated_at = p_issued_at
  where id = p_onboarding_id;
  if not found then raise exception 'ZATCA_ONBOARDING_NOT_FOUND'; end if;
end;
$$;

create or replace function public.finalize_zatca_accepted_submission(
  p_onboarding_id uuid,
  p_reservation_token uuid,
  p_invoice_hash text,
  p_log_id uuid,
  p_status text,
  p_http_status integer,
  p_request_uuid text,
  p_icv bigint,
  p_previous_pih text,
  p_request_payload jsonb,
  p_response jsonb,
  p_response_text text,
  p_invoice_table text,
  p_record_id uuid,
  p_qr_code_data text,
  p_cryptographic_stamp text,
  p_invoice_xml text,
  p_submitted_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('cleared', 'reported') then
    raise exception 'INVALID_ZATCA_ACCEPTED_STATUS';
  end if;
  if p_invoice_table not in ('sales_invoices', 'invoice_adjustment_notes') then
    raise exception 'INVALID_ZATCA_INVOICE_TABLE';
  end if;

  update public.zatca_device_sequences
  set next_icv = next_icv + 1,
      last_pih = p_invoice_hash,
      reservation_token = null,
      reservation_expires_at = null,
      updated_at = now()
  where onboarding_id = p_onboarding_id
    and reservation_token = p_reservation_token;
  if not found then raise exception 'INVALID_ZATCA_SEQUENCE_RESERVATION'; end if;

  update public.zatca_invoice_submission_logs
  set status = p_status,
      http_status = p_http_status,
      request_uuid = p_request_uuid,
      invoice_hash = p_invoice_hash,
      icv = p_icv,
      previous_pih = p_previous_pih,
      request_payload = p_request_payload,
      response = p_response,
      response_text = p_response_text,
      retry_after = null,
      last_error = null,
      updated_at = now()
  where id = p_log_id;
  if not found then raise exception 'ZATCA_SUBMISSION_LOG_NOT_FOUND'; end if;

  execute format(
    'update public.%I set uuid = $1, icv = $2, pih = $3, qr_code_data = $4, cryptographic_stamp = $5, invoice_xml = $6, zatca_status = $7, zatca_response = $8, zatca_submitted_at = $9, zatca_approved_at = $10, zatca_reported_at = $11 where id = $12',
    p_invoice_table
  ) using
    p_request_uuid,
    p_icv::text,
    p_previous_pih,
    p_qr_code_data,
    p_cryptographic_stamp,
    p_invoice_xml,
    p_status,
    p_response,
    p_submitted_at,
    case when p_status = 'cleared' then p_submitted_at else null end,
    case when p_status = 'reported' then p_submitted_at else null end,
    p_record_id;
  if not found then raise exception 'ZATCA_INVOICE_RECORD_NOT_FOUND'; end if;
end;
$$;

do $$
declare
  v_row record;
begin
  for v_row in
    select id, private_key_pem, compliance_csid, compliance_secret,
           production_csid, production_secret
    from public.zatca_onboarding_settings
  loop
    if nullif(v_row.private_key_pem, '') is not null then
      perform public.store_zatca_secret(v_row.id, 'private_key', v_row.private_key_pem);
    end if;
    if nullif(v_row.compliance_csid, '') is not null then
      perform public.store_zatca_secret(v_row.id, 'compliance_csid', v_row.compliance_csid);
    end if;
    if nullif(v_row.compliance_secret, '') is not null then
      perform public.store_zatca_secret(v_row.id, 'compliance_secret', v_row.compliance_secret);
    end if;
    if nullif(v_row.production_csid, '') is not null then
      perform public.store_zatca_secret(v_row.id, 'production_csid', v_row.production_csid);
    end if;
    if nullif(v_row.production_secret, '') is not null then
      perform public.store_zatca_secret(v_row.id, 'production_secret', v_row.production_secret);
    end if;
  end loop;
end $$;

update public.zatca_onboarding_settings
set private_key_pem = null,
    compliance_csid = null,
    compliance_secret = null,
    production_csid = null,
    production_secret = null;

revoke all on function public.store_zatca_secret(uuid, text, text) from public, anon, authenticated;
revoke all on function public.delete_zatca_secret(uuid, text) from public, anon, authenticated;
revoke all on function public.get_zatca_credentials(uuid) from public, anon, authenticated;
revoke all on function public.cleanup_zatca_vault_secrets() from public, anon, authenticated;
revoke all on function public.store_zatca_compliance_credentials(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.store_zatca_production_credentials(uuid, text, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.finalize_zatca_accepted_submission(uuid, uuid, text, uuid, text, integer, text, bigint, text, jsonb, jsonb, text, text, uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.store_zatca_secret(uuid, text, text) to service_role;
grant execute on function public.delete_zatca_secret(uuid, text) to service_role;
grant execute on function public.get_zatca_credentials(uuid) to service_role;
grant execute on function public.store_zatca_compliance_credentials(uuid, text, text, text, text, timestamptz) to service_role;
grant execute on function public.store_zatca_production_credentials(uuid, text, text, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.finalize_zatca_accepted_submission(uuid, uuid, text, uuid, text, integer, text, bigint, text, jsonb, jsonb, text, text, uuid, text, text, text, timestamptz) to service_role;

revoke all on vault.secrets from public, anon, authenticated;
revoke all on vault.decrypted_secrets from public, anon, authenticated;

comment on function public.get_zatca_credentials(uuid) is
  'Returns decrypted ZATCA credentials to service_role only. Never expose its result to clients or logs.';
comment on column public.zatca_onboarding_settings.private_key_secret_id is
  'Reference to the encrypted private key in Supabase Vault; server-only.';
