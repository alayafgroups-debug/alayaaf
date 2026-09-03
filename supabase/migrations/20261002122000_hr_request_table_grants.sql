revoke all privileges on public.hr_requests from anon;
revoke all privileges on public.leave_requests from anon;
revoke truncate, references, trigger on public.hr_requests from authenticated;
revoke truncate, references, trigger on public.leave_requests from authenticated;
