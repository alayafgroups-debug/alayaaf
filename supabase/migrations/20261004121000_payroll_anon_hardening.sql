-- Payroll is available only to authenticated users through permission-scoped RLS policies.
revoke all privileges on public.payroll from anon;
