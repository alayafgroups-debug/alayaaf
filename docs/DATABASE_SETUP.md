# إعداد قاعدة البيانات - Supabase

## الجداول المطلوبة

يجب إنشاء الجداول التالية في Supabase:

### 1. جدول الموظفين (employees)

```sql
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  nationality VARCHAR(100),
  status VARCHAR(50) DEFAULT 'نشط',
  department VARCHAR(100),
  division VARCHAR(100),
  job_title VARCHAR(100),
  branch VARCHAR(100),
  directorate VARCHAR(100),
  work_location VARCHAR(100),
  direct_manager VARCHAR(255),
  hire_date DATE,
  birth_date DATE,
  gender VARCHAR(20),
  marital_status VARCHAR(50),
  national_id VARCHAR(50),
  work_permit_number VARCHAR(50),
  kafala_number VARCHAR(50),
  address2 TEXT,
  photo_url VARCHAR(500),
  base_salary DECIMAL(12, 2) DEFAULT 0,
  total_salary DECIMAL(12, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'SAR',
  employment_type VARCHAR(50) DEFAULT 'أساسي',
  employee_category VARCHAR(100),
  work_schedule VARCHAR(100),
  work_time VARCHAR(50),
  daily_hours INTEGER DEFAULT 8,
  attendance_exempt BOOLEAN DEFAULT FALSE,
  allow_remote_upload BOOLEAN DEFAULT TRUE,
  allow_remote_attendance BOOLEAN DEFAULT TRUE,
  bank_name VARCHAR(100),
  bank_branch VARCHAR(100),
  bank_account VARCHAR(50),
  permissions JSONB DEFAULT '{}',
  role VARCHAR(100) DEFAULT 'employee',
  is_active BOOLEAN DEFAULT TRUE,
  allowances JSONB DEFAULT '[]',
  insurance_items JSONB DEFAULT '[]',
  documents JSONB DEFAULT '{}',
  username VARCHAR(100),
  account_title VARCHAR(100),
  employee_role VARCHAR(100),
  password VARCHAR(255),
  cost_center VARCHAR(100),
  notes TEXT,
  emp_id_text VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employees_status_idx ON employees(status);
CREATE INDEX IF NOT EXISTS employees_department_idx ON employees(department);
CREATE INDEX IF NOT EXISTS employees_email_idx ON employees(email);
```

### 2. جدول الحضور (attendance)

```sql
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id VARCHAR(50) NOT NULL,
  emp_name VARCHAR(255),
  department VARCHAR(100),
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status VARCHAR(50) DEFAULT 'حاضر',
  late_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);

CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance(date);
CREATE INDEX IF NOT EXISTS attendance_emp_id_idx ON attendance(emp_id);
CREATE INDEX IF NOT EXISTS attendance_status_idx ON attendance(status);
```

### 3. جدول طلبات الإجازة (leave_requests)

```sql
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id VARCHAR(50) NOT NULL,
  emp_name VARCHAR(255),
  leave_type VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'معلقة',
  reason TEXT,
  approver_id VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);

CREATE INDEX IF NOT EXISTS leave_requests_status_idx ON leave_requests(status);
CREATE INDEX IF NOT EXISTS leave_requests_emp_id_idx ON leave_requests(emp_id);
```

### 4. جدول الأدوار (user_roles)

```sql
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'فعال',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_roles_status_idx ON user_roles(status);
```

### 5. جدول الرواتب (payroll)

```sql
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id VARCHAR(50) NOT NULL,
  emp_name VARCHAR(255),
  year INTEGER,
  month INTEGER,
  base_salary DECIMAL(12, 2),
  allowances DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  net_salary DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'جديد',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);

CREATE INDEX IF NOT EXISTS payroll_emp_id_idx ON payroll(emp_id);
CREATE INDEX IF NOT EXISTS payroll_year_month_idx ON payroll(year, month);
```

### 6. جدول الفواتير (invoices - مثال)

```sql
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50),
  customer_name VARCHAR(255),
  amount DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'جديدة',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## خطوات الإنشاء:

1. اذهب إلى Supabase Console
2. اختر SQL Editor
3. انسخ الكود أعلاه
4. اختر كل جدول وشغله

## التحقق من الجداول:

```sql
-- عرض جميع الجداول
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

## تفعيل Row Level Security (RLS)

```sql
-- تفعيل RLS للجداول الحساسة
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- السماح للمسؤولين بالوصول الكامل
CREATE POLICY "admin_access" 
  ON employees FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');
```

## حل الأخطاء الشائعة:

### خطأ: "relation does not exist"
- تأكد من إنشاء الجدول أولاً
- تحقق من اسم الجدول (يجب أن يكون بالإنجليزية والأحرف الصغيرة)

### خطأ: "Failed to fetch"
- تحقق من الاتصال بـ Supabase
- تأكد من صحة SUPABASE_URL و SUPABASE_ANON_KEY في .env

### خطأ: "permission denied"
- تحقق من Row Level Security (RLS)
- أضف سياسات الوصول المناسبة

