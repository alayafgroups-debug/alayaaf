-- One attendance record per employee per calendar day.
-- Keep the most recently updated row when historical duplicates exist.

with ranked_attendance as (
  select
    id,
    row_number() over (
      partition by emp_id, date
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as duplicate_rank
  from public.attendance
)
delete from public.attendance
where id in (
  select id
  from ranked_attendance
  where duplicate_rank > 1
);

create unique index if not exists attendance_emp_date_uidx
  on public.attendance(emp_id, date);
