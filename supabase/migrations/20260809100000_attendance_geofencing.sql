-- Geofenced employee attendance with a company default and per-employee overrides.

create table if not exists public.hr_work_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text not null default '',
  address text not null default '',
  city text not null default '',
  status text not null default 'فعال',
  created_at timestamptz not null default now()
);

alter table public.hr_work_locations
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists attendance_radius_m integer not null default 10,
  add column if not exists is_company_default boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists hr_work_locations_one_company_default_uidx
  on public.hr_work_locations(is_company_default)
  where is_company_default = true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hr_work_locations_latitude_check') then
    alter table public.hr_work_locations add constraint hr_work_locations_latitude_check
      check (latitude is null or latitude between -90 and 90);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hr_work_locations_longitude_check') then
    alter table public.hr_work_locations add constraint hr_work_locations_longitude_check
      check (longitude is null or longitude between -180 and 180);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hr_work_locations_coordinate_pair_check') then
    alter table public.hr_work_locations add constraint hr_work_locations_coordinate_pair_check
      check ((latitude is null) = (longitude is null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hr_work_locations_radius_check') then
    alter table public.hr_work_locations add constraint hr_work_locations_radius_check
      check (attendance_radius_m = 10);
  end if;
end
$$;

alter table public.employees
  add column if not exists attendance_location_id uuid
    references public.hr_work_locations(id) on delete set null;

create index if not exists employees_attendance_location_idx
  on public.employees(attendance_location_id);

alter table public.attendance
  add column if not exists attendance_location_id uuid
    references public.hr_work_locations(id) on delete set null,
  add column if not exists check_in_latitude numeric(10,7),
  add column if not exists check_in_longitude numeric(10,7),
  add column if not exists check_in_accuracy_m numeric(10,2),
  add column if not exists check_in_distance_m numeric(10,2),
  add column if not exists check_out_latitude numeric(10,7),
  add column if not exists check_out_longitude numeric(10,7),
  add column if not exists check_out_accuracy_m numeric(10,2),
  add column if not exists check_out_distance_m numeric(10,2),
  add column if not exists location_verified boolean not null default false,
  add column if not exists entry_source text,
  add column if not exists prepared_by text;

create table if not exists public.attendance_location_assignment_audit (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  previous_location_id uuid references public.hr_work_locations(id) on delete set null,
  new_location_id uuid references public.hr_work_locations(id) on delete set null,
  assigned_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.attendance_distance_meters(
  p_latitude_1 double precision,
  p_longitude_1 double precision,
  p_latitude_2 double precision,
  p_longitude_2 double precision
) returns double precision
language sql
immutable
strict
set search_path = public
as $$
  select 6371000 * 2 * asin(
    least(1, sqrt(
      power(sin(radians(p_latitude_2 - p_latitude_1) / 2), 2) +
      cos(radians(p_latitude_1)) * cos(radians(p_latitude_2)) *
      power(sin(radians(p_longitude_2 - p_longitude_1) / 2), 2)
    ))
  );
$$;

create or replace function public.get_employee_attendance_location()
returns table (
  location_id uuid,
  location_name text,
  latitude double precision,
  longitude double precision,
  radius_m integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_location_id uuid;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  select attendance_location_id
  into v_employee_location_id
  from public.employees
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;

  if not found then
    raise exception 'لم يتم العثور على ملف الموظف';
  end if;

  return query
  select
    location.id,
    location.name,
    location.latitude::double precision,
    location.longitude::double precision,
    location.attendance_radius_m
  from public.hr_work_locations location
  where location.status = 'فعال'
    and location.latitude is not null
    and location.longitude is not null
    and (
      location.id = v_employee_location_id
      or location.is_company_default = true
    )
  order by
    case when location.id = v_employee_location_id then 0 else 1 end,
    location.is_company_default desc
  limit 1;
end;
$$;

create or replace function public.check_employee_attendance_location(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location record;
  v_distance double precision;
  v_allowed boolean;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180 then
    raise exception 'إحداثيات الموقع غير صحيحة';
  end if;
  if p_accuracy_m is null or p_accuracy_m <= 0 then
    raise exception 'دقة الموقع غير صحيحة';
  end if;

  select * into v_location
  from public.get_employee_attendance_location()
  limit 1;
  if not found then raise exception 'لم يتم إعداد موقع حضور صالح لهذا الموظف'; end if;

  v_distance := public.attendance_distance_meters(
    p_latitude, p_longitude, v_location.latitude, v_location.longitude
  );
  v_allowed := v_distance is not null
    and p_accuracy_m <= v_location.radius_m
    and (v_distance + p_accuracy_m) <= v_location.radius_m;

  return jsonb_build_object(
    'allowed', v_allowed,
    'distanceMeters', round(v_distance::numeric, 1),
    'accuracyMeters', round(p_accuracy_m::numeric, 1),
    'radiusMeters', v_location.radius_m,
    'locationName', v_location.location_name
  );
end;
$$;

create or replace function public.record_employee_attendance(
  p_mode text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
  v_location record;
  v_attendance_id uuid;
  v_check_in time;
  v_check_out time;
  v_distance double precision;
  v_date date := timezone('Asia/Riyadh', now())::date;
  v_time time := timezone('Asia/Riyadh', now())::time;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if p_mode not in ('in', 'out') then raise exception 'نوع عملية الحضور غير صحيح'; end if;
  if p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180 then
    raise exception 'إحداثيات الموقع غير صحيحة';
  end if;
  if p_accuracy_m is null or p_accuracy_m <= 0 then
    raise exception 'دقة الموقع غير صحيحة';
  end if;

  select * into v_employee
  from public.employees
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
  if not found then raise exception 'لم يتم العثور على ملف الموظف'; end if;

  select * into v_location
  from public.get_employee_attendance_location()
  limit 1;
  if not found then raise exception 'لم يتم إعداد موقع حضور صالح لهذا الموظف'; end if;

  v_distance := public.attendance_distance_meters(
    p_latitude, p_longitude, v_location.latitude, v_location.longitude
  );
  if v_distance is null
    or p_accuracy_m > v_location.radius_m
    or (v_distance + p_accuracy_m) > v_location.radius_m then
    raise exception 'أنت خارج نطاق موقع الحضور المسموح أو دقة GPS غير كافية. المسافة % متر والدقة % متر',
      round(v_distance::numeric, 1), round(p_accuracy_m::numeric, 1);
  end if;

  perform set_config('app.attendance_geofence_verified', 'true', true);

  select id, check_in, check_out into v_attendance_id, v_check_in, v_check_out
  from public.attendance
  where emp_id = v_employee.emp_id and date = v_date
  for update;

  if p_mode = 'in' then
    if v_attendance_id is null then
      insert into public.attendance (
        emp_id, emp_name, department, date, status, check_in,
        attendance_location_id, check_in_latitude, check_in_longitude,
        check_in_accuracy_m, check_in_distance_m, location_verified, entry_source,
        updated_at
      ) values (
        v_employee.emp_id, v_employee.name, v_employee.department, v_date, 'حاضر', v_time,
        v_location.location_id, p_latitude, p_longitude,
        p_accuracy_m, v_distance, true, 'employee_geolocation', now()
      ) returning id into v_attendance_id;
    else
      if v_check_in is not null then raise exception 'تم تسجيل حضورك مسبقاً لهذا اليوم'; end if;
      update public.attendance set
        check_in = v_time,
        status = 'حاضر',
        emp_name = v_employee.name,
        department = v_employee.department,
        attendance_location_id = v_location.location_id,
        check_in_latitude = p_latitude,
        check_in_longitude = p_longitude,
        check_in_accuracy_m = p_accuracy_m,
        check_in_distance_m = v_distance,
        location_verified = true,
        entry_source = 'employee_geolocation',
        updated_at = now()
      where id = v_attendance_id;
    end if;
  else
    if v_attendance_id is null or v_check_in is null then
      raise exception 'يجب تسجيل الحضور أولاً قبل تسجيل الانصراف';
    end if;
    if v_check_out is not null then
      raise exception 'تم تسجيل انصرافك مسبقاً لهذا اليوم';
    end if;
    update public.attendance set
      check_out = v_time,
      attendance_location_id = v_location.location_id,
      check_out_latitude = p_latitude,
      check_out_longitude = p_longitude,
      check_out_accuracy_m = p_accuracy_m,
      check_out_distance_m = v_distance,
      location_verified = true,
      updated_at = now()
    where id = v_attendance_id;
  end if;

  return jsonb_build_object(
    'attendanceId', v_attendance_id,
    'date', v_date,
    'time', to_char(v_time, 'HH24:MI:SS'),
    'distanceMeters', round(v_distance::numeric, 1),
    'locationName', v_location.location_name
  );
end;
$$;

create or replace function public.manage_attendance_locations_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees employee
    left join public.user_roles role
      on role.name_ar = employee.employee_role and role.status = 'فعال'
    where lower(employee.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (
        employee.employee_role in ('مدير النظام', 'مدير عام', 'المدير العام')
        or coalesce(role.permissions ->> 'hr.attendance.location.manage', '') in ('true', 'manage')
        or coalesce(employee.permissions ->> 'hr.attendance.location.manage', '') in ('true', 'manage')
      )
  );
$$;

create or replace function public.manage_attendance_records_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'service_role' or exists (
    select 1
    from public.employees employee
    left join public.user_roles role
      on role.name_ar = employee.employee_role and role.status = 'فعال'
    where lower(employee.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (
        employee.employee_role in ('مدير النظام', 'مدير عام', 'المدير العام')
        or coalesce(role.permissions ->> 'hr.attendance', '') in ('true', 'manage')
        or coalesce(role.permissions ->> 'hr.attendance.individual-group', '') in ('true', 'manage')
        or coalesce(employee.permissions ->> 'hr.attendance', '') in ('true', 'manage')
      )
  );
$$;

create or replace function public.enforce_employee_attendance_geofence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role'
    or public.manage_attendance_records_allowed()
    or current_setting('app.attendance_geofence_verified', true) = 'true' then
    return new;
  end if;
  raise exception 'يجب تسجيل حضور الموظف من بوابة الموظف وبعد التحقق من موقعه';
end;
$$;

drop trigger if exists enforce_employee_attendance_geofence on public.attendance;
create trigger enforce_employee_attendance_geofence
before insert or update on public.attendance
for each row execute function public.enforce_employee_attendance_geofence();

create or replace function public.set_company_attendance_location(
  p_name text,
  p_address text,
  p_latitude double precision,
  p_longitude double precision
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location_id uuid;
begin
  if not public.manage_attendance_locations_allowed() then
    raise exception 'ليس لديك صلاحية إدارة موقع الحضور';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'اسم الموقع مطلوب'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'إحداثيات الموقع غير صحيحة';
  end if;

  select id into v_location_id
  from public.hr_work_locations
  where is_company_default = true
  limit 1;

  if v_location_id is null then
    insert into public.hr_work_locations (
      name, name_en, address, city, status, latitude, longitude,
      attendance_radius_m, is_company_default, updated_at
    ) values (
      trim(p_name), 'Main attendance location', coalesce(p_address, ''), '', 'فعال',
      p_latitude, p_longitude, 10, true, now()
    ) returning id into v_location_id;
  else
    update public.hr_work_locations set
      name = trim(p_name),
      address = coalesce(p_address, ''),
      status = 'فعال',
      latitude = p_latitude,
      longitude = p_longitude,
      attendance_radius_m = 10,
      updated_at = now()
    where id = v_location_id;
  end if;

  return v_location_id;
end;
$$;

create or replace function public.assign_employee_attendance_location(
  p_employee_ids uuid[],
  p_location_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee record;
  v_count integer := 0;
begin
  if not public.manage_attendance_locations_allowed() then
    raise exception 'ليس لديك صلاحية إدارة موقع الحضور';
  end if;
  if coalesce(array_length(p_employee_ids, 1), 0) = 0 then
    raise exception 'اختر موظفاً واحداً على الأقل';
  end if;
  if p_location_id is not null and not exists (
    select 1 from public.hr_work_locations
    where id = p_location_id and status = 'فعال'
      and latitude is not null and longitude is not null
  ) then
    raise exception 'موقع الحضور المحدد غير صالح';
  end if;

  for v_employee in
    select id, attendance_location_id
    from public.employees
    where id = any(p_employee_ids)
    for update
  loop
    if v_employee.attendance_location_id is distinct from p_location_id then
      insert into public.attendance_location_assignment_audit (
        employee_id, previous_location_id, new_location_id, assigned_by
      ) values (
        v_employee.id, v_employee.attendance_location_id, p_location_id, auth.uid()
      );
      update public.employees
      set attendance_location_id = p_location_id
      where id = v_employee.id;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

alter table public.attendance_location_assignment_audit enable row level security;
revoke all on public.attendance_location_assignment_audit from public, anon, authenticated;
grant all on public.attendance_location_assignment_audit to service_role;

revoke execute on function public.get_employee_attendance_location() from public, anon, authenticated;
revoke execute on function public.record_employee_attendance(text, double precision, double precision, double precision) from public, anon;
revoke execute on function public.check_employee_attendance_location(double precision, double precision, double precision) from public, anon;
revoke execute on function public.set_company_attendance_location(text, text, double precision, double precision) from public, anon;
revoke execute on function public.assign_employee_attendance_location(uuid[], uuid) from public, anon;

grant execute on function public.check_employee_attendance_location(double precision, double precision, double precision) to authenticated;
grant execute on function public.record_employee_attendance(text, double precision, double precision, double precision) to authenticated;
grant execute on function public.set_company_attendance_location(text, text, double precision, double precision) to authenticated;
grant execute on function public.assign_employee_attendance_location(uuid[], uuid) to authenticated;
