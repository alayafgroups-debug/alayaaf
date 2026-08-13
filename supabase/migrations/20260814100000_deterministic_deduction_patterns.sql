update public.hr_config_items
set value = 'hr@alayaf.com'
where config_type = 'primary_email_domain'
  and value in ('alayaf.com', 'hr.alayaf.com');

create table if not exists public.deduction_patterns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  description text not null default '',
  target_net numeric(14,2) not null default 1000,
  version integer not null default 1,
  status text not null default 'فعال' check (status in ('فعال', 'غير فعال', 'مؤرشف')),
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_net >= 0),
  check (version > 0)
);

create table if not exists public.deduction_pattern_items (
  id uuid primary key default gen_random_uuid(),
  pattern_id uuid not null references public.deduction_patterns(id) on delete cascade,
  reason_code text not null,
  reason_name text not null,
  reason_description text not null default '',
  allocation_weight numeric(7,4) not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  unique (pattern_id, reason_code),
  unique (pattern_id, sort_order),
  check (allocation_weight > 0 and allocation_weight <= 100),
  check (sort_order > 0)
);

create table if not exists public.employee_deduction_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null references public.employees(id) on delete cascade,
  emp_id text not null,
  report_month varchar(7) not null check (report_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  pattern_id uuid not null references public.deduction_patterns(id),
  pattern_version integer not null,
  pattern_signature text not null,
  assignment_seed text not null,
  gross_amount numeric(14,2) not null,
  existing_deductions numeric(14,2) not null default 0,
  social_insurance_amount numeric(14,2) not null default 0,
  generated_deduction_total numeric(14,2) not null,
  displayed_deduction_total numeric(14,2) not null,
  target_net numeric(14,2) not null default 1000,
  final_net numeric(14,2) not null,
  assignment_status text not null default 'sent'
    check (assignment_status in ('draft', 'approved', 'sent', 'locked', 'cancelled')),
  source text not null default 'stored_pattern',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, report_month),
  check (gross_amount >= 0 and existing_deductions >= 0 and social_insurance_amount >= 0),
  check (generated_deduction_total >= 0 and displayed_deduction_total >= 0),
  check (abs(final_net - target_net) < 0.01)
);

create index if not exists employee_deduction_assignments_month_idx
  on public.employee_deduction_assignments(report_month, pattern_id);
create index if not exists employee_deduction_assignments_employee_idx
  on public.employee_deduction_assignments(employee_id, created_at desc);

create table if not exists public.employee_deduction_assignment_items (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.employee_deduction_assignments(id) on delete cascade,
  pattern_item_id uuid references public.deduction_pattern_items(id) on delete set null,
  reason_code text not null,
  reason_name_snapshot text not null,
  reason_description_snapshot text not null default '',
  allocation_weight numeric(7,4) not null default 0,
  amount numeric(14,2) not null,
  sort_order integer not null,
  notification_text text not null default '',
  acknowledgement_text text not null default '',
  created_at timestamptz not null default now(),
  unique (assignment_id, reason_code),
  unique (assignment_id, sort_order),
  check (amount >= 0 and sort_order >= 0)
);

create table if not exists public.employee_mail_messages (
  id uuid primary key default gen_random_uuid(),
  emp_id text not null,
  emp_name text not null,
  from_email text not null,
  to_email text not null,
  subject text not null,
  body text not null,
  message_kind varchar(30) not null check (message_kind in ('deduction_notice', 'employee_reply')),
  deduction_reason_id text,
  deduction_amount numeric(14,2),
  source varchar(30) default 'manual',
  report_month varchar(7),
  schedule_id text,
  parent_message_id uuid,
  read_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.employee_mail_messages
  add column if not exists deduction_assignment_id uuid references public.employee_deduction_assignments(id) on delete cascade,
  add column if not exists deduction_item_id uuid references public.employee_deduction_assignment_items(id) on delete cascade;

create unique index if not exists employee_mail_messages_assignment_kind_uidx
  on public.employee_mail_messages(deduction_assignment_id, deduction_item_id, message_kind)
  where deduction_assignment_id is not null and deduction_item_id is not null;

alter table public.employee_mail_messages enable row level security;
drop policy if exists employee_mail_messages_select on public.employee_mail_messages;
drop policy if exists employee_mail_messages_insert on public.employee_mail_messages;
drop policy if exists employee_mail_messages_update on public.employee_mail_messages;
drop policy if exists employee_mail_messages_delete on public.employee_mail_messages;
drop policy if exists employee_mail_messages_secure_select on public.employee_mail_messages;
drop policy if exists employee_mail_messages_secure_update on public.employee_mail_messages;

create policy employee_mail_messages_secure_select
on public.employee_mail_messages
for select to authenticated
using (
  exists (
    select 1
    from public.employee_emails credential
    where credential.auth_user_id = auth.uid()
      and credential.status = 'active'
      and credential.generated_email in (employee_mail_messages.from_email, employee_mail_messages.to_email)
  )
  or exists (
    select 1
    from public.employees employee
    left join public.user_roles role on role.name_ar = employee.employee_role and role.status = 'فعال'
    where lower(employee.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (
        employee.employee_role in ('مدير النظام', 'مدير عام', 'المدير العام')
        or coalesce(role.permissions ->> 'module.hr', '') in ('true', 'manage')
        or coalesce(role.permissions ->> 'hr.reports', '') in ('true', 'manage')
      )
  )
);

create policy employee_mail_messages_secure_update
on public.employee_mail_messages
for update to authenticated
using (
  exists (
    select 1
    from public.employee_emails credential
    where credential.auth_user_id = auth.uid()
      and credential.status = 'active'
      and credential.generated_email = employee_mail_messages.to_email
  )
)
with check (
  exists (
    select 1
    from public.employee_emails credential
    where credential.auth_user_id = auth.uid()
      and credential.status = 'active'
      and credential.generated_email = employee_mail_messages.to_email
  )
);

grant select, update on public.employee_mail_messages to authenticated;

alter table public.deduction_patterns enable row level security;
alter table public.deduction_pattern_items enable row level security;
alter table public.employee_deduction_assignments enable row level security;
alter table public.employee_deduction_assignment_items enable row level security;

drop policy if exists deduction_patterns_read on public.deduction_patterns;
create policy deduction_patterns_read on public.deduction_patterns
  for select to authenticated using (true);
drop policy if exists deduction_pattern_items_read on public.deduction_pattern_items;
create policy deduction_pattern_items_read on public.deduction_pattern_items
  for select to authenticated using (true);

grant select on public.deduction_patterns, public.deduction_pattern_items to authenticated;
revoke all on public.employee_deduction_assignments, public.employee_deduction_assignment_items from anon, authenticated;

insert into public.deduction_patterns (code, name_ar, description, priority)
values
  ('ATTENDANCE-A', 'نمط انتظام الدوام الأساسي', 'توزيع تدريبي متوازن لملاحظات الحضور والانصراف الشهرية.', 10),
  ('ATTENDANCE-B', 'نمط استكمال ساعات العمل', 'يركز على اكتمال الساعات والتسجيل الصحيح للحضور.', 20),
  ('SCHEDULE-A', 'نمط الالتزام بالجدول والمناوبات', 'توزيع تدريبي لحالات عدم الالتزام بالجدول التشغيلي.', 30),
  ('LEAVE-A', 'نمط الإجازات والأيام غير المستحقة', 'يعالج تسويات الرصيد والأيام غير المغطاة بإجازة معتمدة.', 40),
  ('FINANCE-A', 'نمط التسويات المالية', 'توزيع لتسوية مبالغ مثبتة سبق صرفها أو تحميلها على الموظف.', 50),
  ('CUSTODY-A', 'نمط العهد والأصول', 'توزيع تدريبي للتسويات المرتبطة بالعهد والأصول المسلمة.', 60),
  ('POLICY-A', 'نمط الالتزام بالسياسات', 'توزيع لمخالفات إدارية موثقة ومعتمدة وفق سياسة المنشأة.', 70),
  ('PERFORMANCE-A', 'نمط الالتزامات التشغيلية', 'توزيع تدريبي لملاحظات تنفيذ الالتزامات التشغيلية الموثقة.', 80),
  ('MIXED-A', 'نمط التسوية الشهرية المتوازن', 'مزيج متوازن بين الدوام والتسويات المالية والإدارية.', 90),
  ('MIXED-B', 'نمط التسوية الشهرية الموسع', 'مزيج بديل يضمن تنوع الأسباب وعدم تكرار مجموعة النمط.', 100)
on conflict (code) do update set
  name_ar = excluded.name_ar,
  description = excluded.description,
  priority = excluded.priority,
  updated_at = now();

with pattern_items(code, reason_code, reason_name, reason_description, weight, sort_order) as (
  values
    ('ATTENDANCE-A','late-start','التأخر عن بداية الدوام','تسوية وقت التأخير المثبت في سجل الحضور للشهر.',24,1),
    ('ATTENDANCE-A','early-leave','الانصراف قبل نهاية الدوام','تسوية فرق الوقت الناتج عن الانصراف المبكر المسجل.',21,2),
    ('ATTENDANCE-A','missing-hours','نقص ساعات العمل الشهرية','تسوية الساعات الفعلية الناقصة عن الساعات المعتمدة.',20,3),
    ('ATTENDANCE-A','unapproved-absence','غياب غير مغطى بإجازة معتمدة','تسوية أيام الغياب التي لا يقابلها طلب إجازة معتمد.',18,4),
    ('ATTENDANCE-A','missing-punch','عدم اكتمال تسجيل الحضور والانصراف','تسوية سجلات الدوام غير المكتملة بعد المراجعة.',17,5),

    ('ATTENDANCE-B','missing-punch','عدم اكتمال تسجيل الحضور والانصراف','تسوية سجلات الدوام غير المكتملة بعد المراجعة.',23,1),
    ('ATTENDANCE-B','missing-hours','نقص ساعات العمل الشهرية','تسوية الساعات الفعلية الناقصة عن الساعات المعتمدة.',22,2),
    ('ATTENDANCE-B','late-start','التأخر عن بداية الدوام','تسوية وقت التأخير المثبت في سجل الحضور للشهر.',20,3),
    ('ATTENDANCE-B','remote-unverified','دوام عن بُعد غير مكتمل التحقق','تسوية سجلات العمل عن بُعد التي لم تستوفِ متطلبات التحقق.',18,4),
    ('ATTENDANCE-B','schedule-gap','فجوة في جدول العمل المعتمد','تسوية الفترات غير المغطاة بسجل عمل أو تكليف معتمد.',17,5),

    ('SCHEDULE-A','shift-noncompliance','عدم الالتزام بجدول المناوبات','تسوية الفروقات المثبتة عن جدول المناوبات المعتمد.',24,1),
    ('SCHEDULE-A','late-start','التأخر عن بداية الدوام','تسوية وقت التأخير المثبت في سجل الحضور للشهر.',21,2),
    ('SCHEDULE-A','early-leave','الانصراف قبل نهاية الدوام','تسوية فرق الوقت الناتج عن الانصراف المبكر المسجل.',20,3),
    ('SCHEDULE-A','schedule-gap','فجوة في جدول العمل المعتمد','تسوية الفترات غير المغطاة بسجل عمل أو تكليف معتمد.',18,4),
    ('SCHEDULE-A','missing-punch','عدم اكتمال تسجيل الحضور والانصراف','تسوية سجلات الدوام غير المكتملة بعد المراجعة.',17,5),

    ('LEAVE-A','unapproved-absence','غياب غير مغطى بإجازة معتمدة','تسوية أيام الغياب التي لا يقابلها طلب إجازة معتمد.',24,1),
    ('LEAVE-A','leave-overdraft','تجاوز رصيد الإجازة المستحق','تسوية الأيام التي تجاوزت الرصيد المتاح والمعتمد.',21,2),
    ('LEAVE-A','unpaid-days','أيام غير مستحقة الأجر','تسوية الأيام المصنفة دون أجر ضمن الشهر.',20,3),
    ('LEAVE-A','return-delay','تأخر مباشرة العمل بعد الإجازة','تسوية فترة التأخر المثبتة بعد نهاية الإجازة.',18,4),
    ('LEAVE-A','missing-hours','نقص ساعات العمل الشهرية','تسوية الساعات الفعلية الناقصة عن الساعات المعتمدة.',17,5),

    ('FINANCE-A','salary-overpayment','تسوية راتب صُرف بالزيادة','استرداد جزء موثق من مبلغ راتب سبق صرفه بالزيادة.',24,1),
    ('FINANCE-A','allowance-overpayment','تسوية بدل صُرف بالزيادة','استرداد فرق بدل سبق صرفه بما يتجاوز الاستحقاق.',21,2),
    ('FINANCE-A','employee-advance','قسط سلفة موظف مستحق','تسوية القسط الشهري المثبت في سجل السلفة.',20,3),
    ('FINANCE-A','employee-loan','قسط قرض موظف مستحق','تسوية القسط الدوري المثبت في اتفاق القرض.',18,4),
    ('FINANCE-A','prior-overtime','تسوية ساعات إضافية محتسبة سابقاً','تصحيح مبلغ ساعات إضافية سبق احتسابه بما يزيد عن المعتمد.',17,5),

    ('CUSTODY-A','custody-balance','تسوية رصيد عهدة مالية','تسوية جزء موثق من عهدة مالية لم تتم تسويتها.',24,1),
    ('CUSTODY-A','asset-damage','تسوية تلف عهدة مثبت','تسوية مبلغ تلف مثبت وفق محضر العهدة.',21,2),
    ('CUSTODY-A','late-custody-return','تأخر تسليم عهدة الشركة','تسوية مرتبطة بتأخر إعادة العهدة حسب السجل المعتمد.',20,3),
    ('CUSTODY-A','missing-asset','تسوية أصل غير معاد','تسوية قيمة أصل مسجل لم تتم إعادته أو تسويته.',18,4),
    ('CUSTODY-A','custody-shortage','عجز موثق في العهدة','تسوية عجز مثبت في محضر الجرد والتسليم.',17,5),

    ('POLICY-A','approved-penalty','جزاء إداري معتمد','خصم مرتبط بقرار إداري موثق ومعتمد.',24,1),
    ('POLICY-A','asset-policy','مخالفة سياسة استخدام أصول الشركة','تسوية جزاء مثبت لمخالفة سياسة استخدام الأصول.',21,2),
    ('POLICY-A','security-policy','مخالفة إجراء أمني موثق','تسوية جزاء معتمد لمخالفة إجراء أمني معلن.',20,3),
    ('POLICY-A','procedure-noncompliance','عدم الالتزام بإجراء عمل معتمد','تسوية جزاء موثق لعدم اتباع إجراء العمل المعتمد.',18,4),
    ('POLICY-A','training-agreement','استرداد تكلفة تدريب وفق اتفاق','استرداد جزء مستحق وفق اتفاق تدريب موثق.',17,5),

    ('PERFORMANCE-A','task-delay','تأخر تسليم التزام تشغيلي موثق','تسوية مرتبطة بتأخر مثبت في التزام تشغيلي معتمد.',24,1),
    ('PERFORMANCE-A','schedule-gap','فجوة في جدول العمل المعتمد','تسوية الفترات غير المغطاة بسجل عمل أو تكليف معتمد.',21,2),
    ('PERFORMANCE-A','shift-noncompliance','عدم الالتزام بجدول المناوبات','تسوية الفروقات المثبتة عن جدول المناوبات المعتمد.',20,3),
    ('PERFORMANCE-A','missing-hours','نقص ساعات العمل الشهرية','تسوية الساعات الفعلية الناقصة عن الساعات المعتمدة.',18,4),
    ('PERFORMANCE-A','approved-penalty','جزاء إداري معتمد','خصم مرتبط بقرار إداري موثق ومعتمد.',17,5),

    ('MIXED-A','late-start','التأخر عن بداية الدوام','تسوية وقت التأخير المثبت في سجل الحضور للشهر.',24,1),
    ('MIXED-A','unapproved-absence','غياب غير مغطى بإجازة معتمدة','تسوية أيام الغياب التي لا يقابلها طلب إجازة معتمد.',21,2),
    ('MIXED-A','employee-advance','قسط سلفة موظف مستحق','تسوية القسط الشهري المثبت في سجل السلفة.',20,3),
    ('MIXED-A','allowance-overpayment','تسوية بدل صُرف بالزيادة','استرداد فرق بدل سبق صرفه بما يتجاوز الاستحقاق.',18,4),
    ('MIXED-A','approved-penalty','جزاء إداري معتمد','خصم مرتبط بقرار إداري موثق ومعتمد.',17,5),

    ('MIXED-B','missing-hours','نقص ساعات العمل الشهرية','تسوية الساعات الفعلية الناقصة عن الساعات المعتمدة.',24,1),
    ('MIXED-B','leave-overdraft','تجاوز رصيد الإجازة المستحق','تسوية الأيام التي تجاوزت الرصيد المتاح والمعتمد.',21,2),
    ('MIXED-B','custody-balance','تسوية رصيد عهدة مالية','تسوية جزء موثق من عهدة مالية لم تتم تسويتها.',20,3),
    ('MIXED-B','prior-overtime','تسوية ساعات إضافية محتسبة سابقاً','تصحيح مبلغ ساعات إضافية سبق احتسابه بما يزيد عن المعتمد.',18,4),
    ('MIXED-B','procedure-noncompliance','عدم الالتزام بإجراء عمل معتمد','تسوية جزاء موثق لعدم اتباع إجراء العمل المعتمد.',17,5)
)
insert into public.deduction_pattern_items
  (pattern_id, reason_code, reason_name, reason_description, allocation_weight, sort_order)
select pattern.id, item.reason_code, item.reason_name, item.reason_description, item.weight, item.sort_order
from pattern_items item
join public.deduction_patterns pattern on pattern.code = item.code
on conflict (pattern_id, reason_code) do update set
  reason_name = excluded.reason_name,
  reason_description = excluded.reason_description,
  allocation_weight = excluded.allocation_weight,
  sort_order = excluded.sort_order;

create or replace function public.replace_ai_deduction_messages(
  p_emp_id text,
  p_report_month text,
  p_messages jsonb,
  p_actor_name text,
  p_expected_total numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notice_total numeric;
begin
  if p_report_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Invalid report month';
  end if;

  select coalesce(sum((message ->> 'deduction_amount')::numeric), 0)
  into v_notice_total
  from jsonb_array_elements(p_messages) message
  where message ->> 'message_kind' = 'deduction_notice';

  if abs(v_notice_total - p_expected_total) > 0.01 then
    raise exception 'Deduction message total does not match assignment total';
  end if;

  delete from public.employee_mail_messages
  where emp_id = p_emp_id
    and report_month = p_report_month
    and source = 'stored_pattern';

  insert into public.employee_mail_messages (
    id, emp_id, emp_name, from_email, to_email, subject, body, message_kind,
    deduction_reason_id, deduction_amount, source, report_month, parent_message_id,
    deduction_assignment_id, deduction_item_id, created_at, updated_at
  )
  select
    (message ->> 'id')::uuid,
    message ->> 'emp_id',
    message ->> 'emp_name',
    message ->> 'from_email',
    message ->> 'to_email',
    message ->> 'subject',
    message ->> 'body',
    message ->> 'message_kind',
    message ->> 'deduction_reason_id',
    (message ->> 'deduction_amount')::numeric,
    'stored_pattern',
    message ->> 'report_month',
    nullif(message ->> 'parent_message_id', '')::uuid,
    nullif(message ->> 'deduction_assignment_id', '')::uuid,
    nullif(message ->> 'deduction_item_id', '')::uuid,
    (message ->> 'created_at')::timestamptz,
    now()
  from jsonb_array_elements(p_messages) message;
end;
$$;

revoke all on function public.replace_ai_deduction_messages(text, text, jsonb, text, numeric) from public, anon, authenticated;
grant execute on function public.replace_ai_deduction_messages(text, text, jsonb, text, numeric) to service_role;
