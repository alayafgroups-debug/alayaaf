alter table public.document_template_settings
  add column if not exists fields jsonb not null default '[]'::jsonb;

alter table public.document_template_settings
  drop constraint if exists document_template_settings_fields_check;

alter table public.document_template_settings
  add constraint document_template_settings_fields_check
  check (jsonb_typeof(fields) = 'array');
