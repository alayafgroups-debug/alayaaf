-- Draft, edit, post, and delete manual journals through validated RPCs.
-- No sales invoice or ZATCA XML, signing, QR, clearance, or reporting flow is modified.

create or replace function public.save_manual_journal(p_entry_id uuid, p_journal jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_entry_id, gen_random_uuid());
  v_entry public.accounting_journal_entries%rowtype;
  v_date date;
  v_description text := trim(p_journal->>'description');
  v_lines jsonb := coalesce(p_journal->'lines', '[]'::jsonb);
  v_line jsonb;
  v_account_code text;
  v_account_name text;
  v_debit numeric(14,2);
  v_credit numeric(14,2);
begin
  if not public.accounting_access_allowed(true) then raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED'; end if;
  begin v_date := (p_journal->>'date')::date; exception when others then raise exception 'MANUAL_JOURNAL_DATE_INVALID'; end;
  if v_description is null or v_description = '' then raise exception 'MANUAL_JOURNAL_DESCRIPTION_REQUIRED'; end if;
  if jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) < 2 then raise exception 'MANUAL_JOURNAL_REQUIRES_TWO_LINES'; end if;

  if p_entry_id is null then
    insert into public.accounting_journal_entries (
      id, entry_date, reference_type, source_document_table, source_document_id, description, status
    ) values (
      v_id, v_date, 'manual_journal', 'manual_journals', v_id::text, v_description, 'draft'
    );
  else
    select * into v_entry from public.accounting_journal_entries where id = p_entry_id for update;
    if not found then raise exception 'MANUAL_JOURNAL_NOT_FOUND'; end if;
    if v_entry.reference_type <> 'manual_journal' or v_entry.source_document_table <> 'manual_journals' then raise exception 'NOT_A_MANUAL_JOURNAL'; end if;
    if v_entry.status <> 'draft' then raise exception 'ONLY_DRAFT_MANUAL_JOURNAL_EDITABLE'; end if;
    update public.accounting_journal_entries set entry_date = v_date, description = v_description where id = v_id;
    delete from public.accounting_journal_lines where journal_entry_id = v_id;
  end if;

  for v_line in select value from jsonb_array_elements(v_lines)
  loop
    v_account_code := trim(v_line->>'accountCode');
    v_account_name := public.account_name_for_posting(v_account_code);
    begin
      v_debit := round(coalesce(nullif(v_line->>'debit', '')::numeric, 0), 2);
      v_credit := round(coalesce(nullif(v_line->>'credit', '')::numeric, 0), 2);
    exception when others then
      raise exception 'MANUAL_JOURNAL_LINE_AMOUNT_INVALID';
    end;
    if v_debit < 0 or v_credit < 0 or ((v_debit > 0)::integer + (v_credit > 0)::integer) <> 1 then
      raise exception 'MANUAL_JOURNAL_LINE_REQUIRES_ONE_SIDE';
    end if;
    insert into public.accounting_journal_lines (
      journal_entry_id, account_code, account_name, debit, credit, counterparty
    ) values (
      v_id, v_account_code, v_account_name, v_debit, v_credit, nullif(trim(v_line->>'counterparty'), '')
    );
  end loop;
  return v_id;
end;
$$;

create or replace function public.post_manual_journal(p_entry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.accounting_journal_entries%rowtype;
  v_count integer;
  v_debit numeric(14,2);
  v_credit numeric(14,2);
  v_line record;
begin
  if not public.accounting_access_allowed(true) then raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED'; end if;
  select * into v_entry from public.accounting_journal_entries where id = p_entry_id for update;
  if not found then raise exception 'MANUAL_JOURNAL_NOT_FOUND'; end if;
  if v_entry.reference_type <> 'manual_journal' or v_entry.source_document_table <> 'manual_journals' then raise exception 'NOT_A_MANUAL_JOURNAL'; end if;
  if v_entry.status <> 'draft' then raise exception 'ONLY_DRAFT_MANUAL_JOURNAL_POSTABLE'; end if;

  select count(*), coalesce(sum(debit), 0), coalesce(sum(credit), 0)
  into v_count, v_debit, v_credit
  from public.accounting_journal_lines where journal_entry_id = p_entry_id;
  if v_count < 2 then raise exception 'POSTED_JOURNAL_REQUIRES_TWO_LINES'; end if;
  if v_debit <= 0 or abs(v_debit - v_credit) > 0.01 then
    raise exception 'POSTED_JOURNAL_NOT_BALANCED: debit=%, credit=%', v_debit, v_credit;
  end if;
  for v_line in select account_code from public.accounting_journal_lines where journal_entry_id = p_entry_id
  loop
    perform public.account_name_for_posting(v_line.account_code);
  end loop;

  update public.accounting_journal_entries set status = 'posted' where id = p_entry_id;
  return p_entry_id;
end;
$$;

create or replace function public.delete_manual_journal(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.accounting_journal_entries%rowtype;
begin
  if not public.accounting_access_allowed(true) then raise exception 'ACCOUNTING_MANAGE_PERMISSION_REQUIRED'; end if;
  select * into v_entry from public.accounting_journal_entries where id = p_entry_id for update;
  if not found then raise exception 'MANUAL_JOURNAL_NOT_FOUND'; end if;
  if v_entry.reference_type <> 'manual_journal' or v_entry.source_document_table <> 'manual_journals' then raise exception 'NOT_A_MANUAL_JOURNAL'; end if;
  if v_entry.status <> 'draft' then raise exception 'ONLY_DRAFT_MANUAL_JOURNAL_DELETABLE'; end if;
  delete from public.accounting_journal_lines where journal_entry_id = p_entry_id;
  delete from public.accounting_journal_entries where id = p_entry_id;
end;
$$;

revoke all on function public.save_manual_journal(uuid, jsonb) from public, anon;
revoke all on function public.post_manual_journal(uuid) from public, anon;
revoke all on function public.delete_manual_journal(uuid) from public, anon;
grant execute on function public.save_manual_journal(uuid, jsonb) to authenticated;
grant execute on function public.post_manual_journal(uuid) to authenticated;
grant execute on function public.delete_manual_journal(uuid) to authenticated;
