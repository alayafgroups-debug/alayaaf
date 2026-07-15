import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Mail, Key, User, Briefcase } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function AdminEmployeeRegistration() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    empId: "",
    name: "",
    role: "employee",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.name || !formData.empId) {
      toast.error("يجب ملء جميع الحقول");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email.toLowerCase(),
        password: formData.password,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        toast.error("خطأ في إنشاء حساب المستخدم: " + authError?.message);
        setLoading(false);
        return;
      }

      // 2. Add Employee Record
      const { error: empError } = await supabase
        .from("employees")
        .insert([
          {
            id: authData.user.id,
            email: formData.email.toLowerCase(),
            emp_id: formData.empId,
            name: formData.name,
            employee_role: formData.role,
            status: "فعال",
            permissions: {
              view_attendance: true,
              view_payroll: true,
              request_leave: true,
              view_all_employees: false,
            },
          },
        ]);

      if (empError) {
        toast.error("خطأ في إضافة بيانات الموظف");
        setLoading(false);
        return;
      }

      toast.success(`تم تسجيل ${formData.name} بنجاح`);
      setFormData({
        email: "",
        password: "",
        empId: "",
        name: "",
        role: "employee",
      });
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-6" dir="rtl">
        <div className="flex items-center gap-4">
          <div className="bg-[#004e89] text-white p-3 rounded-lg">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#004e89]">تسجيل موظف جديد</h1>
            <p className="text-sm text-gray-600">إضافة موظف جديد إلى النظام</p>
          </div>
        </div>

        <form onSubmit={handleRegister}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Mail className="h-4 w-4 inline mr-2" />
                البريد الإلكتروني
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="employee@company.com"
                className="h-11"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">سيكون هذا اسم المستخدم للدخول</p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Key className="h-4 w-4 inline mr-2" />
                كلمة المرور
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="h-11"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">يجب أن تكون 6 أحرف على الأقل</p>
            </div>

            {/* Employee ID */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Briefcase className="h-4 w-4 inline mr-2" />
                رقم الموظف
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="empId"
                value={formData.empId}
                onChange={handleChange}
                placeholder="EMP-001"
                className="h-11"
                disabled={loading}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <User className="h-4 w-4 inline mr-2" />
                اسم الموظف
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="أحمد محمد"
                className="h-11"
                disabled={loading}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                الدور الوظيفي
                <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full h-11 rounded-lg border border-gray-300 px-3 text-right focus:outline-none focus:ring-2 focus:ring-[#004e89]/20 focus:border-[#004e89]"
                disabled={loading}
              >
                <option value="employee">موظف عادي</option>
                <option value="manager">مدير قسم</option>
                <option value="hr_specialist">متخصص الموارد البشرية</option>
                <option value="hr_manager">مدير الموارد البشرية</option>
                <option value="admin">مسؤول النظام</option>
              </select>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">ملاحظة:</span> بعد التسجيل، يمكن للموظف الدخول إلى النظام باستخدام بريده الإلكتروني وكلمة المرور.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 bg-[#004e89] hover:bg-[#003865] text-white"
              >
                {loading ? "جاري التسجيل..." : "تسجيل الموظف"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11"
                disabled={loading}
                onClick={() => setFormData({
                  email: "",
                  password: "",
                  empId: "",
                  name: "",
                  role: "employee",
                })}
              >
                مسح
              </Button>
            </div>
          </div>
        </form>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">تعليمات التسجيل:</h2>
          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="font-bold text-[#004e89]">1</span>
              <span>أدخل بريد الموظف الإلكتروني (سيكون اسم دخوله)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-[#004e89]">2</span>
              <span>أدخل كلمة مرور قوية (يمكن للموظف تغييرها لاحقاً)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-[#004e89]">3</span>
              <span>أدخل رقم الموظف بالنظام</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-[#004e89]">4</span>
              <span>أدخل الاسم الكامل للموظف</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-[#004e89]">5</span>
              <span>حدد الدور الوظيفي (ستحدد الصلاحيات بناءً على الدور)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-[#004e89]">6</span>
              <span>اضغط "تسجيل الموظف"</span>
            </li>
          </ol>
        </div>
      </div>
    </Layout>
  );
}
