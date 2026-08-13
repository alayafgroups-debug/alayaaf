alter table public.employee_mail_messages
  add column if not exists deleted_by_sender_at timestamptz,
  add column if not exists deleted_by_recipient_at timestamptz;

create index if not exists employee_mail_messages_sender_visible_idx
  on public.employee_mail_messages(from_email, created_at desc)
  where deleted_by_sender_at is null;

create index if not exists employee_mail_messages_recipient_visible_idx
  on public.employee_mail_messages(to_email, created_at desc)
  where deleted_by_recipient_at is null;
