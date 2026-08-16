alter table public.sales_invoices
  add column if not exists notes text;

comment on column public.sales_invoices.notes is
  'Optional customer-facing note displayed on the sales invoice and print template.';
