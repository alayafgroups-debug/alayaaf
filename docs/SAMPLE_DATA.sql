-- بيانات تجريبية للاختبار

-- 1. إضافة موظفين تجريبيين
INSERT INTO employees (emp_id, name, email, nationality, status, department, division, job_title, base_salary, total_salary)
VALUES 
  ('EMP-001', 'أحمد محمد', 'ahmed@company.com', 'المملكة العربية السعودية', 'نشط', 'الموارد البشرية', 'الإدارة', 'مدير الموارد البشرية', 5000, 5500),
  ('EMP-002', 'فاطمة علي', 'fatima@company.com', 'المملكة العربية السعودية', 'نشط', 'المحاسبة', 'المالية', 'محاسبة', 3500, 3800),
  ('EMP-003', 'محمود سالم', 'mahmoud@company.com', 'مصر', 'نشط', 'تقنية المعلومات', 'العمليات', 'مهندس برمجيات', 4000, 4500),
  ('EMP-004', 'ليلى إبراهيم', 'leila@company.com', 'الأردن', 'نشط', 'المبيعات', 'التسويق', 'مسؤول مبيعات', 3000, 3300),
  ('EMP-005', 'خالد يوسف', 'khaled@company.com', 'المملكة العربية السعودية', 'نشط', 'الموارد البشرية', 'الإدارة', 'متخصص الموارد البشرية', 2500, 2800)
ON CONFLICT (emp_id) DO NOTHING;

-- 2. إضافة سجلات حضور لليوم
INSERT INTO attendance (emp_id, emp_name, department, date, check_in, check_out, status, late_minutes)
VALUES 
  ('EMP-001', 'أحمد محمد', 'الموارد البشرية', CURRENT_DATE, '08:00', '16:30', 'حاضر', 0),
  ('EMP-002', 'فاطمة علي', 'المحاسبة', CURRENT_DATE, '08:15', '16:45', 'متأخر', 15),
  ('EMP-003', 'محمود سالم', 'تقنية المعلومات', CURRENT_DATE, '08:30', '17:00', 'متأخر', 30),
  ('EMP-004', 'ليلى إبراهيم', 'المبيعات', CURRENT_DATE, NULL, NULL, 'غياب', 0)
ON CONFLICT DO NOTHING;

-- 3. إضافة أدوار افتراضية
INSERT INTO user_roles (name_ar, name_en, status, permissions)
VALUES 
  ('مسؤول النظام', 'System Admin', 'فعال', '{"view_all": true, "edit_all": true, "delete_all": true}'),
  ('مدير الموارد البشرية', 'HR Manager', 'فعال', '{"view_employees": true, "edit_employees": true, "view_payroll": true}'),
  ('موظف عادي', 'Employee', 'فعال', '{"view_own_data": true, "request_leave": true}')
ON CONFLICT DO NOTHING;

-- 4. إضافة بيانات رواتب
INSERT INTO payroll (emp_id, emp_name, year, month, base_salary, allowances, deductions, net_salary, status)
VALUES 
  ('EMP-001', 'أحمد محمد', 2026, 7, 5000, 500, 500, 5000, 'معتمد'),
  ('EMP-002', 'فاطمة علي', 2026, 7, 3500, 300, 300, 3500, 'معتمد'),
  ('EMP-003', 'محمود سالم', 2026, 7, 4000, 400, 400, 4000, 'معتمد')
ON CONFLICT DO NOTHING;

-- 5. إضافة طلبات إجازة
INSERT INTO leave_requests (emp_id, emp_name, leave_type, start_date, end_date, status, reason)
VALUES 
  ('EMP-002', 'فاطمة علي', 'إجازة سنوية', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '14 days', 'معلقة', 'إجازة عائلية'),
  ('EMP-004', 'ليلى إبراهيم', 'إجازة بدون راتب', CURRENT_DATE + INTERVAL '20 days', CURRENT_DATE + INTERVAL '22 days', 'معتمدة', 'إجازة شخصية')
ON CONFLICT DO NOTHING;

-- التحقق من البيانات المدرجة
SELECT COUNT(*) as total_employees FROM employees;
SELECT COUNT(*) as today_attendance FROM attendance WHERE date = CURRENT_DATE;
SELECT COUNT(*) as pending_leaves FROM leave_requests WHERE status = 'معلقة';
SELECT COUNT(*) as active_roles FROM user_roles WHERE status = 'فعال';
