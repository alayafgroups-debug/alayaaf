create table if not exists public.document_template_settings (
  template_key text primary key check (
    template_key in ('invoice', 'quotation', 'credit_note', 'purchase_order', 'delivery_note')
  ),
  display_name text not null,
  language_mode text not null default 'bilingual' check (
    language_mode in ('bilingual', 'ar', 'en')
  ),
  primary_color text not null default '#004e89' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text not null default '#111827' check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  show_logo boolean not null default true,
  show_qr boolean not null default true,
  show_bank_details boolean not null default true,
  margin_top integer not null default 10 check (margin_top between 0 and 40),
  margin_right integer not null default 10 check (margin_right between 0 and 40),
  margin_bottom integer not null default 10 check (margin_bottom between 0 and 40),
  margin_left integer not null default 10 check (margin_left between 0 and 40),
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.document_template_settings enable row level security;

create index if not exists document_template_settings_updated_by_idx
  on public.document_template_settings (updated_by);

revoke all privileges on public.document_template_settings from anon;
revoke truncate, references, trigger on public.document_template_settings from authenticated;
grant select, insert, update, delete on public.document_template_settings to authenticated;

drop policy if exists document_template_settings_select on public.document_template_settings;
create policy document_template_settings_select
on public.document_template_settings
for select
to authenticated
using ((select public.business_permission_allowed(array['module.settings'], false)));

drop policy if exists document_template_settings_insert on public.document_template_settings;
create policy document_template_settings_insert
on public.document_template_settings
for insert
to authenticated
with check (
  (select public.business_permission_allowed(array['module.settings'], true))
  and updated_by = (select auth.uid())
);

drop policy if exists document_template_settings_update on public.document_template_settings;
create policy document_template_settings_update
on public.document_template_settings
for update
to authenticated
using ((select public.business_permission_allowed(array['module.settings'], true)))
with check (
  (select public.business_permission_allowed(array['module.settings'], true))
  and updated_by = (select auth.uid())
);

drop policy if exists document_template_settings_delete on public.document_template_settings;
create policy document_template_settings_delete
on public.document_template_settings
for delete
to authenticated
using ((select public.business_permission_allowed(array['module.settings'], true)));
