# تنظيف بيانات الاختبار قبل الإنتاج

انسخ محتوى كتلة SQL التالية كاملًا إلى Supabase SQL Editor ثم شغّله مرة واحدة. يمنع السكربت التنفيذ إذا كان إنتاج ZATCA مفعّلًا أو توجد فواتير إنتاج حقيقية.

```sql
begin;

-- Safety gate: never purge after real production submission or activation.
do $$
begin
  if exists (
    select 1
    from public.zatca_onboarding_settings
    where mode = 'production' and production_enabled = true
  ) then
    raise exception 'PREPRODUCTION_PURGE_BLOCKED: ZATCA production is enabled';
  end if;

  if exists (
    select 1
    from public.zatca_invoice_submission_logs
    where mode = 'production' and status in ('cleared', 'reported')
  ) then
    raise exception 'PREPRODUCTION_PURGE_BLOCKED: real production submissions exist';
  end if;
end $$;

create temporary table preproduction_journal_ids (
  id uuid primary key
) on commit drop;

insert into preproduction_journal_ids (id)
select id
from public.accounting_journal_entries
where source_document_table in (
  'sales_invoices',
  'purchase_invoices',
  'invoice_adjustment_notes',
  'sales_quotations',
  'sales_orders',
  'purchase_orders'
)
on conflict do nothing;

do $$
begin
  if to_regclass('public.sales_invoices') is not null then
    execute 'alter table public.sales_invoices disable trigger user';
  end if;
  if to_regclass('public.purchase_invoices') is not null then
    execute 'alter table public.purchase_invoices disable trigger user';
  end if;
  if to_regclass('public.invoice_adjustment_notes') is not null then
    execute 'alter table public.invoice_adjustment_notes disable trigger user';
  end if;
end $$;

do $$
begin
  if to_regclass('public.sales_invoices') is not null then
    execute 'update public.sales_invoices set accounting_journal_entry_id = null';
  end if;
  if to_regclass('public.purchase_invoices') is not null then
    begin
      execute 'update public.purchase_invoices set accounting_journal_entry_id = null';
    exception when undefined_column then
      null;
    end;
  end if;
  if to_regclass('public.invoice_adjustment_notes') is not null then
    execute 'update public.invoice_adjustment_notes set accounting_journal_entry_id = null';
  end if;
end $$;

delete from public.accounting_journal_lines
where journal_entry_id in (select id from preproduction_journal_ids);

delete from public.accounting_journal_entries
where id in (select id from preproduction_journal_ids);

delete from public.zatca_invoice_submission_logs
where mode = 'simulation';

do $$
begin
  if to_regclass('public.invoice_adjustment_notes') is not null then
    execute 'delete from public.invoice_adjustment_notes';
  end if;
  if to_regclass('public.purchase_returns') is not null then
    execute 'delete from public.purchase_returns';
  end if;
  if to_regclass('public.goods_receipts') is not null then
    execute 'delete from public.goods_receipts';
  end if;
end $$;

do $$
begin
  if to_regclass('public.sales_invoices') is not null then
    execute 'delete from public.sales_invoices';
  end if;
  if to_regclass('public.purchase_invoices') is not null then
    execute 'delete from public.purchase_invoices';
  end if;
  if to_regclass('public.sales_orders') is not null then
    execute 'delete from public.sales_orders';
  end if;
  if to_regclass('public.purchase_orders') is not null then
    execute 'delete from public.purchase_orders';
  end if;
  if to_regclass('public.sales_quotations') is not null then
    execute 'delete from public.sales_quotations';
  end if;
end $$;

do $$
begin
  if to_regclass('public.customers') is not null then
    execute 'delete from public.customers';
  end if;
  if to_regclass('public.vendors') is not null then
    execute 'delete from public.vendors';
  end if;
end $$;

do $$
begin
  if to_regclass('public.notifications') is not null then
    execute 'delete from public.notifications';
  end if;
  if to_regclass('public.app_notifications') is not null then
    execute 'delete from public.app_notifications';
  end if;
end $$;

update public.zatca_device_sequences sequence
set next_icv = 1,
    last_pih = 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==',
    reservation_token = null,
    reservation_expires_at = null,
    blocked_at = null,
    blocked_reason = null,
    updated_at = now()
from public.zatca_onboarding_settings settings
where settings.id = sequence.onboarding_id
  and settings.mode = 'simulation';

do $$
begin
  if to_regclass('public.sales_invoices') is not null then
    execute 'alter table public.sales_invoices enable trigger user';
  end if;
  if to_regclass('public.purchase_invoices') is not null then
    execute 'alter table public.purchase_invoices enable trigger user';
  end if;
  if to_regclass('public.invoice_adjustment_notes') is not null then
    execute 'alter table public.invoice_adjustment_notes enable trigger user';
  end if;
end $$;

commit;

select 'customers' as dataset, count(*) as remaining from public.customers
union all select 'vendors', count(*) from public.vendors
union all select 'sales_quotations', count(*) from public.sales_quotations
union all select 'sales_invoices', count(*) from public.sales_invoices
union all select 'purchase_invoices', count(*) from public.purchase_invoices
union all select 'invoice_adjustment_notes', count(*) from public.invoice_adjustment_notes
union all select 'simulation_zatca_logs', count(*) from public.zatca_invoice_submission_logs where mode = 'simulation';
```
