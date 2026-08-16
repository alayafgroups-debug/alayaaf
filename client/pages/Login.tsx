import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock, Mail, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import type { UserSession } from "@/lib/authSession";

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
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password,
        });
      if (authError) {
        toast.error("بيانات الدخول غير صحيحة");
        return;
      }

      // Fetch employee profile for role + permissions
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, emp_id, name, employee_role, permissions")
        .eq("email", email.toLowerCase())
        .single();

      if (empError || !empData) {
        toast.error("لم يتم العثور على بيانات الموظف");
        await supabase.auth.signOut();
        return;
      }

      // Resolve role permissions from user_roles if available
      let resolvedPermissions: Record<string, boolean> = {};
      if (empData.employee_role) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("permissions")
          .eq("name_ar", empData.employee_role)
          .eq("status", "فعال")
          .maybeSingle();
        if (
          roleData?.permissions &&
          typeof roleData.permissions === "object" &&
          !Array.isArray(roleData.permissions)
        ) {
          resolvedPermissions = roleData.permissions as Record<string, boolean>;
        }
      }

      const session: UserSession = {
        id: authData.user.id,
        email: authData.user.email ?? email.toLowerCase(),
        empId: empData.emp_id ?? "",
        name: empData.name,
        role: empData.employee_role ?? "",
        permissions: resolvedPermissions,
        portal: "business",
      };
      localStorage.setItem("user_session", JSON.stringify(session));

      toast.success(`مرحباً ${empData.name}`);
      setTimeout(() => navigate("/"), 400);
    } catch {
      toast.error("حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f2740 70%, #020d1a 100%)",
      }}
    >
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-20 right-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-2xl shadow-2xl shadow-blue-500/30"
              style={{
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              }}
            >
              <Building2 className="h-10 w-10 text-white" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
            نظام إدارة العياف
          </h1>
          <p className="mt-2 text-blue-200/70 text-sm">
            شركة إدارة العياف للمقاولات · تسجيل دخول الإدارة
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-2xl p-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@alayaf.com"
                  className="pr-10 h-11 bg-white/[0.06] border-white/10 text-white placeholder:text-white/25 focus:border-blue-500/60 focus:ring-blue-500/20"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-10 h-11 rounded-lg border border-white/10 bg-white/[0.06] text-white placeholder:text-white/25 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/60 transition"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
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
              className="w-full h-12 text-[15px] font-bold rounded-xl transition shadow-lg shadow-blue-500/25"
              style={{
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              }}
            >
              {loading ? "جاري الدخول..." : "دخول النظام"}
            </Button>
          </form>

          {/* Demo Info */}
          <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-lg shadow-black/10">
            <p className="mb-3 text-sm font-bold text-slate-900">
              حساب المدير التجريبي
            </p>
            <div className="space-y-2 text-sm text-slate-700">
              <p className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">البريد الإلكتروني:</span>
                <span
                  className="rounded-md bg-blue-50 px-2 py-1 font-mono font-bold text-blue-800"
                  dir="ltr"
                >
                  saeed@alayaf.com
                </span>
              </p>
              <p className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">كلمة المرور:</span>
                <span
                  className="rounded-md bg-blue-50 px-2 py-1 font-mono font-bold text-blue-800"
                  dir="ltr"
                >
                  Saeed@2026
                </span>
              </p>
            </div>
          </div>

          {/* Switch to employee portal */}
          <p className="text-center text-sm text-white/40">
            هل أنت موظف؟{" "}
            <Link
              to="/employee/login"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              بوابة الموظفين
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-white/20">
          © 2026 نظام إدارة العياف · جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
