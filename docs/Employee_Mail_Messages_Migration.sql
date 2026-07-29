CREATE TABLE IF NOT EXISTS public.employee_mail_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  emp_id TEXT NOT NULL,
  emp_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  message_kind VARCHAR(30) NOT NULL CHECK (message_kind IN ('deduction_notice', 'employee_reply')),
  deduction_reason_id TEXT,
  schedule_id TEXT,
  parent_message_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_mail_messages_emp_id
  ON public.employee_mail_messages(emp_id);
CREATE INDEX IF NOT EXISTS idx_employee_mail_messages_to_email
  ON public.employee_mail_messages(to_email);
CREATE INDEX IF NOT EXISTS idx_employee_mail_messages_from_email
  ON public.employee_mail_messages(from_email);
CREATE INDEX IF NOT EXISTS idx_employee_mail_messages_created_at
  ON public.employee_mail_messages(created_at DESC);

ALTER TABLE public.employee_mail_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_mail_messages_select ON public.employee_mail_messages
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY employee_mail_messages_insert ON public.employee_mail_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY employee_mail_messages_update ON public.employee_mail_messages
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY employee_mail_messages_delete ON public.employee_mail_messages
  FOR DELETE USING (auth.role() = 'authenticated');
