# إعداد الموظف زين لل اختبار

## بيانات الموظف:
```
اسم الموظف: زين أحمد الحربي
رقم الموظف: EMP-001
البريد الإلكتروني: zain@company.com
كلمة المرور: 12345
الدور: employee (موظف عادي)
الإدارة: الإدارة العليا
```

## الخطوات:

### 1. أضف الموظف في قاعدة البيانات (Supabase)

اذهب إلى: **Supabase Console → SQL Editor**

انسخ والصق الكود التالي:

```sql
-- تحديث بيانات الموظف زين أو إضافته
INSERT INTO employees (
  id,
  emp_id, 
  name, 
  email, 
  department, 
  status, 
  role,
  permissions
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'EMP-001',
  'زين أحمد الحربي',
  'zain@company.com',
  'الإدارة العليا',
  'نشط',
  'employee',
  '{"view_attendance": true, "view_payroll": true, "request_leave": true}'
)
ON CONFLICT (emp_id) DO UPDATE SET
  email = 'zain@company.com',
  name = 'زين أحمد الحربي',
  department = 'الإدارة العليا',
  status = 'نشط',
  role = 'employee',
  permissions = '{"view_attendance": true, "view_payroll": true, "request_leave": true}';

-- التحقق من البيانات
SELECT emp_id, name, email, status FROM employees WHERE emp_id = 'EMP-001';
```

اضغط **Run** ✅

---

### 2. إنشاء حساب في Supabase Auth

اذهب إلى: **Supabase Console → Authentication → Users**

اضغط **Add User** وملأ:
- **Email**: `zain@company.com`
- **Password**: `12345`
- اترك الخيارات الأخرى كما هي

اضغط **Create User** ✅

---

### 3. اختبر الدخول

اذهب إلى: `/login`

ادخل البيانات:
```
البريد الإلكتروني: zain@company.com
كلمة المرور: 12345
```

اضغط **دخول** ✅

---

## ملاحظات:

- الموظف الآن مسجل وجاهز للدخول
- سيرى لوحة تحكم الموظف مع البيانات المسموحة
- يمكن تغيير كلمة المرور لاحقاً

