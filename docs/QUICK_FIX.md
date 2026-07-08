# الإصلاح السريع - خطأ Failed to fetch

## المشكلة:
```
TypeError: Failed to fetch
```

## الحل الفوري (5 دقائق):

### الخطوة 1: أنشئ الجداول في Supabase

اذهب إلى: **Supabase Console → SQL Editor**

انسخ والصق الكود التالي:

```sql
-- إنشاء جدول الموظفين
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  nationality VARCHAR(100),
  status VARCHAR(50) DEFAULT 'نشط',
  department VARCHAR(100),
  total_salary DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء جدول الحضور
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id VARCHAR(50) NOT NULL,
  emp_name VARCHAR(255),
  date DATE,
  check_in TIME,
  check_out TIME,
  status VARCHAR(50),
  late_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء جدول الأدوار
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'فعال',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء جدول طلبات الإجازة
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id VARCHAR(50) NOT NULL,
  emp_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'معلقة',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**اضغط Run** ✅

---

### الخطوة 2: أضف بيانات تجريبية

انسخ والصق الكود التالي في نفس SQL Editor:

```sql
-- أضف موظفين
INSERT INTO employees (emp_id, name, email, nationality, status, department, total_salary)
VALUES 
  ('EMP-001', 'أحمد محمد', 'ahmed@company.com', 'المملكة العربية السعودية', 'نشط', 'الموارد البشرية', 5000),
  ('EMP-002', 'فاطمة علي', 'fatima@company.com', 'المملكة العربية السعودية', 'نشط', 'المحاسبة', 3500)
ON CONFLICT DO NOTHING;

-- أضف أدوار
INSERT INTO user_roles (name_ar, name_en, status)
VALUES 
  ('مدير الموارد البشرية', 'HR Manager', 'فعال'),
  ('موظف عادي', 'Employee', 'فعال')
ON CONFLICT DO NOTHING;
```

**اضغط Run** ✅

---

### الخطوة 3: تحديث متغيرات البيئة

تحقق من ملف `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

إذا كانت خاطئة:
1. اذهب إلى Supabase Console
2. اختر Settings → API
3. انسخ `Project URL` و `anon public key`
4. أعد تحديثها في `.env`

---

### الخطوة 4: أعد تحميل الصفحة

```
F5 أو Ctrl+Shift+R
```

---

## التحقق من النجاح:

- [ ] تحميل صفحة `/hr/permissions/roles` بدون أخطاء
- [ ] ظهور الأدوار المضافة
- [ ] عدم ظهور رسالة خطأ في console

---

## إذا لم ينجح الحل:

### 1. تحقق من الأخطاء في Console:
```
F12 → Console → هل توجد رسائل خطأ؟
```

### 2. تحقق من أسماء الجداول:
```sql
-- في SQL Editor
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public';
```

### 3. حذف وإعادة الجداول:
```sql
-- حذف الجدول
DROP TABLE IF EXISTS user_roles CASCADE;

-- إنشاء جديد
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'فعال',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## أسماء الجداول الصحيحة:

```
✅ employees
✅ attendance
✅ user_roles
✅ leave_requests
✅ payroll (اختياري)
```

---

## الخطأ الشائع:

❌ اسم خاطئ: `Users` (بحرف كبير)  
✅ اسم صحيح: `employees` (بأحرف صغيرة)

---

## المساعدة:

- اقرأ `docs/DATABASE_SETUP.md` للتفاصيل الكاملة
- اقرأ `docs/TROUBLESHOOTING.md` للمشاكل الأخرى

