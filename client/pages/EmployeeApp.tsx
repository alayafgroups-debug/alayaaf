import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Settings,
  User,
  Clock,
  DollarSign,
  FileText,
  Plus,
  Search,
  ChevronLeft,
  MapPin,
  CheckCircle,
  AlertCircle,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";

interface UserSession {
  id: string;
  email: string;
  empId: string;
  name: string;
  role: string;
  permissions: Record<string, boolean>;
}

type AppPage = "home" | "requests" | "send-request" | "more";

const REQUEST_TYPES = [
  { id: 1, name: "صرف", icon: "📄", color: "bg-blue-100" },
  { id: 2, name: "السلف", icon: "💰", color: "bg-green-100" },
  { id: 3, name: "الإجازات", icon: "⛱️", color: "bg-purple-100" },
  { id: 4, name: "عودة", icon: "🏠", color: "bg-orange-100" },
  { id: 5, name: "نقل", icon: "➡️", color: "bg-blue-100" },
  { id: 6, name: "دورة تدريبية", icon: "📚", color: "bg-yellow-100" },
  { id: 7, name: "حيانة", icon: "⚙️", color: "bg-gray-100" },
  { id: 8, name: "شراء", icon: "💳", color: "bg-green-100" },
  { id: 9, name: "عمل إضافي", icon: "➕", color: "bg-red-100" },
  { id: 10, name: "مباشرة العمل", icon: "👔", color: "bg-blue-100" },
  { id: 11, name: "التدابل", icon: "🔄", color: "bg-purple-100" },
  { id: 12, name: "استئذان", icon: "⏰", color: "bg-orange-100" },
  { id: 13, name: "حقيبة العمل", icon: "💼", color: "bg-gray-100" },
  { id: 14, name: "مستند", icon: "📋", color: "bg-green-100" },
  { id: 15, name: "أخرى", icon: "📌", color: "bg-yellow-100" },
];

const MORE_OPTIONS = [
  { id: 1, name: "الملف الشخصي", desc: "المعلومات الشخصية، تعديل البيانات الشخصية", icon: "👤" },
  { id: 2, name: "تقييم الأداء", desc: "تقييماتي لزملائي الخزين، إرشيف التقييم", icon: "⭐" },
  { id: 3, name: "قائمة الموظفين", desc: "فعال، غير فعال، متعاون", icon: "👥" },
  { id: 4, name: "فريق العمل", desc: "إضافة فريق العمل", icon: "👨‍💼" },
  { id: 5, name: "الحضور", desc: "أيام الحضور، أيام الغياب، ساعات الحضور", icon: "📍" },
  { id: 6, name: "دوامي", desc: "أيام الحضور، ساعات الحضور", icon: "📅" },
  { id: 7, name: "تقاريري", desc: "الإجازات، السلف، الاستئذان، الساعات الإضافية", icon: "📊" },
  { id: 8, name: "التقارير", desc: "تقارير الموظفين", icon: "📈" },
  { id: 9, name: "حساب الراتب", desc: "كشف الرواتب، إرشيف الرواتب، البيانات الما...", icon: "💳" },
  { id: 10, name: "الشكاوي", desc: "إضافة شكاوي، إعدادات الشكاوي", icon: "⚠️" },
  { id: 11, name: "التعاميم", desc: "إضافة تعميم، تعديل تعميم", icon: "📢" },
  { id: 12, name: "المساعلات والإنذارات", desc: "إرشيف الإنذارات، الجزاءات", icon: "📋" },
  { id: 13, name: "عموالت الموظفين", desc: "بيعات المندوبين، بيعات المشرفين، عمو...", icon: "💰" },
  { id: 14, name: "الإعلانات", desc: "إضافة إعلان، تعديل إعلان، نشر الإعلان", icon: "📣" },
  { id: 15, name: "قسيمة الراتب", desc: "قسيمة الراتب، إجمالي البدلات، إجمالي ...", icon: "🧾" },
  { id: 16, name: "التواصل مع الإدارة", desc: "المقترحات والشكاوي", icon: "💬" },
  { id: 17, name: "الإعدادات", desc: "اللغة، الوضع الليلي", icon: "⚙️" },
  { id: 18, name: "من نحن", desc: "عن الشركة، مقرات الشركة، الفروع والوكلاء", icon: "ℹ️" },
  { id: 19, name: "سياسة الخصوصية", desc: "الأذونات", icon: "🔒" },
  { id: 20, name: "تسجيل الخروج", desc: "", icon: "🚪", logout: true },
];

export default function EmployeeApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<AppPage>("home");
  const [notificationCount, setNotificationCount] = useState(12);
  const [requestsTab, setRequestsTab] = useState<"received" | "draft" | "sent" | "attached">("received");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotification, setShowNotification] = useState(true);

  useEffect(() => {
    const sessionStr = localStorage.getItem("user_session");
    if (!sessionStr) {
      navigate("/employee/login");
      return;
    }

    try {
      const session: UserSession = JSON.parse(sessionStr);
      setUser(session);
    } catch {
      navigate("/employee/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user_session");
    toast.success("تم تسجيل الخروج بنجاح");
    navigate("/employee/login");
  };

  const handleSendRequest = (type: typeof REQUEST_TYPES[0]) => {
    toast.success(`تم تقديم طلب ${type.name}`);
    setCurrentPage("requests");
  };

  const handleMoreOption = (option: typeof MORE_OPTIONS[0]) => {
    if (option.logout) {
      handleLogout();
    } else {
      toast.info(`سيتم فتح ${option.name}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="h-6 w-6 text-gray-700 cursor-pointer" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </div>
            <Settings className="h-6 w-6 text-gray-700 cursor-pointer" />
          </div>
          <h1 className="text-center text-lg font-semibold text-gray-800">{user.name}</h1>
          <div className="text-right">
            <p className="text-xs text-gray-600">{user.role}</p>
            <User className="h-8 w-8 bg-gray-300 rounded-full p-1" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-32">
        {currentPage === "home" && (
          <div className="pb-20">
            {/* Work Hours Report */}
            <div className="bg-white m-4 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">تقرير ساعات العمل لهذا الشهر</h2>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-blue-600 font-bold text-lg">198:00:00</div>
                  <p className="text-xs text-gray-600 mt-1">الساعات الواجبة</p>
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mt-2" />
                </div>
                <div className="text-center">
                  <div className="text-blue-600 font-bold text-lg">198:00:00</div>
                  <p className="text-xs text-gray-600 mt-1">ساعات الغياب</p>
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mt-2" />
                </div>
                <div className="text-center">
                  <div className="text-blue-600 font-bold text-lg">00:00:00</div>
                  <p className="text-xs text-gray-600 mt-1">الساعات الإضافية</p>
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mt-2" />
                </div>
                <div className="text-center">
                  <div className="text-blue-600 font-bold text-lg">00:00:00</div>
                  <p className="text-xs text-gray-600 mt-1">الحضور لهذا الشهر</p>
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mt-2" />
                </div>
              </div>

              {/* Attendance Registration */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-orange-500" />
                  <span className="font-semibold text-gray-900">تم تسجيل الحضور</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center bg-white p-3 rounded">
                    <p className="text-xs text-gray-600">تسجيل الحضور</p>
                    <p className="font-mono text-sm text-gray-900">08:00:00 2026-01-29</p>
                  </div>
                  <div className="text-center bg-white p-3 rounded">
                    <p className="text-xs text-gray-600">تسجيل الانصراف</p>
                    <p className="font-mono text-sm text-gray-900">17:00 2026-01-29...</p>
                  </div>
                </div>

                {/* Attendance Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full text-gray-600">
                    تسجيل الانصراف
                  </Button>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    تسجيل الحضور
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === "requests" && (
          <div className="pb-20">
            {/* Requests Tab Navigation */}
            <div className="bg-white border-b border-gray-200">
              <div className="flex overflow-x-auto gap-0">
                {["received", "draft", "sent", "attached"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRequestsTab(tab as any)}
                    className={`flex-1 px-4 py-3 font-semibold text-sm whitespace-nowrap border-b-2 transition ${
                      requestsTab === tab
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-600"
                    }`}
                  >
                    {tab === "received" && "الواردة"}
                    {tab === "draft" && "المسودة"}
                    {tab === "sent" && "المرسلة"}
                    {tab === "attached" && "المملحقة"}
                  </button>
                ))}
              </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white p-4 m-4 rounded-lg">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <Search className="h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="بحث"
                  className="flex-1 bg-transparent outline-none text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-48 h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                <AlertCircle className="h-16 w-16 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold mb-2">لا توجد بيانات</p>
              <Button
                onClick={() => setCurrentPage("send-request")}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 ml-2" />
                إرسال طلب جديد
              </Button>
            </div>
          </div>
        )}

        {currentPage === "send-request" && (
          <div className="pb-20">
            <div className="p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-6">إرسال عوض عن موظف</h2>
              <div className="grid grid-cols-3 gap-4">
                {REQUEST_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSendRequest(type)}
                    className={`${type.color} rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:shadow-md transition`}
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <span className="text-xs font-semibold text-center text-gray-700">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentPage === "more" && (
          <div className="pb-20">
            <div className="p-4">
              {MORE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleMoreOption(option)}
                  className="w-full bg-white rounded-lg p-4 mb-3 flex items-center gap-3 hover:shadow-md transition border border-gray-200"
                >
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-gray-900 text-sm">{option.name}</p>
                    <p className="text-xs text-gray-600">{option.desc}</p>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* FAB Buttons */}
        <div className="flex items-center justify-center relative -translate-y-6">
          <div className="flex gap-8 px-4">
            <button
              onClick={() => setCurrentPage("more")}
              className="bg-blue-700 rounded-full p-4 text-white shadow-lg hover:bg-blue-800"
              title="المزيد"
            >
              <MoreHorizontal className="h-6 w-6" />
            </button>
            <button
              onClick={() => setCurrentPage("send-request")}
              className="bg-yellow-500 rounded-full p-5 text-white shadow-lg hover:bg-yellow-600"
              title="طلب جديد"
            >
              <Plus className="h-7 w-7" />
            </button>
            <button
              onClick={() => setCurrentPage("requests")}
              className="bg-blue-700 rounded-full p-4 text-white shadow-lg hover:bg-blue-800 relative"
              title="الطلبات"
            >
              <FileText className="h-6 w-6" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-around pt-2 pb-3 px-4">
          <button
            onClick={() => setCurrentPage("more")}
            className={`flex flex-col items-center gap-1 ${currentPage === "more" ? "text-blue-600" : "text-gray-600"}`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-xs">المزيد</span>
          </button>
          <button
            onClick={() => setCurrentPage("requests")}
            className={`flex flex-col items-center gap-1 ${currentPage === "requests" ? "text-blue-600" : "text-gray-600"}`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs">الطلبات</span>
          </button>
          <div className="w-1"></div>
          <button
            onClick={() => setCurrentPage("home")}
            className={`flex flex-col items-center gap-1 ${currentPage === "home" ? "text-blue-600" : "text-gray-600"}`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">الرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
}
