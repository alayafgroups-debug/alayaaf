-- Supabase may grant newly created functions to anon by default.
-- Keep chart mutations available only to authenticated users.
revoke all on function public.save_accounting_account(jsonb) from public, anon;
revoke all on function public.delete_accounting_account(text) from public, anon;
revoke all on function public.save_sales_accounting_posting_rule(text, text, text) from public, anon;
grant execute on function public.save_accounting_account(jsonb) to authenticated;
grant execute on function public.delete_accounting_account(text) to authenticated;
grant execute on function public.save_sales_accounting_posting_rule(text, text, text) to authenticated;
