alter table public.hr_requests
  add column if not exists sender_auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists recipient_auth_user_id uuid references auth.users(id) on delete set null;

alter table public.leave_requests
  add column if not exists sender_auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists recipient_auth_user_id uuid references auth.users(id) on delete set null;

create index if not exists hr_requests_sender_auth_user_idx
  on public.hr_requests (sender_auth_user_id, created_at desc);
create index if not exists hr_requests_recipient_auth_user_idx
  on public.hr_requests (recipient_auth_user_id, created_at desc);
create index if not exists leave_requests_sender_auth_user_idx
  on public.leave_requests (sender_auth_user_id, created_at desc);
create index if not exists leave_requests_recipient_auth_user_idx
  on public.leave_requests (recipient_auth_user_id, created_at desc);

create or replace function public.assign_hr_request_participants()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sender_emp_id text;
  v_manager_name text;
  v_approver_name text;
begin
  if tg_op = 'UPDATE' then
    new.sender_auth_user_id := old.sender_auth_user_id;
    new.recipient_auth_user_id := old.recipient_auth_user_id;
    return new;
  end if;

  new.sender_auth_user_id := auth.uid();
  v_sender_emp_id := coalesce(nullif(new.details ->> 'sender_emp_id', ''), new.emp_id);

  if new.request_type = 'اعتماد رواتب الموظفين'
     or new.details ->> 'workflow' = 'payroll_approval' then
    select step.item ->> 'approver'
      into v_approver_name
      from public.approval_chains chain
      cross join lateral jsonb_array_elements(chain.steps) with ordinality as step(item, position)
     where chain.status = 'فعال'
       and chain.type = 'الرواتب'
     order by chain.created_at desc nulls last,
              coalesce(nullif(step.item ->> 'order', '')::integer, step.position::integer)
     limit 1;
  else
    select employee.direct_manager
      into v_manager_name
      from public.employees employee
     where employee.emp_id = v_sender_emp_id
     limit 1;
    v_approver_name := v_manager_name;
  end if;

  if nullif(btrim(v_approver_name), '') is not null then
    select account.id
      into new.recipient_auth_user_id
      from public.employees manager
      join auth.users account on lower(account.email) = lower(manager.email)
     where lower(btrim(manager.name)) = lower(btrim(v_approver_name))
     order by manager.id
     limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.assign_leave_request_participants()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_manager_name text;
begin
  if tg_op = 'UPDATE' then
    new.sender_auth_user_id := old.sender_auth_user_id;
    new.recipient_auth_user_id := old.recipient_auth_user_id;
    return new;
  end if;

  new.sender_auth_user_id := auth.uid();

  if nullif(new.approver_id, '') is not null then
    select account.id
      into new.recipient_auth_user_id
      from public.employees manager
      join auth.users account on lower(account.email) = lower(manager.email)
     where manager.emp_id = new.approver_id
        or manager.id = new.approver_id
     order by manager.id
     limit 1;
  end if;

  if new.recipient_auth_user_id is null then
    select employee.direct_manager
      into v_manager_name
      from public.employees employee
     where employee.emp_id = new.emp_id
     limit 1;

    if nullif(btrim(v_manager_name), '') is not null then
      select account.id
        into new.recipient_auth_user_id
        from public.employees manager
        join auth.users account on lower(account.email) = lower(manager.email)
       where lower(btrim(manager.name)) = lower(btrim(v_manager_name))
       order by manager.id
       limit 1;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists assign_hr_request_participants on public.hr_requests;
create trigger assign_hr_request_participants
before insert or update on public.hr_requests
for each row execute function public.assign_hr_request_participants();

drop trigger if exists assign_leave_request_participants on public.leave_requests;
create trigger assign_leave_request_participants
before insert or update on public.leave_requests
for each row execute function public.assign_leave_request_participants();

alter table public.hr_requests disable trigger assign_hr_request_participants;
alter table public.leave_requests disable trigger assign_leave_request_participants;

update public.hr_requests request
   set sender_auth_user_id = account.id
  from auth.users account
 where request.sender_auth_user_id is null
   and account.id::text = request.details ->> 'sender_user_id';

update public.hr_requests request
   set sender_auth_user_id = account.id
  from public.employees employee
  join auth.users account on lower(account.email) = lower(employee.email)
 where request.sender_auth_user_id is null
   and employee.emp_id = request.emp_id;

with payroll_approver as (
  select account.id
    from public.approval_chains chain
    cross join lateral jsonb_array_elements(chain.steps) with ordinality as step(item, position)
    join public.employees manager
      on lower(btrim(manager.name)) = lower(btrim(step.item ->> 'approver'))
    join auth.users account on lower(account.email) = lower(manager.email)
   where chain.status = 'فعال'
     and chain.type = 'الرواتب'
   order by chain.created_at desc nulls last,
            coalesce(nullif(step.item ->> 'order', '')::integer, step.position::integer)
   limit 1
)
update public.hr_requests request
   set recipient_auth_user_id = payroll_approver.id
  from payroll_approver
 where request.recipient_auth_user_id is null
   and (request.request_type = 'اعتماد رواتب الموظفين'
        or request.details ->> 'workflow' = 'payroll_approval');

update public.hr_requests request
   set recipient_auth_user_id = account.id
  from public.employees sender
  join public.employees manager
    on lower(btrim(manager.name)) = lower(btrim(sender.direct_manager))
  join auth.users account on lower(account.email) = lower(manager.email)
 where request.recipient_auth_user_id is null
   and sender.emp_id = coalesce(nullif(request.details ->> 'sender_emp_id', ''), request.emp_id);

update public.leave_requests request
   set sender_auth_user_id = account.id
  from public.employees employee
  join auth.users account on lower(account.email) = lower(employee.email)
 where request.sender_auth_user_id is null
   and employee.emp_id = request.emp_id;

update public.leave_requests request
   set recipient_auth_user_id = account.id
  from public.employees sender
  join public.employees manager
    on lower(btrim(manager.name)) = lower(btrim(sender.direct_manager))
  join auth.users account on lower(account.email) = lower(manager.email)
 where request.recipient_auth_user_id is null
   and sender.emp_id = request.emp_id;

alter table public.hr_requests enable trigger assign_hr_request_participants;
alter table public.leave_requests enable trigger assign_leave_request_participants;

drop policy if exists authenticated_all on public.hr_requests;
drop policy if exists authenticated_all on public.leave_requests;

drop policy if exists hr_requests_participant_select on public.hr_requests;
create policy hr_requests_participant_select
on public.hr_requests
for select
to authenticated
using (
  (select auth.uid()) = sender_auth_user_id
  or (select auth.uid()) = recipient_auth_user_id
);

drop policy if exists hr_requests_sender_insert on public.hr_requests;
create policy hr_requests_sender_insert
on public.hr_requests
for insert
to authenticated
with check ((select auth.uid()) = sender_auth_user_id);

drop policy if exists hr_requests_recipient_update on public.hr_requests;
create policy hr_requests_recipient_update
on public.hr_requests
for update
to authenticated
using ((select auth.uid()) = recipient_auth_user_id)
with check ((select auth.uid()) = recipient_auth_user_id);

drop policy if exists hr_requests_sender_delete on public.hr_requests;
create policy hr_requests_sender_delete
on public.hr_requests
for delete
to authenticated
using ((select auth.uid()) = sender_auth_user_id);

drop policy if exists leave_requests_participant_select on public.leave_requests;
create policy leave_requests_participant_select
on public.leave_requests
for select
to authenticated
using (
  (select auth.uid()) = sender_auth_user_id
  or (select auth.uid()) = recipient_auth_user_id
);

drop policy if exists leave_requests_sender_insert on public.leave_requests;
create policy leave_requests_sender_insert
on public.leave_requests
for insert
to authenticated
with check ((select auth.uid()) = sender_auth_user_id);

drop policy if exists leave_requests_recipient_update on public.leave_requests;
create policy leave_requests_recipient_update
on public.leave_requests
for update
to authenticated
using ((select auth.uid()) = recipient_auth_user_id)
with check ((select auth.uid()) = recipient_auth_user_id);

drop policy if exists leave_requests_sender_delete on public.leave_requests;
create policy leave_requests_sender_delete
on public.leave_requests
for delete
to authenticated
using ((select auth.uid()) = sender_auth_user_id);

revoke execute on function public.assign_hr_request_participants() from public, anon, authenticated;
revoke execute on function public.assign_leave_request_participants() from public, anon, authenticated;
