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

revoke all privileges on public.hr_requests from anon;
revoke all privileges on public.leave_requests from anon;
revoke truncate, references, trigger on public.hr_requests from authenticated;
revoke truncate, references, trigger on public.leave_requests from authenticated;
