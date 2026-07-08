import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<"email" | "empid">("email");
  const [email, setEmail] = useState("");
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginMethod === "email") {
      if (!email.trim() || !password.trim()) {
        toast.error("يجب ملء جميع الحقول");
        return;
      }
    } else {
      if (!empId.trim() || !password.trim()) {
        toast.error("يجب ملء جميع الحقول");
        return;
      }
    }

    setLoading(true);
    try {
      let loginEmail = email;

      // إذا كان تسجيل دخول برقم الموظف
      if (loginMethod === "empid") {
        // للاختبار: استخدم بيانات الموظف الثابتة
        if (empId === "EMP-001" && password === "12345") {
          loginEmail = "zain@company.com";
        } else {
          // البحث عن الموظف برقمه
          const { data: empData, error: empError } = await supabase
            .from("employees")
            .select("email")
            .eq("emp_id", empId)
            .single();

          if (empError || !empData?.email) {
            loginEmail = empId + "@test.local"; // fallback
          } else {
            loginEmail = empData.email;
          }
        }
      }

      // للاختبار السريع: إذا كانت البيانات EMP-001 + 12345، استخدم بيانات ثابتة
      if (empId === "EMP-001" && password === "12345") {
        // بيانات الموظف الثابتة للاختبار
        localStorage.setItem(
          "user_session",
          JSON.stringify({
            id: "10000000-0000-0000-0000-000000000001",
            email: "zain@company.com",
            empId: "EMP-001",
            name: "زين أحمد الحربي",
            role: "employee",
            permissions: {
              view_attendance: true,
              view_payroll: true,
              request_leave: true,
            },
          })
        );

        toast.success("مرحباً زين أحمد الحربي");
        setTimeout(() => {
          navigate("/employee/dashboard");
        }, 500);
        return;
      }

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.toLowerCase(),
        password: password,
      });

      if (authError) {
        toast.error("بيانات الدخول غير صحيحة");
        setLoading(false);
        return;
      }

      // Get user role from employees table
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, emp_id, name, role, permissions")
        .eq("email", loginEmail.toLowerCase())
        .single();

      if (empError || !empData) {
        toast.error("لم يتم العثور على بيانات الموظف");
        setLoading(false);
        return;
      }

      // Store user info in localStorage
      localStorage.setItem(
        "user_session",
        JSON.stringify({
          id: authData.user.id,
          email: authData.user.email,
          empId: empData.emp_id,
          name: empData.name,
          role: empData.role || "employee",
          permissions: empData.permissions || {},
        })
      );

      toast.success(`مرحباً ${empData.name}`);

      // Redirect to employee dashboard
      setTimeout(() => {
        navigate("/employee/dashboard");
      }, 500);
    } catch (err) {
      console.error("Login error:", err);
      toast.error("حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#004e89] to-[#003865] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Lock className="h-8 w-8 text-[#004e89]" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">نظام الموارد البشرية</h1>
          <p className="text-blue-100">تسجيل الدخول للموظفين</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Login Method Tabs */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setLoginMethod("email")}
              className={`flex-1 py-2 px-3 rounded-md font-medium transition ${
                loginMethod === "email"
                  ? "bg-[#004e89] text-white"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              البريد الإلكتروني
            </button>
            <button
              onClick={() => setLoginMethod("empid")}
              className={`flex-1 py-2 px-3 rounded-md font-medium transition ${
                loginMethod === "empid"
                  ? "bg-[#004e89] text-white"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              رقم الموظف
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Login */}
            {loginMethod === "email" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="zain@company.com"
                    className="pr-10 h-11"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Employee ID Login */}
            {loginMethod === "empid" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  رقم الموظف
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    placeholder="EMP-001"
                    className="pr-10 h-11"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-10 h-11 rounded-lg border border-gray-300 text-right focus:outline-none focus:ring-2 focus:ring-[#004e89]/20 focus:border-[#004e89]"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#004e89] hover:bg-[#003865] text-white font-medium rounded-lg transition"
            >
              {loading ? "جاري الدخول..." : "دخول"}
            </Button>
          </form>

          {/* Demo Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2 font-medium">بيانات الاختبار:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p><span className="font-medium">الموظف:</span> زين أحمد الحربي</p>
              <p><span className="font-medium">رقم الموظف:</span> <span className="font-mono">EMP-001</span></p>
              <p><span className="font-medium">البريد:</span> <span className="font-mono">zain@company.com</span></p>
              <p><span className="font-medium">كلمة المرور:</span> <span className="font-mono">12345</span></p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500">
            هل أنت إدمن؟{" "}
            <a href="/admin/register-employee" className="text-[#004e89] hover:underline font-medium">
              إدارة الموظفين
            </a>
          </p>
        </div>

        {/* Company Info */}
        <div className="text-center mt-8 text-blue-100">
          <p className="text-sm">© 2026 نظام إدارة الموارد البشرية</p>
          <p className="text-xs mt-1">جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  );
}
