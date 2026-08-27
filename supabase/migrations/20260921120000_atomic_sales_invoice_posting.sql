-- Prevent a sales invoice from remaining partially saved when accounting posting fails.
-- This migration does not modify or invoke ZATCA XML, UBL, signing, QR, ICV, PIH,
-- clearance, reporting, onboarding, credentials, sequences or submission flows.

create or replace function public.post_new_sales_invoice_accounting()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.post_sales_invoice_accounting(new.id::text);
  return new;
end;
$$;
