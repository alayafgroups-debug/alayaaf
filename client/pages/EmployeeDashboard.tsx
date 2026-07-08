import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, Clock, DollarSign, FileText } from "lucide-react";
import { toast } from "sonner";

interface UserSession {
  id: string;
  email: string;
  empId: string;
  name: string;
  role: string;
  permissions: Record<string, boolean>;
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user from localStorage
    const sessionStr = localStorage.getItem("user_session");
    if (!sessionStr) {
      navigate("/login");
      return;
    }

    try {
      const session: UserSession = JSON.parse(sessionStr);
      setUser(session);
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user_session");
    toast.success("تم تسجيل الخروج بنجاح");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004e89] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#004e89]">
            مرحباً {user.name}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">الدور</p>
              <p className="font-medium text-gray-800">{user.role}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#004e89] to-[#003865] text-white rounded-xl p-8 mb-8">
          <h2 className="text-3xl font-bold mb-2">لوحة تحكم الموظف</h2>
          <p className="text-blue-100">
            مرحباً بك في نظام إدارة الموارد البشرية
          </p>
        </div>

        {/* Available Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Attendance */}
          {user.permissions["view_attendance"] !== false && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
              onClick={() => navigate("/employee/attendance")}
            >
              <div className="flex items-center justify-between mb-4">
                <Clock className="h-8 w-8 text-blue-500" />
                <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-1 rounded">متاح</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">الحضور</h3>
              <p className="text-sm text-gray-600">عرض سجل الحضور والانصراف</p>
            </div>
          )}

          {/* Payroll */}
          {user.permissions["view_payroll"] !== false && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
              onClick={() => navigate("/employee/payroll")}
            >
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="h-8 w-8 text-green-500" />
                <span className="bg-green-50 text-green-600 text-xs font-medium px-2 py-1 rounded">متاح</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">الراتب</h3>
              <p className="text-sm text-gray-600">عرض الرواتب والمستحقات</p>
            </div>
          )}

          {/* Leave Requests */}
          {user.permissions["request_leave"] !== false && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
              onClick={() => navigate("/employee/leaves")}
            >
              <div className="flex items-center justify-between mb-4">
                <FileText className="h-8 w-8 text-orange-500" />
                <span className="bg-orange-50 text-orange-600 text-xs font-medium px-2 py-1 rounded">متاح</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">الإجازات</h3>
              <p className="text-sm text-gray-600">طلب إجازة جديدة</p>
            </div>
          )}

          {/* Profile */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
            onClick={() => navigate("/employee/profile")}
          >
            <div className="flex items-center justify-between mb-4">
              <User className="h-8 w-8 text-purple-500" />
              <span className="bg-purple-50 text-purple-600 text-xs font-medium px-2 py-1 rounded">متاح</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">ملفي الشخصي</h3>
            <p className="text-sm text-gray-600">عرض بياناتي الشخصية</p>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">معلوماتك</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-r border-gray-200 pr-6">
              <p className="text-sm text-gray-600 mb-1">رقم الموظف</p>
              <p className="font-mono text-lg text-gray-900">{user.empId}</p>
            </div>
            <div className="border-r border-gray-200 pr-6">
              <p className="text-sm text-gray-600 mb-1">البريد الإلكتروني</p>
              <p className="text-lg text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">الدور الوظيفي</p>
              <p className="text-lg text-gray-900 font-medium">
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                  {user.role}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">هل تحتاج إلى مساعدة؟</h3>
          <p className="text-sm text-gray-700">
            إذا واجهت أي مشكلة، يرجى التواصل مع قسم الموارد البشرية على البريد الإلكتروني
            <span className="font-mono bg-white px-2 py-1 rounded mr-1 ml-1">hr@company.com</span>
          </p>
        </div>
      </main>
    </div>
  );
}
