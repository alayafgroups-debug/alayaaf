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

revoke all on function public.delete_zatca_secret(uuid, text)
  from public, anon, authenticated;
revoke all on function public.cleanup_zatca_vault_secrets()
  from public, anon, authenticated;
grant execute on function public.delete_zatca_secret(uuid, text)
  to service_role;
