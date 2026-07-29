-- Create employee_emails table for managing generated company emails
CREATE TABLE IF NOT EXISTS public.employee_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  emp_id TEXT NOT NULL REFERENCES public.employees(emp_id) ON DELETE CASCADE,
  emp_name TEXT NOT NULL,
  generated_email TEXT NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast lookup by employee ID
CREATE INDEX idx_employee_emails_emp_id ON public.employee_emails(emp_id);
CREATE INDEX idx_employee_emails_generated_email ON public.employee_emails(generated_email);

-- Enable RLS on employee_emails table
ALTER TABLE public.employee_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can view only their own email records
CREATE POLICY "Users can view their own employee emails" ON public.employee_emails
  FOR SELECT USING (emp_id = (SELECT empId FROM public.employees WHERE id = auth.uid() LIMIT 1));

-- Policy: Only authenticated users can insert (for admin generating emails)
CREATE POLICY "Authenticated users can insert employee emails" ON public.employee_emails
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Admins can update
CREATE POLICY "Authenticated users can update employee emails" ON public.employee_emails
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Admins can delete
CREATE POLICY "Authenticated users can delete employee emails" ON public.employee_emails
  FOR DELETE USING (auth.role() = 'authenticated');
