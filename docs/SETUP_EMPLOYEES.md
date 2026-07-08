# دليل إعداد نظام المصادقة للموظفين

## خطوات الإعداد:

### 1. إضافة الأعمدة المطلوبة لجدول employees

يجب التأكد من أن جدول `employees` يحتوي على الأعمدة التالية:

```sql
-- في Supabase، أضف هذه الأعمدة إذا لم تكن موجودة:

ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'employee';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

### 2. إنشاء Auth Users في Supabase

كل موظف يحتاج إلى:

1. حساب في Supabase Auth (اسم مستخدم + كلمة مرور)
2. بيانات في جدول employees
3. دور محدد
4. صلاحيات محددة بناءً على الدور

### 3. مثال: إضافة موظف جديد

```
البريد الإلكتروني: employee@company.com
كلمة المرور: password123 (يجب تغييرها عند أول دخول)
رقم الموظف: EMP-001
الاسم: أحمد محمد
الدور: employee
```

### 4. إضافة موظف من خلال Supabase

1. اذهب إلى Supabase Console
2. اختر Authentication → Users
3. اضغط "Add User"
4. أدخل البريد الإلكتروني وكلمة المرور
5. اذهب إلى جدول employees وأضف السجل

### 5. الأدوار المتاحة

- **admin**: مسؤول النظام الكامل
- **hr_manager**: مدير الموارد البشرية
- **hr_specialist**: متخصص الموارد البشرية
- **manager**: مدير قسم
- **employee**: موظف عادي

### 6. نموذج JSON للصلاحيات

```json
{
  "view_attendance": true,
  "view_payroll": true,
  "request_leave": true,
  "view_employees": false,
  "edit_employee": false,
  "view_all_employees": false,
  "view_department_employees": true
}
```

## خطوات التشغيل:

1. **دخول الإدمن:**
   - اذهب إلى `/` (الصفحة الرئيسية)
   - يمكنك إنشاء الأدوار والصلاحيات من `/hr/permissions/roles`

2. **دخول الموظف:**
   - اذهب إلى `/login`
   - أدخل بريدك الإلكتروني وكلمة المرور
   - ستنتقل إلى لوحة تحكم الموظف `/employee/dashboard`

3. **الصلاحيات:**
   - يرى الموظف فقط الوحدات المسموحة حسب دوره
   - البيانات المعروضة تعتمد على الصلاحيات المخصصة

## ملاحظات أمان:

- ✅ استخدام Supabase Auth للتحقق الآمن
- ✅ تخزين الجلسة في localStorage
- ✅ التحقق من الصلاحيات على كل عملية
- ✅ تسجيل الخروج يزيل بيانات الجلسة

## اختبار النظام:

```
موظف اختبار:
البريد: test@company.com
كلمة المرور: test123
```

