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
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import DynamicRequestForm from "@/components/hr/DynamicRequestForm";
import LeaveRequestForm from "@/components/hr/LeaveRequestForm";
import { requestFormSchemas } from "@/components/hr/formSchemas";
import EmployeeListPage from "@/components/portal/EmployeeListPage";
import ProfilePage from "@/components/portal/ProfilePage";
import PayrollPage from "@/components/portal/PayrollPage";
import PenaltiesPage from "@/components/portal/PenaltiesPage";
import ManagerRequestsPage from "@/components/portal/ManagerRequestsPage";
import AttendanceReportPage from "@/components/portal/AttendanceReportPage";
import PortalDataPage from "@/components/portal/PortalDataPage";
import ContactManagementPage from "@/components/portal/ContactManagementPage";
import ComplaintsPage from "@/components/portal/ComplaintsPage";
import EmployeeSettingsPage from "@/components/portal/EmployeeSettingsPage";
import AboutPage from "@/components/portal/AboutPage";
import PrivacyPage from "@/components/portal/PrivacyPage";
import DeductionSettingsPage from "./DeductionSettingsPage";
import EmployeeEmailPage from "./EmployeeEmailPage";

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

type AppPage = "home" | "requests" | "send-request" | "more" | "employees" | "profile" | "payroll" | "payslip" | "penalties" | "schedule" | "my-reports" | "reports" | "manager-requests" | "team" | "attendance" | "performance" | "commissions" | "circulars" | "announcements" | "complaints" | "contact" | "settings" | "about" | "privacy" | "notifications" | "email" | "deduction-settings";

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

const getLocalDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const EMPLOYEE_MORE_OPTION_NAMES = new Set([
  "الملف الشخصي",
  "تقييم الأداء",
  "دوامي",
  "تقاريري",
  "قسيمة الراتب",
  "الإعدادات",
  "من نحن",
  "سياسة الخصوصية",
]);

const FULL_MORE_ACCESS_ROLES = new Set(["مدير النظام", "مدير عام", "المدير العام"]);

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
  { id: 13, name: "عمولات الموظفين", desc: "بيعات المندوبين، بيعات المشرفين، عمو...", icon: "💰" },
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
  const [employeeDepartment, setEmployeeDepartment] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

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
    if (mode === "out" && !checkInTime) {
      toast.error("يجب تسجيل الحضور أولاً قبل تسجيل الانصراف");
      return;
    }
    if (mode === "in" && checkInTime) {
      toast.info("تم تسجيل حضورك مسبقاً لهذا اليوم");
      return;
    }
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
    if (!user) return false;
    try {
      const { data: existing, error: lookupError } = await supabase
        .from("attendance")
        .select("id, check_in, check_out")
        .eq("emp_id", user.empId)
        .eq("date", date)
        .order("created_at", { ascending: false })
        .limit(1);
      if (lookupError) throw lookupError;

      const rec = (existing ?? [])[0] as
        | { id: string; check_in: string | null; check_out: string | null }
        | undefined;

      if (mode === "in") {
        if (rec) {
          const { error } = await supabase.from("attendance")
            .update({ check_in: time, status: "حاضر", emp_name: user.name, department: employeeDepartment || null })
            .eq("id", rec.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("attendance").insert([{
            emp_id: user.empId, emp_name: user.name,
            department: employeeDepartment || null,
            date, status: "حاضر", check_in: time,
          }]);
          if (error) throw error;
        }
      } else {
        if (!rec?.check_in) {
          toast.error("يجب تسجيل الحضور أولاً قبل تسجيل الانصراف");
          return false;
        }
        const { error } = await supabase.from("attendance")
          .update({ check_out: time }).eq("id", rec.id);
        if (error) throw error;
      }
      return true;
    } catch (error: any) {
      console.error("Attendance save failed:", error);
      toast.error(error?.message || "تعذر حفظ الحضور في قاعدة البيانات");
      return false;
    }
  };

  const handleVerifyFace = () => {
    setVerifyStatus("verifying");
    // Simulate face scan
    setTimeout(async () => {
      const now = new Date();
      const time = now.toLocaleTimeString("en-GB", { hour12: false });
      const date = getLocalDate(now);

      const saved = await saveAttendance(cameraMode, time, date);
      if (!saved) {
        setVerifyStatus("idle");
        return;
      }

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

  // Intercept hardware/browser back button - prevent full exit on sub-pages
  useEffect(() => {
    window.history.pushState({ portal: true }, "");
    const handlePop = () => {
      if (currentPage !== "home") {
        setCurrentPage("home");
        window.history.pushState({ portal: true }, "");
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [currentPage]);

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
      const [requestsResult, investigationsResult, warningsResult] = await Promise.all([
        supabase
          .from("leave_requests")
          .select("*")
          .eq("emp_id", empId)
          .order("created_at", { ascending: false }),
        supabase
          .from("penalty_investigations")
          .select("*")
          .eq("emp_id", empId)
          .order("sent_at", { ascending: false }),
        supabase
          .from("penalty_warnings")
          .select("*")
          .eq("emp_id", empId)
          .order("sent_at", { ascending: false }),
      ]);

      if (requestsResult.error) throw requestsResult.error;
      if (investigationsResult.error) throw investigationsResult.error;
      if (warningsResult.error) throw warningsResult.error;

      const requests: EmployeeRequest[] = (requestsResult.data ?? []).map((r: any) => ({
        id: `request-${String(r.id)}`,
        type: String(r.leave_type ?? "طلب"),
        status: normalizeStatus(r.status),
        createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString("ar-SA") : "-",
        reason: formatRequestReason(String(r.leave_type ?? "طلب"), r.reason ?? r.notes),
        adminNote: String(r.admin_note ?? ""),
      }));

      const investigations: EmployeeRequest[] = (investigationsResult.data ?? []).map((r: any) => ({
        id: `investigation-${String(r.id)}`,
        type: "مساءلة إدارية",
        status: normalizeStatus(r.status === "مرسلة" ? "معلق" : r.status),
        createdAt: r.sent_at ? new Date(r.sent_at).toLocaleDateString("ar-SA") : "-",
        reason: `${String(r.subject ?? "مساءلة")} — ${String(r.message ?? "")}`,
        adminNote: "",
      }));

      const warnings: EmployeeRequest[] = (warningsResult.data ?? []).map((r: any) => ({
        id: `warning-${String(r.id)}`,
        type: "إنذار إداري",
        status: normalizeStatus(r.status === "مرسل" ? "معلق" : r.status),
        createdAt: r.sent_at ? new Date(r.sent_at).toLocaleDateString("ar-SA") : "-",
        reason: `${String(r.subject ?? "إنذار")} — ${String(r.message ?? "")}`,
        adminNote: "",
      }));

      const mapped = [...requests, ...investigations, ...warnings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
    if (option.logout) { handleLogout(); return; }
    const pageMap: Record<string, AppPage> = {
      "الملف الشخصي": "profile",
      "قائمة الموظفين": "employees",
      "حساب الراتب": "payroll",
      "قسيمة الراتب": "payslip",
      "المساعلات والإنذارات": "penalties",
      "دوامي": "schedule",
      "تقاريري": "my-reports",
      "التقارير": "reports",
      "فريق العمل": "team",
      "الحضور": "attendance",
      "تقييم الأداء": "performance",
      "عموالت الموظفين": "commissions",
      "التعاميم": "circulars",
      "الإعلانات": "announcements",
      "الشكاوي": "complaints",
      "التواصل مع الإدارة": "contact",
      "الإعدادات": "settings",
      "من نحن": "about",
      "سياسة الخصوصية": "privacy",
    };
    const target = pageMap[option.name];
    if (target) setCurrentPage(target);
    else toast.info(`سيتم فتح ${option.name} قريباً`);
  };

  // Fetch employee permissions from DB to filter request types
  useEffect(() => {
    if (!user?.empId) return;
    const fetchPermissions = async () => {
      try {
        const { data } = await supabase
          .from("employees")
          .select("permissions, department")
          .eq("emp_id", user.empId)
          .maybeSingle();
        setEmployeeDepartment(String(data?.department ?? ""));
        if (data && Array.isArray(data.permissions) && data.permissions.length > 0) {
          setAllowedRequests(data.permissions as string[]);
        } else {
          setAllowedRequests([]); // empty = show all
        }
      } catch {
        setAllowedRequests([]);
      }
    };
    const loadTodayAttendance = async () => {
      const today = getLocalDate();
      const { data, error } = await supabase
        .from("attendance")
        .select("check_in, check_out")
        .eq("emp_id", user.empId)
        .eq("date", today)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) {
        console.error("Attendance load failed:", error);
        return;
      }
      const record = data?.[0];
      setCheckInTime(record?.check_in ? `${record.check_in} ${today}` : null);
      setCheckOutTime(record?.check_out ? `${record.check_out} ${today}` : null);
    };

    fetchPermissions();
    loadTodayAttendance();
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

  const hasFullMoreAccess = FULL_MORE_ACCESS_ROLES.has(String(user?.role ?? "").trim());
  const visibleMoreOptions = hasFullMoreAccess
    ? MORE_OPTIONS
    : MORE_OPTIONS.filter((option) => EMPLOYEE_MORE_OPTION_NAMES.has(option.name));

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
        <div className="sticky top-0 z-20">
          {currentPage === "home" ? (
            <div className="bg-gradient-to-br from-[#0a1628] via-[#0d2444] to-[#0a3d6b] px-5 pb-0" style={{ paddingTop: "max(52px, calc(env(safe-area-inset-top, 0px) + 20px))" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage("notifications"); }} className="relative w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <Bell className="h-4.5 w-4.5 text-white" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPasswordModal(true); }} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm hover:bg-white/20 transition">
                    <Mail className="h-4.5 w-4.5 text-white" />
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage("settings"); }} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <Settings className="h-4.5 w-4.5 text-white" />
                  </button>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <p className="text-white font-bold text-sm leading-tight">{user.name}</p>
                    <p className="text-blue-300 text-[11px]">{user.role}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-base shadow-lg">
                    {user.name.charAt(0)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[#0a1628] via-[#0d2444] to-[#0a3d6b] px-4 flex items-center justify-between" style={{ paddingTop: "max(52px, calc(env(safe-area-inset-top, 0px) + 16px))", paddingBottom: "14px" }}>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage("home"); }}
                className="flex items-center gap-1 text-white/80 hover:text-white transition"
              >
                <ChevronLeft className="h-5 w-5 rotate-180" />
                <span className="text-sm font-medium">رجوع</span>
              </button>
              <h1 className="text-base font-bold text-white">
                {currentPage === "requests" && "الطلبات"}
                {currentPage === "send-request" && "طلب جديد"}
                {currentPage === "more" && "المزيد"}
              </h1>
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <User className="h-4.5 w-4.5 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Content */}
        <div className="pb-32">
          {currentPage === "home" && (
            <div className="pb-32">
              {/* Hero attendance card */}
              <div className="bg-gradient-to-br from-[#0a1628] via-[#0d2444] to-[#0a3d6b] px-5 pt-1 pb-7">
                {/* Greeting strip */}
                <div className="mb-4 bg-white/5 rounded-2xl px-4 py-2.5 flex items-center justify-between backdrop-blur-sm border border-white/10">
                  <div>
                    <p className="text-white/50 text-[10px] uppercase tracking-widest">جلسة اليوم</p>
                    <p className="text-white/80 text-xs font-medium mt-0.5">{new Date().toLocaleDateString("ar-SA", { weekday:"long", day:"numeric", month:"long" })}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${checkInTime && !checkOutTime ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30" : checkOutTime ? "bg-blue-400/20 text-blue-300 border border-blue-400/30" : "bg-white/10 text-white/50 border border-white/10"}`}>
                    {checkInTime && !checkOutTime ? "جاري العمل" : checkOutTime ? "منصرف" : "خارج الدوام"}
                  </div>
                </div>

                {/* Punch times */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-4 border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/0 via-emerald-400/60 to-emerald-400/0" />
                    <p className="text-emerald-300/70 text-[9px] font-semibold uppercase tracking-wider mb-2">تسجيل الحضور</p>
                    <p className="font-mono text-xl font-bold text-white leading-none">{checkInTime ? checkInTime.split(" ")[0] : "--:--"}</p>
                    <p className="font-mono text-[10px] text-white/40 mt-1">{checkInTime ? checkInTime.split(" ")[1] : "لم يُسجّل بعد"}</p>
                  </div>
                  <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-4 border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400/0 via-orange-400/60 to-orange-400/0" />
                    <p className="text-orange-300/70 text-[9px] font-semibold uppercase tracking-wider mb-2">تسجيل الانصراف</p>
                    <p className="font-mono text-xl font-bold text-white leading-none">{checkOutTime ? checkOutTime.split(" ")[0] : "--:--"}</p>
                    <p className="font-mono text-[10px] text-white/40 mt-1">{checkOutTime ? checkOutTime.split(" ")[1] : "لم يُسجّل بعد"}</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => openCamera("out")}
                    disabled={!checkInTime}
                    className="relative overflow-hidden rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-all bg-white/10 text-white/70 border border-white/15 disabled:opacity-40"
                  >
                    <ScanFace className="h-4 w-4" />
                    <span>تسجيل الانصراف</span>
                  </button>
                  <button
                    onClick={() => openCamera("in")}
                    disabled={!!checkInTime}
                    className="relative overflow-hidden rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-bold transition-all bg-gradient-to-l from-emerald-400 to-cyan-400 text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                  >
                    <ScanFace className="h-4 w-4" />
                    <span>تسجيل الحضور</span>
                  </button>
                </div>
              </div>

              {/* Quick actions */}
              <div className="px-4 -mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setCurrentPage("requests")} className="group relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100/80 p-5 flex flex-col items-start gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <div className="w-11 h-11 rounded-xl bg-[#0d2444]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="h-5 w-5 text-[#0d2444]" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">الطلبات</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">طلباتك الواردة والمرسلة</p>
                    </div>
                    {notificationCount > 0 && (
                      <span className="absolute top-3 left-3 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{notificationCount}</span>
                    )}
                  </button>

                  <button onClick={() => setCurrentPage("send-request")} className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-sm p-5 flex flex-col items-start gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">طلب جديد</p>
                      <p className="text-[10px] text-white/70 mt-0.5">إرسال طلب جديد للإدارة</p>
                    </div>
                  </button>

                  <button onClick={() => setCurrentPage("more")} className="group relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-sm p-5 flex flex-col items-start gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">الخدمات</p>
                      <p className="text-[10px] text-white/70 mt-0.5">جميع الخدمات والخيارات</p>
                    </div>
                  </button>

                  <button onClick={() => setCurrentPage("profile")} className="group relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100/80 p-5 flex flex-col items-start gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <User className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">ملفي</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">بيانات الملف الشخصي</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentPage === "send-request" && (
            <div className="p-4 pb-32">
              <div className="grid grid-cols-3 gap-2.5">
                {visibleRequestTypes.length === 0 ? (
                  <p className="col-span-3 text-center text-gray-400 py-10">لا توجد طلبات متاحة لك</p>
                ) : visibleRequestTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSendRequest(type)}
                    className={`${type.color} rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 hover:shadow-md active:scale-95 transition min-h-[90px]`}
                  >
                    <span className="text-[26px] leading-none">{type.icon}</span>
                    <span className="text-[11px] font-bold text-center text-gray-800 leading-tight mt-0.5">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentPage === "requests" && (
            <div>
              {/* Requests Tab Navigation */}
              <div className="bg-white border-b border-gray-200">
                <div className="flex gap-0">
                  {["received", "draft", "sent", "attached"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRequestsTab(tab as any)}
                      className={`flex-1 px-1 py-3 font-semibold text-[11px] text-center border-b-2 transition ${
                        requestsTab === tab
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500"
                      }`}
                    >
                      {tab === "received" && "الواردة"}
                      {tab === "draft" && "المسودة"}
                      {tab === "sent" && "المرسلة"}
                      {tab === "attached" && "الملحقة"}
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
            <div className="p-4 pb-32 bg-gray-50">
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {visibleMoreOptions.filter(o => !o.logout).map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleMoreOption(option)}
                    className="bg-white rounded-2xl p-3 flex flex-col items-center gap-2 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-2xl shadow-inner">
                      {option.icon}
                    </div>
                    <p className="text-[10px] font-semibold text-gray-800 leading-tight">{option.name}</p>
                  </button>
                ))}
              </div>
              {/* Logout row */}
              {visibleMoreOptions.filter(o => o.logout).map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleMoreOption(option)}
                  className="w-full bg-red-50 rounded-2xl p-4 flex items-center justify-center gap-2 border border-red-100 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {option.name}
                </button>
              ))}
            </div>
          )}

          {/* ===== SUB-PAGES ===== */}
          {currentPage === "employees" && user && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <EmployeeListPage onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "profile" && user && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <ProfilePage empId={user.empId} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {(currentPage === "payroll" || currentPage === "payslip") && user && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <PayrollPage empId={user.empId} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "penalties" && user && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <PenaltiesPage empId={user.empId} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "schedule" && user && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <AttendanceReportPage empId={user.empId} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "manager-requests" && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <ManagerRequestsPage onBack={() => setCurrentPage("home")} />
            </div>
          )}
          {user && ["team","attendance","performance","my-reports","reports","circulars","announcements","commissions"].includes(currentPage) && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <PortalDataPage
                mode={currentPage as any}
                empId={user.empId}
                employeeName={user.name}
                isManager={hasFullMoreAccess}
                onBack={() => setCurrentPage("more")}
              />
            </div>
          )}
          {currentPage === "complaints" && user && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <ComplaintsPage empId={user.empId} empName={user.name} isManager={hasFullMoreAccess} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "contact" && user && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <ContactManagementPage empId={user.empId} empName={user.name} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "settings" && user && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <EmployeeSettingsPage empId={user.empId} empName={user.name} empRole={user.role} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "about" && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <AboutPage onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "privacy" && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <PrivacyPage onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "notifications" && user && (
            <div className="h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              <PenaltiesPage empId={user.empId} onBack={() => setCurrentPage("home")} />
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <div className="mx-3 bg-[#0a1628]/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl shadow-black/50 px-4 py-3 flex items-center justify-between" style={{ marginBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}>
            <button
              onClick={() => setCurrentPage("home")}
              className={`flex flex-col items-center gap-1 w-14 transition-all ${currentPage === "home" ? "text-cyan-400" : "text-white/40"}`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${currentPage === "home" ? "bg-cyan-400/20" : ""}`}>
                <Home className="h-4.5 w-4.5" />
              </div>
              <span className="text-[9px] font-medium">الرئيسية</span>
            </button>
            <button
              onClick={() => setCurrentPage("requests")}
              className={`flex flex-col items-center gap-1 w-14 relative transition-all ${currentPage === "requests" ? "text-cyan-400" : "text-white/40"}`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-xl relative transition-all ${currentPage === "requests" ? "bg-cyan-400/20" : ""}`}>
                <FileText className="h-4.5 w-4.5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                    {notificationCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-medium">الطلبات</span>
            </button>

            {/* FAB */}
            <button
              onClick={() => setCurrentPage("send-request")}
              className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:scale-105 transition-transform -mt-5"
            >
              <Plus className="h-6 w-6 text-white" />
            </button>

            <button
              onClick={() => setCurrentPage("more")}
              className={`flex flex-col items-center gap-1 w-14 transition-all ${currentPage === "more" ? "text-cyan-400" : "text-white/40"}`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${currentPage === "more" ? "bg-cyan-400/20" : ""}`}>
                <MoreHorizontal className="h-4.5 w-4.5" />
              </div>
              <span className="text-[9px] font-medium">المزيد</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 w-14 text-white/30 hover:text-red-400 transition-colors"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-xl">
                <LogOut className="h-4.5 w-4.5" />
              </div>
              <span className="text-[9px] font-medium">خروج</span>
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
              <button onClick={() => setCurrentPage("notifications")} className="relative">
                <Bell className="h-6 w-6 text-gray-700" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
              <button onClick={() => setShowPasswordModal(true)} className="hover:text-blue-600 transition">
                <Mail className="h-6 w-6 text-gray-700" />
              </button>
              <button onClick={() => setCurrentPage("settings")}>
                <Settings className="h-6 w-6 text-gray-700" />
              </button>
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
              <div className="bg-gradient-to-r from-[#004e89] to-[#003865] text-white rounded-xl p-8 mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">لوحة تحكم المدير</h2>
                  <p className="text-blue-100">مرحباً بك في نظام إدارة الموارد البشرية</p>
                </div>
                <button onClick={() => setCurrentPage("manager-requests")} className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-5 py-3 flex items-center gap-3 transition">
                  <FileText className="h-5 w-5" />
                  <div className="text-right"><p className="font-bold text-sm">الطلبات المعلقة</p><p className="text-xs text-blue-200">تنتظر موافقتك</p></div>
                </button>
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

              {/* Quick Actions Row */}
              <div className="grid grid-cols-4 gap-4 mb-2">
                <button onClick={() => setCurrentPage("requests")} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition text-center flex flex-col items-center gap-3">
                  <FileText className="h-8 w-8 text-[#004e89]" />
                  <div><p className="font-semibold text-gray-900 text-sm">الطلبات</p><p className="text-xs text-gray-500 mt-0.5">عرض الطلبات الواردة والمرسلة</p></div>
                </button>
                <button onClick={() => setCurrentPage("send-request")} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition text-center flex flex-col items-center gap-3">
                  <Plus className="h-8 w-8 text-green-500" />
                  <div><p className="font-semibold text-gray-900 text-sm">طلب جديد</p><p className="text-xs text-gray-500 mt-0.5">إرسال طلب جديد</p></div>
                </button>
                <button onClick={() => setCurrentPage("more")} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition text-center flex flex-col items-center gap-3">
                  <Briefcase className="h-8 w-8 text-purple-500" />
                  <div><p className="font-semibold text-gray-900 text-sm">الخدمات</p><p className="text-xs text-gray-500 mt-0.5">جميع الخدمات والخيارات</p></div>
                </button>
                <button onClick={() => setCurrentPage("profile")} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition text-center flex flex-col items-center gap-3">
                  <User className="h-8 w-8 text-orange-500" />
                  <div><p className="font-semibold text-gray-900 text-sm">ملفي</p><p className="text-xs text-gray-500 mt-0.5">بيانات الملف الشخصي</p></div>
                </button>
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
              <div className="grid grid-cols-3 gap-4">
                {visibleMoreOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleMoreOption(option)}
                    className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-right border border-gray-100"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{option.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{option.name}</h3>
                        <p className="text-sm text-gray-500">{option.desc}</p>
                      </div>
                      <ChevronLeft className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {currentPage === "employees" && user && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "75vh" }}>
              <EmployeeListPage onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "profile" && user && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "80vh" }}>
              <ProfilePage empId={user.empId} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {(currentPage === "payroll" || currentPage === "payslip") && user && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "80vh" }}>
              <PayrollPage empId={user.empId} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "penalties" && user && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "80vh" }}>
              <PenaltiesPage empId={user.empId} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "schedule" && user && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "80vh" }}>
              <AttendanceReportPage empId={user.empId} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "manager-requests" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "85vh" }}>
              <ManagerRequestsPage onBack={() => setCurrentPage("home")} />
            </div>
          )}
          {user && ["team","attendance","performance","my-reports","reports","circulars","announcements","commissions"].includes(currentPage) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "80vh" }}>
              <PortalDataPage
                mode={currentPage as any}
                empId={user.empId}
                employeeName={user.name}
                isManager={hasFullMoreAccess}
                onBack={() => setCurrentPage("more")}
              />
            </div>
          )}
          {currentPage === "complaints" && user && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "80vh" }}>
              <ComplaintsPage empId={user.empId} empName={user.name} isManager={hasFullMoreAccess} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "contact" && user && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "80vh" }}>
              <ContactManagementPage empId={user.empId} empName={user.name} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "settings" && user && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "80vh" }}>
              <EmployeeSettingsPage empId={user.empId} empName={user.name} empRole={user.role} onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "about" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "80vh" }}>
              <AboutPage onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "privacy" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "80vh" }}>
              <PrivacyPage onBack={() => setCurrentPage("more")} />
            </div>
          )}
          {currentPage === "notifications" && user && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "80vh" }}>
              <PenaltiesPage empId={user.empId} onBack={() => setCurrentPage("home")} />
            </div>
          )}
        </main>
      </div>

      {/* PASSWORD MODAL FOR SETTINGS */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">إدارة الإعدادات</h2>
            <p className="text-sm text-gray-600 mb-4">أدخل كلمة المرور للمتابعة</p>
            <input
              type="password"
              placeholder="كلمة المرور"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  if (passwordInput === "1234") {
                    setCurrentPage("deduction-settings");
                    setShowPasswordModal(false);
                    setPasswordInput("");
                  } else {
                    setPasswordError("كلمة المرور غير صحيحة");
                  }
                }
              }}
            />
            {passwordError && <p className="text-sm text-red-600 mb-4">{passwordError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (passwordInput === "1234") {
                    setCurrentPage("deduction-settings");
                    setShowPasswordModal(false);
                    setPasswordInput("");
                  } else {
                    setPasswordError("كلمة المرور غير صحيحة");
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg"
              >
                دخول
              </button>
              <button
                onClick={() => { setShowPasswordModal(false); setPasswordInput(""); setPasswordError(""); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email & Deduction Pages */}
      {currentPage === "email" && user && <EmployeeEmailPage onBack={() => setCurrentPage("home")} />}
      {currentPage === "deduction-settings" && <DeductionSettingsPage />}

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
