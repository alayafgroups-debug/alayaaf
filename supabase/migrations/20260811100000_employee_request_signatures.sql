alter table public.employees
  add column if not exists signature_data text,
  add column if not exists signature_updated_at timestamptz;

alter table public.leave_requests
  add column if not exists signature_data text,
  add column if not exists signed_at timestamptz;

alter table public.hr_requests
  add column if not exists signature_data text,
  add column if not exists signed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'employees_signature_data_check'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees add constraint employees_signature_data_check
      check (
        signature_data is null or (
          signature_data like 'data:image/png;base64,%'
          and length(signature_data) <= 300000
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'leave_requests_signature_data_check'
      and conrelid = 'public.leave_requests'::regclass
  ) then
    alter table public.leave_requests add constraint leave_requests_signature_data_check
      check (
        signature_data is null or (
          signature_data like 'data:image/png;base64,%'
          and length(signature_data) <= 300000
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'hr_requests_signature_data_check'
      and conrelid = 'public.hr_requests'::regclass
  ) then
    alter table public.hr_requests add constraint hr_requests_signature_data_check
      check (
        signature_data is null or (
          signature_data like 'data:image/png;base64,%'
          and length(signature_data) <= 300000
        )
      );
  end if;
end
$$;

create or replace function public.get_my_employee_signature()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signature text;
  v_updated_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  select signature_data, signature_updated_at
  into v_signature, v_updated_at
  from public.employees
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;

  if not found then
    raise exception 'لم يتم العثور على ملف الموظف';
  end if;

  return jsonb_build_object(
    'signatureData', v_signature,
    'updatedAt', v_updated_at
  );
end;
$$;

create or replace function public.save_my_employee_signature(p_signature_data text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if p_signature_data is null
    or p_signature_data not like 'data:image/png;base64,%'
    or length(p_signature_data) > 300000 then
    raise exception 'بيانات التوقيع غير صالحة أو يتجاوز حجمها الحد المسموح';
  end if;

  update public.employees
  set signature_data = p_signature_data,
      signature_updated_at = v_updated_at
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));

  if not found then
    raise exception 'لم يتم العثور على ملف الموظف';
  end if;

  return jsonb_build_object(
    'signatureData', p_signature_data,
    'updatedAt', v_updated_at
  );
end;
$$;

create or replace function public.verify_employee_request_signature()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp_id text;
  v_signature_data text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select emp_id, signature_data
  into v_emp_id, v_signature_data
  from public.employees
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;

  if found and new.emp_id = v_emp_id then
    if v_signature_data is null then
      raise exception 'يجب إنشاء وحفظ التوقيع الإلكتروني قبل إرسال الطلب';
    end if;
    if new.signature_data is distinct from v_signature_data then
      raise exception 'توقيع الطلب لا يطابق التوقيع المحفوظ للموظف';
    end if;
    new.signed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists verify_leave_request_signature on public.leave_requests;
create trigger verify_leave_request_signature
before insert on public.leave_requests
for each row execute function public.verify_employee_request_signature();

drop trigger if exists verify_hr_request_signature on public.hr_requests;
create trigger verify_hr_request_signature
before insert on public.hr_requests
for each row execute function public.verify_employee_request_signature();

revoke execute on function public.get_my_employee_signature() from public, anon;
revoke execute on function public.save_my_employee_signature(text) from public, anon;
grant execute on function public.get_my_employee_signature() to authenticated;
grant execute on function public.save_my_employee_signature(text) to authenticated;
