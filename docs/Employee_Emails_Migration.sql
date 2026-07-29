CREATE TABLE IF NOT EXISTS public.employee_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  emp_id TEXT NOT NULL,
  emp_name TEXT NOT NULL,
  generated_email TEXT NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emp_id) REFERENCES public.employees(emp_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employee_emails_emp_id ON public.employee_emails(emp_id);
CREATE INDEX IF NOT EXISTS idx_employee_emails_generated_email ON public.employee_emails(generated_email);

ALTER TABLE public.employee_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_emails_select ON public.employee_emails
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY employee_emails_insert ON public.employee_emails
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY employee_emails_update ON public.employee_emails
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY employee_emails_delete ON public.employee_emails
  FOR DELETE USING (auth.role() = 'authenticated');
