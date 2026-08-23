alter table public.hr_work_locations enable row level security;

drop policy if exists hr_work_locations_select_authorized_managers
  on public.hr_work_locations;

create policy hr_work_locations_select_authorized_managers
on public.hr_work_locations
for select
to authenticated
using (
  public.manage_attendance_locations_allowed()
  or public.manage_attendance_records_allowed()
);
