# دليل إصلاح الأخطاء

## الخطأ: "Failed to fetch"

### السبب:
- جدول غير موجود في قاعدة البيانات
- مشكلة في الاتصال بـ Supabase
- خطأ CORS

### الحل:

#### 1. تحقق من الجداول الموجودة:
```sql
-- في Supabase SQL Editor
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

#### 2. إنشاء الجداول الناقصة:
اتبع التعليمات في `docs/DATABASE_SETUP.md`

#### 3. تحقق من متغيرات البيئة:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### 4. تحديث الكود:
- يتم التعامل مع الأخطاء تلقائياً في `client/lib/supabaseErrorHandler.ts`

---

## الخطأ: "relation does not exist"

### السبب:
الجدول المطلوب غير موجود

### الحل:
```sql
-- تحقق من اسم الجدول
SELECT tablename FROM pg_tables 
WHERE tablename = 'employees';

-- إذا لم يظهر، أنشئه:
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  ...
);
```

---

## الخطأ: "permission denied"

### السبب:
Row Level Security (RLS) مفعل ولا توجد سياسة وصول

### الحل:
```sql
-- تعطيل RLS مؤقتاً للاختبار
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- أو أضف سياسة وصول
CREATE POLICY "enable_all" 
  ON employees FOR ALL 
  USING (true) 
  WITH CHECK (true);
```

---

## صفحة الأدوار تظهر خطأ

### المشكلة:
الصفحة `/hr/permissions/roles` تظهر رسالة خطأ

### الحل:

1. **تحقق من جدول user_roles:**
```sql
SELECT COUNT(*) FROM user_roles;
```

2. **إذا كان الجدول فارغاً، أضف بيانات تجريبية:**
```sql
INSERT INTO user_roles (name_ar, name_en, status)
VALUES ('مدير الموارد البشرية', 'HR Manager', 'فعال');
```

3. **أعد تحميل الصفحة:**
- F5 أو Ctrl+Shift+R

---

## صفحة لوحة التحكم تظهر أرقام صفرية

### السبب:
الجداول موجودة لكن بدون بيانات

### الحل:

1. **أضف موظفين تجريبيين:**
```sql
INSERT INTO employees (emp_id, name, status, department)
VALUES ('EMP-001', 'أحمد محمد', 'نشط', 'الموارد البشرية');
```

2. **أضف سجلات حضور:**
```sql
INSERT INTO attendance (emp_id, date, status)
VALUES ('EMP-001', CURRENT_DATE, 'حاضر');
```

---

## تسجيل الدخول لا يعمل

### المشكلة:
خطأ "بيانات الدخول غير صحيحة"

### الحل:

1. **تحقق من أن الموظف مسجل:**
```sql
SELECT * FROM employees WHERE email = 'ahmed@company.com';
```

2. **تأكد من أن حساب Auth موجود:**
   - اذهب إلى Supabase → Authentication → Users
   - تحقق من البريد الإلكتروني

3. **أعد إنشاء الحساب:**
   - احذف من Authentication
   - استخدم صفحة `/admin/register-employee` لإنشاء حساب جديد

---

## البيانات المالية لا تظهر

### المشكلة:
صفحة الراتب فارغة

### الحل:

1. **أضف بيانات رواتب:**
```sql
INSERT INTO payroll (emp_id, emp_name, year, month, base_salary, net_salary)
VALUES ('EMP-001', 'أحمد محمد', 2026, 7, 5000, 5000);
```

2. **تحقق من السنة والشهر:**
```sql
SELECT DISTINCT year, month FROM payroll ORDER BY year DESC, month DESC;
```

---

## قائمة التحقق السريعة:

- [ ] هل متغيرات البيئة صحيحة؟
- [ ] هل جميع الجداول موجودة؟
- [ ] هل قاعدة البيانات تحتوي على بيانات؟
- [ ] هل RLS مفعل؟ (إذا نعم، هل السياسات صحيحة؟)
- [ ] هل Supabase متوفرة؟ (اختبر ping)

---

## إعادة تعيين البيانات

إذا أردت البدء من الصفر:

```sql
-- تحذير: سيحذف جميع البيانات!
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS payroll CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- ثم أعد تشغيل أوامر CREATE TABLE من DATABASE_SETUP.md
```

---

## الحصول على المساعدة:

1. تحقق من console الأخطاء (F12 → Console)
2. اقرأ رسالة الخطأ بحذر
3. ابحث عن اسم الجدول في الخطأ
4. تأكد من أن الجدول موجود
5. إذا استمرت المشكلة، أنشئ ticket

