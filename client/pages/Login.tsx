import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("يجب ملء جميع الحقول");
      return;
    }

    setLoading(true);
    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
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
        .select("id, emp_id, name, role")
        .eq("email", email.toLowerCase())
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

      // Redirect based on role
      setTimeout(() => {
        navigate("/hr/employee-dashboard");
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
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
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
                  placeholder="example@company.com"
                  className="pr-10 h-11"
                  disabled={loading}
                />
              </div>
            </div>

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

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                تذكرني
              </label>
              <a href="#" className="text-sm text-[#004e89] hover:underline">
                نسيت كلمة المرور؟
              </a>
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

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">أو</span>
            </div>
          </div>

          {/* Demo Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2 font-medium">بيانات تجريبية:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p>البريد: <span className="font-mono text-gray-800">employee@company.com</span></p>
              <p>كلمة المرور: <span className="font-mono text-gray-800">password123</span></p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500">
            هل أنت إدمن؟{" "}
            <a href="/admin/login" className="text-[#004e89] hover:underline font-medium">
              دخول الإدمن
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
