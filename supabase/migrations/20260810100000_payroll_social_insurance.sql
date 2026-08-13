alter table public.payroll
  add column if not exists social_insurance_deduction numeric(12,2) not null default 0,
  add column if not exists social_insurance_rate numeric(7,6) not null default 0,
  add column if not exists nationality_snapshot text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payroll_social_insurance_deduction_check'
      and conrelid = 'public.payroll'::regclass
  ) then
    alter table public.payroll
      add constraint payroll_social_insurance_deduction_check
      check (social_insurance_deduction >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'payroll_social_insurance_rate_check'
      and conrelid = 'public.payroll'::regclass
  ) then
    alter table public.payroll
      add constraint payroll_social_insurance_rate_check
      check (social_insurance_rate >= 0 and social_insurance_rate <= 1);
  end if;
end
$$;
