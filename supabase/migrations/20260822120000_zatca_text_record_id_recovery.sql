-- Sales invoice identifiers are text (for example INV-000001), while adjustment
-- note identifiers may be UUIDs. Use text at the RPC boundary and compare id::text
-- so the same atomic finalizer safely supports both document tables.
-- Persist signed artifacts before the network request so an accepted submission can
-- always be reconciled locally without sending the legal document a second time.

alter table public.zatca_invoice_submission_logs
  add column if not exists signed_invoice_xml text,
  add column if not exists qr_code_data text,
  add column if not exists cryptographic_stamp text;

drop function if exists public.finalize_zatca_accepted_submission(
  uuid, uuid, text, uuid, text, integer, text, bigint, text,
  jsonb, jsonb, text, text, uuid, text, text, text, timestamptz
);

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
  p_record_id text,
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
declare
  v_updated_rows integer;
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
      blocked_at = null,
      blocked_reason = null,
      updated_at = now()
  where onboarding_id = p_onboarding_id
    and reservation_token = p_reservation_token;
  if not found then
    raise exception 'INVALID_ZATCA_SEQUENCE_RESERVATION';
  end if;

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
  if not found then
    raise exception 'ZATCA_SUBMISSION_LOG_NOT_FOUND';
  end if;

  execute format(
    'update public.%I set uuid = $1, icv = $2, pih = $3, qr_code_data = $4, cryptographic_stamp = $5, invoice_xml = $6, zatca_status = $7, zatca_response = $8, zatca_submitted_at = $9, zatca_approved_at = $10, zatca_reported_at = $11 where id::text = $12',
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

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 1 then
    raise exception 'ZATCA_INVOICE_RECORD_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.finalize_zatca_accepted_submission(
  uuid, uuid, text, uuid, text, integer, text, bigint, text,
  jsonb, jsonb, text, text, text, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.finalize_zatca_accepted_submission(
  uuid, uuid, text, uuid, text, integer, text, bigint, text,
  jsonb, jsonb, text, text, text, text, text, text, timestamptz
) to service_role;

-- Recover only submissions that reached ZATCA successfully and were blocked by
-- the old UUID-only local finalizer. This must never retry the legal submission.
do $$
declare
  v_log record;
  v_status text;
  v_invoice_xml text;
  v_qr_code_data text;
  v_cryptographic_stamp text;
  v_updated_rows integer;
begin
  for v_log in
    select distinct on (onboarding_id) *
    from public.zatca_invoice_submission_logs
    where mode = 'production'
      and status = 'ambiguous'
      and http_status between 200 and 299
      and request_uuid is not null
      and invoice_hash is not null
      and icv is not null
      and last_error like 'قبلت ZATCA المستند لكن تعذر تثبيت النتيجة محليًا؛ تم إيقاف تسلسل الجهاز للمراجعة اليدوية:%'
    order by onboarding_id, created_at desc
  loop
    v_status := case
      when v_log.invoice_type = 'simplified' then 'reported'
      else 'cleared'
    end;
    v_invoice_xml := nullif(v_log.signed_invoice_xml, '');
    v_qr_code_data := nullif(v_log.qr_code_data, '');
    v_cryptographic_stamp := nullif(v_log.cryptographic_stamp, '');

    if v_invoice_xml is null
       and nullif(v_log.response->>'clearedInvoice', '') is not null then
      begin
        v_invoice_xml := convert_from(
          decode(regexp_replace(v_log.response->>'clearedInvoice', '\s', '', 'g'), 'base64'),
          'UTF8'
        );
        v_qr_code_data := substring(
          v_invoice_xml from '<cbc:EmbeddedDocumentBinaryObject[^>]*>([^<]+)</cbc:EmbeddedDocumentBinaryObject>'
        );
        v_cryptographic_stamp := substring(
          v_invoice_xml from '<ds:SignatureValue[^>]*>([^<]+)</ds:SignatureValue>'
        );
      exception when others then
        v_invoice_xml := null;
        v_qr_code_data := null;
        v_cryptographic_stamp := null;
      end;
    end if;

    execute format(
      'update public.%I set uuid = $1, icv = $2, pih = $3, qr_code_data = coalesce($4, qr_code_data), cryptographic_stamp = coalesce($5, cryptographic_stamp), invoice_xml = coalesce($6, invoice_xml), zatca_status = $7, zatca_response = $8, zatca_submitted_at = $9, zatca_approved_at = $10, zatca_reported_at = $11 where id::text = $12',
      v_log.invoice_table
    ) using
      v_log.request_uuid,
      v_log.icv::text,
      v_log.previous_pih,
      v_qr_code_data,
      v_cryptographic_stamp,
      v_invoice_xml,
      v_status,
      v_log.response,
      v_log.updated_at,
      case when v_status = 'cleared' then v_log.updated_at else null end,
      case when v_status = 'reported' then v_log.updated_at else null end,
      v_log.invoice_id;

    get diagnostics v_updated_rows = row_count;
    if v_updated_rows <> 1 then
      raise exception 'ZATCA_RECOVERY_INVOICE_NOT_FOUND: %', v_log.invoice_id;
    end if;

    update public.zatca_device_sequences
    set last_pih = case
          when next_icv <= v_log.icv then v_log.invoice_hash
          else last_pih
        end,
        next_icv = greatest(next_icv, v_log.icv + 1),
        reservation_token = null,
        reservation_expires_at = null,
        blocked_at = null,
        blocked_reason = null,
        updated_at = now()
    where onboarding_id = v_log.onboarding_id
      and blocked_at is not null
      and blocked_reason like 'قبلت ZATCA المستند لكن تعذر تثبيت النتيجة محليًا؛ تم إيقاف تسلسل الجهاز للمراجعة اليدوية:%';

    get diagnostics v_updated_rows = row_count;
    if v_updated_rows <> 1 then
      raise exception 'ZATCA_RECOVERY_SEQUENCE_NOT_BLOCKED: %', v_log.onboarding_id;
    end if;

    update public.zatca_invoice_submission_logs
    set status = v_status,
        retry_after = null,
        last_error = null,
        updated_at = now()
    where id = v_log.id;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
