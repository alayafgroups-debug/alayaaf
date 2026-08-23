create or replace function public.save_hr_work_location(
  p_id uuid,
  p_name text,
  p_name_en text,
  p_address text,
  p_city text,
  p_status text,
  p_latitude double precision,
  p_longitude double precision
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_rows integer;
begin
  if not public.manage_attendance_locations_allowed() then
    raise exception 'ليس لديك صلاحية إدارة مواقع العمل';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'اسم موقع العمل مطلوب';
  end if;
  if p_status not in ('فعال', 'غير فعال') then
    raise exception 'حالة موقع العمل غير صحيحة';
  end if;
  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'يجب إدخال خط العرض وخط الطول معاً';
  end if;
  if p_latitude is not null and (
    p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
  ) then
    raise exception 'إحداثيات موقع العمل غير صحيحة';
  end if;

  if p_id is null then
    insert into public.hr_work_locations (
      name, name_en, address, city, status, latitude, longitude,
      attendance_radius_m, updated_at
    ) values (
      trim(p_name), coalesce(trim(p_name_en), ''),
      coalesce(trim(p_address), ''), coalesce(trim(p_city), ''), p_status,
      p_latitude, p_longitude, 10, now()
    ) returning id into v_id;
  else
    update public.hr_work_locations
    set name = trim(p_name),
        name_en = coalesce(trim(p_name_en), ''),
        address = coalesce(trim(p_address), ''),
        city = coalesce(trim(p_city), ''),
        status = p_status,
        latitude = p_latitude,
        longitude = p_longitude,
        attendance_radius_m = 10,
        updated_at = now()
    where id = p_id;

    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'موقع العمل غير موجود';
    end if;
    v_id := p_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.delete_hr_work_location(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  if not public.manage_attendance_locations_allowed() then
    raise exception 'ليس لديك صلاحية إدارة مواقع العمل';
  end if;
  if exists (
    select 1 from public.hr_work_locations
    where id = p_id and is_company_default = true
  ) then
    raise exception 'لا يمكن حذف موقع العمل الرئيسي';
  end if;

  delete from public.hr_work_locations where id = p_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'موقع العمل غير موجود';
  end if;
  return true;
end;
$$;

revoke all on function public.save_hr_work_location(uuid, text, text, text, text, text, double precision, double precision) from public, anon;
revoke all on function public.delete_hr_work_location(uuid) from public, anon;
grant execute on function public.save_hr_work_location(uuid, text, text, text, text, text, double precision, double precision) to authenticated;
grant execute on function public.delete_hr_work_location(uuid) to authenticated;
