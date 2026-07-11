import { useEffect, useState, useRef } from "react";
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
  Home,
  Briefcase,
  Zap,
  Filter,
  ScanFace,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import DynamicRequestForm from "@/components/hr/DynamicRequestForm";
import LeaveRequestForm from "@/components/hr/LeaveRequestForm";
import { requestFormSchemas } from "@/components/hr/formSchemas";

interface UserSession {
  id: string;
  email: string;
  empId: string;
  name: string;
  role: string;
  permissions: Record<string, boolean>;
}

interface EmployeeRequest {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  reason: string;
  adminNote: string;
}

type AppPage = "home" | "requests" | "send-request" | "more";

// Map Arabic request name → schema ID used in DynamicRequestForm / LeaveRequestForm
const REQUEST_NAME_TO_SCHEMA: Record<string, string> = {
  "صيانة": "maintenance",
  "الصرف": "disbursement",
  "السلف": "advance",
  "استئذان": "accommodation",
  "الإجازات": "leave",
  "عهدة": "custody",
  "عمل إضافي": "overtime",
  "دورة تدريبية": "training",
  "نقل": "transfer",
  "إخلاء طرف": "clearance",
  "شراء": "purchase",
  "إضافة طرف": "add_party",
  "مباشرة العمل": "return_work",
  "انتداب": "secondment",
  "استقالة": "resignation",
  "صرف امتياز مالي": "disburse_bonus",
  "إقالة موظف": "termination",
  "وظيفة شاغرة": "vacancy",
  "إضافة موظف": "add_employee",
  "تعديل راتب": "salary_adj",
  "مهمة عمل": "mission",
  "صرف عمولة": "commission",
  "صرف مستحقات إجازة": "leave_dues",
};

const REQUEST_TYPES = [
  { id: 1, name: "صيانة", icon: "🔧", color: "bg-gray-100" },
  { id: 2, name: "الصرف", icon: "💳", color: "bg-blue-100" },
  { id: 3, name: "السلف", icon: "💰", color: "bg-green-100" },
  { id: 4, name: "استئذان", icon: "🏠", color: "bg-orange-100" },
  { id: 5, name: "الإجازات", icon: "📅", color: "bg-purple-100" },
  { id: 6, name: "عهدة", icon: "📄", color: "bg-red-100" },
  { id: 7, name: "عمل إضافي", icon: "➕", color: "bg-purple-100" },
  { id: 8, name: "دورة تدريبية", icon: "💻", color: "bg-blue-100" },
  { id: 9, name: "نقل", icon: "🔄", color: "bg-blue-100" },
  { id: 10, name: "إخلاء طرف", icon: "🚪", color: "bg-orange-100" },
  { id: 11, name: "شراء", icon: "🛒", color: "bg-gray-100" },
  { id: 12, name: "إضافة طرف", icon: "👥", color: "bg-purple-100" },
  { id: 13, name: "مباشرة العمل", icon: "👨‍💼", color: "bg-purple-100" },
  { id: 14, name: "انتداب", icon: "🧑‍💼", color: "bg-purple-100" },
  { id: 15, name: "استقالة", icon: "📝", color: "bg-red-100" },
  { id: 16, name: "صرف امتياز مالي", icon: "🧾", color: "bg-green-100" },
  { id: 17, name: "إقالة موظف", icon: "🚫", color: "bg-red-100" },
  { id: 18, name: "وظيفة شاغرة", icon: "📁", color: "bg-yellow-100" },
  { id: 19, name: "إضافة موظف", icon: "🧑‍💻", color: "bg-blue-100" },
  { id: 20, name: "تعديل راتب", icon: "✏️", color: "bg-orange-100" },
  { id: 21, name: "مهمة عمل", icon: "💼", color: "bg-gray-100" },
  { id: 22, name: "صرف عمولة", icon: "📂", color: "bg-yellow-100" },
  { id: 23, name: "صرف مستحقات إجازة", icon: "📑", color: "bg-green-100" },
];

const formatRequestReason = (requestType: string, rawReason: unknown) => {
  const raw = String(rawReason ?? "").trim();
  if (!raw) return "-";

  try {
    const values = JSON.parse(raw) as Record<string, unknown>;
    if (!values || typeof values !== "object" || Array.isArray(values)) return raw;

    const schema = Object.values(requestFormSchemas).find((item) => item.title === requestType);
    const reasonKey = ["reason", "purpose", "advance_type", "type", "description", "notes"]
      .find((key) => values[key] !== "" && values[key] !== null && values[key] !== undefined);
    const valueKey = ["amount", "value", "total", "loan_amount", "requested_amount"]
      .find((key) => values[key] !== "" && values[key] !== null && values[key] !== undefined);

    const parts: string[] = [];
    if (reasonKey) {
      const field = schema?.fields.find((item) => item.name === reasonKey);
      const reasonValue = field?.options?.find((option) => option.value === String(values[reasonKey]))?.label
        ?? String(values[reasonKey]);
      parts.push(`السبب: ${reasonValue}`);
    }
    if (valueKey) parts.push(`القيمة: ${String(values[valueKey])}`);

    return parts.join(" • ") || "-";
  } catch {
    const reasonMatch = raw.match(/السبب:\s*([^|]+)/);
    return reasonMatch ? `السبب: ${reasonMatch[1].trim()}` : raw;
  }
};

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

export default function EmployeePortal() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<AppPage>("home");
  const [notificationCount, setNotificationCount] = useState(0);
  const [requestsTab, setRequestsTab] = useState<"received" | "draft" | "sent" | "attached">("received");
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeRequests, setEmployeeRequests] = useState<EmployeeRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [allowedRequests, setAllowedRequests] = useState<string[]>([]);

  // Form state for request dialogs
  const [dynamicFormOpen, setDynamicFormOpen] = useState(false);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(null);

  // Face verification camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<"in" | "out">("in");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "verifying" | "success">("idle");
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const openCamera = async (mode: "in" | "out") => {
    setCameraMode(mode);
    setVerifyStatus("idle");
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      // wait for the modal video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      toast.error("تعذّر فتح الكاميرا، يرجى السماح بالوصول للكاميرا");
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
    setVerifyStatus("idle");
  };

  const saveAttendance = async (mode: "in" | "out", time: string, date: string) => {
    if (!user) return;
    try {
      if (mode === "in") {
        await supabase.from("attendance").insert([
          {
            emp_id: user.empId,
            emp_name: user.name,
            check_in: time,
            date: date,
            status: "حاضر",
          },
        ]);
      } else {
        // update today's record with check_out
        const { data: existing } = await supabase
          .from("attendance")
          .select("id")
          .eq("emp_id", user.empId)
          .eq("date", date)
          .limit(1);
        if (existing && existing.length > 0) {
          await supabase
            .from("attendance")
            .update({ check_out: time })
            .eq("id", (existing[0] as any).id);
        } else {
          await supabase.from("attendance").insert([
            {
              emp_id: user.empId,
              emp_name: user.name,
              check_out: time,
              date: date,
              status: "حاضر",
            },
          ]);
        }
      }
    } catch {
      // Silent fail - keep local state even if DB write fails
    }
  };

  const handleVerifyFace = () => {
    setVerifyStatus("verifying");
    // Simulate face scan
    setTimeout(async () => {
      const now = new Date();
      const time = now.toLocaleTimeString("en-GB", { hour12: false });
      const date = now.toISOString().slice(0, 10);

      await saveAttendance(cameraMode, time, date);

      if (cameraMode === "in") {
        setCheckInTime(`${time} ${date}`);
      } else {
        setCheckOutTime(`${time} ${date}`);
      }

      setVerifyStatus("success");
      toast.success(
        cameraMode === "in"
          ? "تم التحقق من الوجه وتسجيل الحضور بنجاح"
          : "تم التحقق من الوجه وتسجيل الانصراف بنجاح"
      );

      setTimeout(() => {
        closeCamera();
      }, 1500);
    }, 2500);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

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

  const normalizeStatus = (status?: string) => {
    const s = String(status ?? "").trim();
    if (["معلق", "معلقة", "pending"].includes(s)) return "معلق";
    if (["موافق", "معتمدة", "approved"].includes(s)) return "موافق";
    if (["مرفوض", "مرفوضة", "rejected"].includes(s)) return "مرفوض";
    return s || "معلق";
  };

  const loadEmployeeRequests = async (empId: string) => {
    setRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("emp_id", empId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: EmployeeRequest[] = (data ?? []).map((r: any) => ({
        id: String(r.id),
        type: String(r.leave_type ?? "طلب"),
        status: normalizeStatus(r.status),
        createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString("ar-SA") : "-",
        reason: formatRequestReason(String(r.leave_type ?? "طلب"), r.reason ?? r.notes),
        adminNote: String(r.admin_note ?? ""),
      }));

      setEmployeeRequests(mapped);
      setNotificationCount(mapped.filter((r) => r.status === "معلق").length);
    } catch {
      setEmployeeRequests([]);
      setNotificationCount(0);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleSendRequest = (type: typeof REQUEST_TYPES[0]) => {
    if (!user) return;
    const schemaId = REQUEST_NAME_TO_SCHEMA[type.name];
    if (!schemaId) {
      toast.info(`نموذج "${type.name}" غير متوفر حالياً`);
      return;
    }
    if (schemaId === "leave") {
      setLeaveFormOpen(true);
    } else {
      setActiveSchemaId(schemaId);
      setDynamicFormOpen(true);
    }
  };

  const handleMoreOption = (option: typeof MORE_OPTIONS[0]) => {
    if (option.logout) {
      handleLogout();
    } else {
      toast.info(`سيتم فتح ${option.name}`);
    }
  };

  // Fetch employee permissions from DB to filter request types
  useEffect(() => {
    if (!user?.empId) return;
    const fetchPermissions = async () => {
      try {
        const { data } = await supabase
          .from("employees")
          .select("permissions")
          .eq("emp_id", user.empId)
          .maybeSingle();
        if (data && Array.isArray(data.permissions) && data.permissions.length > 0) {
          setAllowedRequests(data.permissions as string[]);
        } else {
          setAllowedRequests([]); // empty = show all
        }
      } catch {
        setAllowedRequests([]);
      }
    };
    fetchPermissions();
    loadEmployeeRequests(user.empId);
  }, [user?.empId]);

  // Visible request types: filtered by permissions (if any are set)
  const visibleRequestTypes = allowedRequests.length > 0
    ? REQUEST_TYPES.filter((t) => allowedRequests.includes(t.name))
    : REQUEST_TYPES;

  useEffect(() => {
    if (!user?.empId || currentPage !== "requests") return;

    loadEmployeeRequests(user.empId);
    const timer = setInterval(() => {
      loadEmployeeRequests(user.empId);
    }, 15000);

    return () => clearInterval(timer);
  }, [currentPage, user?.empId]);

  const filteredRequests = employeeRequests.filter((r) => {
    const matchesSearch = !searchQuery || r.type.includes(searchQuery) || r.reason.includes(searchQuery);

    if (requestsTab === "draft") return matchesSearch && r.status === "معلق";
    if (requestsTab === "sent") return matchesSearch && r.status === "موافق";
    if (requestsTab === "attached") return matchesSearch && r.status === "مرفوض";
    return matchesSearch;
  });

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
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* ===== MOBILE VIEW ===== */}
      <div className="md:hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-[#004e89] to-[#0066b3] shadow-md sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-4">
            {currentPage === "home" ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Bell className="h-6 w-6 text-white cursor-pointer" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {notificationCount}
                      </span>
                    )}
                  </div>
                  <Settings className="h-6 w-6 text-white cursor-pointer" />
                </div>
                <div className="text-center">
                  <h1 className="text-base font-bold text-white">{user.name}</h1>
                  <p className="text-xs text-blue-100">{user.role}</p>
                </div>
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCurrentPage("home")}
                  className="flex items-center gap-1 text-white"
                >
                  <ChevronLeft className="h-6 w-6 rotate-180" />
                  <span className="text-sm">رجوع</span>
                </button>
                <h1 className="text-base font-bold text-white">
                  {currentPage === "requests" && "الطلبات"}
                  {currentPage === "send-request" && "طلب جديد"}
                  {currentPage === "more" && "المزيد"}
                </h1>
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Content */}
        <div className="pb-32">
          {currentPage === "home" && (
            <div className="p-4 space-y-4">
              {/* Work Hours Report */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-5 text-center">تقرير ساعات العمل لهذا الشهر</h2>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="text-blue-600 font-bold text-lg font-mono">198:00:00</div>
                    <p className="text-xs text-gray-600 mt-1">الساعات الواجبة</p>
                    <CheckCircle className="h-4 w-4 text-green-500 mx-auto mt-2" />
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <div className="text-red-500 font-bold text-lg font-mono">198:00:00</div>
                    <p className="text-xs text-gray-600 mt-1">ساعات الغياب</p>
                    <CheckCircle className="h-4 w-4 text-green-500 mx-auto mt-2" />
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 text-center">
                    <div className="text-orange-500 font-bold text-lg font-mono">00:00:00</div>
                    <p className="text-xs text-gray-600 mt-1">الساعات الإضافية</p>
                    <CheckCircle className="h-4 w-4 text-green-500 mx-auto mt-2" />
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <div className="text-green-600 font-bold text-lg font-mono">00:00:00</div>
                    <p className="text-xs text-gray-600 mt-1">الحضور لهذا الشهر</p>
                    <CheckCircle className="h-4 w-4 text-green-500 mx-auto mt-2" />
                  </div>
                </div>
              </div>

              {/* Attendance Registration */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="font-semibold text-gray-900">تم تسجيل الحضور</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center bg-green-50 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">تسجيل الحضور</p>
                    <p className="font-mono text-sm font-bold text-gray-900">
                      {checkInTime ? checkInTime.split(" ")[0] : "--:--:--"}
                    </p>
                    <p className="font-mono text-xs text-gray-500">
                      {checkInTime ? checkInTime.split(" ")[1] : "لم يسجل بعد"}
                    </p>
                  </div>
                  <div className="text-center bg-red-50 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">تسجيل الانصراف</p>
                    <p className="font-mono text-sm font-bold text-gray-900">
                      {checkOutTime ? checkOutTime.split(" ")[0] : "--:--:--"}
                    </p>
                    <p className="font-mono text-xs text-gray-500">
                      {checkOutTime ? checkOutTime.split(" ")[1] : "لم يسجل بعد"}
                    </p>
                  </div>
                </div>

                {/* Attendance Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => openCamera("out")}
                    variant="outline"
                    className="w-full text-gray-600 rounded-xl gap-2"
                  >
                    <ScanFace className="h-4 w-4" />
                    تسجيل الانصراف
                  </Button>
                  <Button
                    onClick={() => openCamera("in")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2"
                  >
                    <ScanFace className="h-4 w-4" />
                    تسجيل الحضور
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentPage === "send-request" && (
            <div className="p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-6">إرسال طلب جديد</h2>
              <div className="grid grid-cols-3 gap-4">
                {visibleRequestTypes.length === 0 ? (
                  <p className="col-span-3 text-center text-gray-400 py-10">لا توجد طلبات متاحة لك</p>
                ) : visibleRequestTypes.map((type) => (
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
          )}

          {currentPage === "requests" && (
            <div>
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

              {/* Search */}
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

              {/* Requests List */}
              <div className="px-4 pb-4 space-y-3">
                {requestsLoading ? (
                  <div className="bg-white rounded-lg p-6 text-center text-gray-500">جاري تحميل الطلبات...</div>
                ) : filteredRequests.length === 0 ? (
                  <div className="bg-white rounded-lg p-6 text-center">
                    <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">لا توجد طلبات</p>
                  </div>
                ) : (
                  filteredRequests.map((req) => (
                    <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">{req.type}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          req.status === "موافق"
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "مرفوض"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">تاريخ الإرسال: {req.createdAt}</p>
                      <p className="text-sm text-gray-600">{req.reason}</p>
                      {req.adminNote && (
                        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
                          <span className="font-semibold">رد الإدارة: </span>{req.adminNote}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {currentPage === "more" && (
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
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          {/* Centered FAB */}
          <button
            onClick={() => setCurrentPage("send-request")}
            className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-500 rounded-full p-4 text-white shadow-lg hover:bg-yellow-600 border-4 border-white"
          >
            <Plus className="h-6 w-6" />
          </button>

          <div className="flex items-center justify-between px-6 py-3">
            <button
              onClick={() => setCurrentPage("home")}
              className={`flex flex-col items-center gap-1 w-16 ${currentPage === "home" ? "text-blue-600" : "text-gray-500"}`}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs">الرئيسية</span>
            </button>
            <button
              onClick={() => setCurrentPage("requests")}
              className={`flex flex-col items-center gap-1 w-16 relative ${currentPage === "requests" ? "text-blue-600" : "text-gray-500"}`}
            >
              <div className="relative">
                <FileText className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </div>
              <span className="text-xs">الطلبات</span>
            </button>

            {/* Spacer for FAB */}
            <div className="w-16"></div>

            <button
              onClick={() => setCurrentPage("more")}
              className={`flex flex-col items-center gap-1 w-16 ${currentPage === "more" ? "text-blue-600" : "text-gray-500"}`}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs">المزيد</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 w-16 text-gray-500"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-xs">خروج</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP VIEW ===== */}
      <div className="hidden md:block">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-700 cursor-pointer" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </div>
              <Settings className="h-6 w-6 text-gray-700 cursor-pointer" />
            </div>
            <h1 className="text-2xl font-bold text-[#004e89]">مرحباً {user.name}</h1>
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

        {/* Desktop Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {currentPage !== "home" && (
            <button
              onClick={() => setCurrentPage("home")}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition"
            >
              <ChevronLeft className="h-5 w-5 rotate-180" />
              <span className="font-medium">رجوع للرئيسية</span>
            </button>
          )}
          {currentPage === "home" && (
            <>
              {/* Hero Section */}
              <div className="bg-gradient-to-r from-[#004e89] to-[#003865] text-white rounded-xl p-8 mb-8">
                <h2 className="text-3xl font-bold mb-2">لوحة تحكم الموظف</h2>
                <p className="text-blue-100">مرحباً بك في نظام إدارة الموارد البشرية</p>
              </div>

              {/* Work Hours Summary */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">الساعات الواجبة</p>
                  <p className="text-2xl font-bold text-gray-900">198:00:00</p>
                  <CheckCircle className="h-5 w-5 text-green-500 mt-2" />
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Zap className="h-8 w-8 text-orange-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">ساعات الغياب</p>
                  <p className="text-2xl font-bold text-gray-900">00:00:00</p>
                  <CheckCircle className="h-5 w-5 text-green-500 mt-2" />
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">الساعات الإضافية</p>
                  <p className="text-2xl font-bold text-gray-900">00:00:00</p>
                  <CheckCircle className="h-5 w-5 text-green-500 mt-2" />
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <MapPin className="h-8 w-8 text-purple-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">الحضور لهذا الشهر</p>
                  <p className="text-2xl font-bold text-gray-900">00:00:00</p>
                  <CheckCircle className="h-5 w-5 text-green-500 mt-2" />
                </div>
              </div>

              {/* Attendance Card */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6">تم تسجيل الحضور</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">تسجيل الحضور</p>
                    <p className="font-mono text-lg text-gray-900 font-bold">
                      {checkInTime || "لم يسجل بعد"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">تسجيل الانصراف</p>
                    <p className="font-mono text-lg text-gray-900 font-bold">
                      {checkOutTime || "لم يسجل بعد"}
                    </p>
                  </div>
                  <div className="flex gap-3 items-end">
                    <Button
                      onClick={() => openCamera("out")}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <ScanFace className="h-4 w-4" />
                      تسجيل الانصراف
                    </Button>
                    <Button
                      onClick={() => openCamera("in")}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      <ScanFace className="h-4 w-4" />
                      تسجيل الحضور
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <button
                  onClick={() => setCurrentPage("requests")}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition text-center"
                >
                  <FileText className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">الطلبات</h3>
                  <p className="text-sm text-gray-600">عرض الطلبات الواردة والمرسلة</p>
                </button>

                <button
                  onClick={() => setCurrentPage("send-request")}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition text-center"
                >
                  <Plus className="h-8 w-8 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">طلب جديد</h3>
                  <p className="text-sm text-gray-600">إرسال طلب جديد</p>
                </button>

                <button
                  onClick={() => setCurrentPage("more")}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition text-center"
                >
                  <Briefcase className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">الخدمات</h3>
                  <p className="text-sm text-gray-600">جميع الخدمات والخيارات</p>
                </button>

                <button className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition text-center">
                  <User className="h-8 w-8 text-orange-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">ملفي</h3>
                  <p className="text-sm text-gray-600">بيانات الملف الشخصي</p>
                </button>
              </div>

              {/* Employee Info */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">معلوماتك</h3>
                <div className="grid grid-cols-3 gap-6">
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
            </>
          )}

          {currentPage === "send-request" && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">إرسال طلب جديد</h2>
              <div className="grid grid-cols-5 gap-4">
                {visibleRequestTypes.length === 0 ? (
                  <p className="col-span-5 text-center text-gray-400 py-10">لا توجد طلبات متاحة لك</p>
                ) : visibleRequestTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSendRequest(type)}
                    className={`${type.color} rounded-lg p-6 flex flex-col items-center justify-center gap-3 hover:shadow-md transition h-40`}
                  >
                    <span className="text-4xl">{type.icon}</span>
                    <span className="text-sm font-semibold text-center text-gray-700">{type.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {currentPage === "requests" && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">الطلبات</h2>
              
              {/* Tabs */}
              <div className="bg-white rounded-lg shadow-sm mb-6 border-b">
                <div className="flex border-b">
                  {["received", "draft", "sent", "attached"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRequestsTab(tab as any)}
                      className={`flex-1 px-6 py-4 font-semibold border-b-2 transition ${
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

                {/* Search and Filter */}
                <div className="p-6 flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="بحث"
                      className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    تصفية
                  </Button>
                </div>
              </div>

              {/* Requests List */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                {requestsLoading ? (
                  <div className="text-center py-8 text-gray-500">جاري تحميل الطلبات...</div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold mb-6">لا توجد طلبات</p>
                    <Button
                      onClick={() => setCurrentPage("send-request")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      إرسال طلب جديد
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-[#004e89] text-white">
                        <tr>
                          <th className="py-3 px-4">نوع الطلب</th>
                          <th className="py-3 px-4">السبب</th>
                          <th className="py-3 px-4">تاريخ الإرسال</th>
                          <th className="py-3 px-4 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRequests.map((req) => (
                          <tr key={req.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{req.type}</td>
                            <td className="py-3 px-4 text-gray-600">
                              <div>{req.reason}</div>
                              {req.adminNote && (
                                <div className="mt-2 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-900">
                                  <span className="font-semibold">رد الإدارة: </span>{req.adminNote}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">{req.createdAt}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                req.status === "موافق"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : req.status === "مرفوض"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {currentPage === "more" && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">الخدمات والخيارات</h2>
              <div className="grid grid-cols-2 gap-4">
                {MORE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleMoreOption(option)}
                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition text-right border border-gray-200"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{option.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{option.name}</h3>
                        <p className="text-sm text-gray-600">{option.desc}</p>
                      </div>
                      <ChevronLeft className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* ===== FACE VERIFICATION CAMERA MODAL ===== */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">
                {cameraMode === "in" ? "التحقق لتسجيل الحضور" : "التحقق لتسجيل الانصراف"}
              </h3>
              <button
                onClick={closeCamera}
                disabled={verifyStatus === "verifying"}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Camera Preview */}
            <div className="relative bg-black aspect-square">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Face frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`w-48 h-56 rounded-[50%] border-4 transition-colors ${
                    verifyStatus === "success"
                      ? "border-green-500"
                      : verifyStatus === "verifying"
                      ? "border-yellow-400 animate-pulse"
                      : "border-white/70"
                  }`}
                />
              </div>

              {/* Scanning line animation */}
              {verifyStatus === "verifying" && (
                <div className="absolute inset-x-0 top-0 h-1 bg-yellow-400 animate-[scan_2s_ease-in-out_infinite]" style={{ animation: "scanline 2.5s linear infinite" }} />
              )}

              {/* Status overlay */}
              {verifyStatus !== "idle" && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-4 flex items-center justify-center gap-2">
                  {verifyStatus === "verifying" && (
                    <>
                      <Loader2 className="h-5 w-5 text-yellow-400 animate-spin" />
                      <span className="text-white font-medium">جاري التحقق من الوجه...</span>
                    </>
                  )}
                  {verifyStatus === "success" && (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <span className="text-white font-medium">تم التحقق بنجاح</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4">
              {verifyStatus === "idle" && (
                <p className="text-sm text-gray-600 text-center mb-4">
                  ضع وجهك داخل الإطار ثم اضغط على زر التحقق
                </p>
              )}
              <Button
                onClick={handleVerifyFace}
                disabled={verifyStatus !== "idle"}
                className={`w-full gap-2 rounded-xl ${
                  cameraMode === "in"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-700 hover:bg-gray-800"
                } text-white`}
              >
                {verifyStatus === "verifying" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري التحقق...
                  </>
                ) : verifyStatus === "success" ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    تم بنجاح
                  </>
                ) : (
                  <>
                    <ScanFace className="h-4 w-4" />
                    تحقق
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Form Dialogs ── */}
      <DynamicRequestForm
        open={dynamicFormOpen}
        onOpenChange={(open) => {
          setDynamicFormOpen(open);
          if (!open && user?.empId) loadEmployeeRequests(user.empId);
        }}
        schema={activeSchemaId ? (requestFormSchemas[activeSchemaId] ?? null) : null}
        employeeInfo={user ? { empId: user.empId, name: user.name } : undefined}
      />

      <LeaveRequestForm
        open={leaveFormOpen}
        onOpenChange={(open) => {
          setLeaveFormOpen(open);
          if (!open && user?.empId) loadEmployeeRequests(user.empId);
        }}
        employeeInfo={user ? { empId: user.empId, name: user.name } : undefined}
      />
    </div>
  );
}
