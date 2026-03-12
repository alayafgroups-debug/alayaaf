import { useState } from "react";
import Layout from "@/components/Layout";
import { ChevronDown, Send, List } from "lucide-react";
import { cn } from "@/lib/utils";
import LeaveRequestForm from "@/components/hr/LeaveRequestForm";

// ─── Request Types Grid ───────────────────────────────────────────────────────
const REQUEST_TYPES = [
  // Row 1
  { id: "custody",        label: "عهدة",                icon: "📋" },
  { id: "leave",          label: "الإجازات",             icon: "📅" },
  { id: "accommodation",  label: "استكان",               icon: "🏠" },
  { id: "advance",        label: "السلف",                icon: "💰" },
  { id: "disbursement",   label: "الصرف",                icon: "💳" },
  { id: "custody2",       label: "عهدة",                 icon: "📁" },
  // Row 2
  { id: "purchase",       label: "شراء",                 icon: "🛒" },
  { id: "financial_cust", label: "عهدة مالية",           icon: "👤" },
  { id: "transfer",       label: "نقل",                  icon: "🔄" },
  { id: "training",       label: "دورة تدريبية",          icon: "🖥️" },
  { id: "overtime",       label: "عمل إضافي",            icon: "👥" },
  { id: "empty1",         label: "",                     icon: "" },
  // Row 3
  { id: "resignation",    label: "استقالة",              icon: "📝" },
  { id: "secondment",     label: "انتداب",               icon: "👤" },
  { id: "return_work",    label: "مباشرة العمل",          icon: "👥" },
  { id: "add_party",      label: "إضافة طرف",            icon: "👤" },
  { id: "empty2",         label: "",                     icon: "" },
  { id: "empty3",         label: "",                     icon: "" },
  // Row 4
  { id: "salary_adj",     label: "تعديل راتب",           icon: "📝" },
  { id: "add_employee",   label: "إضافة موظف",           icon: "📝" },
  { id: "vacancy",        label: "وظيفة شاغرة",          icon: "🗂️" },
  { id: "other",          label: "أخرى",                 icon: "📦" },
  { id: "disburse_bonus", label: "صرف إنجاز مالي",       icon: "📝" },
  { id: "empty4",         label: "",                     icon: "" },
  // Row 5
  { id: "empty5",         label: "",                     icon: "" },
  { id: "disburse_removal",label: "صرف مستحقات إزالة",   icon: "📝" },
  { id: "commission",     label: "صرف عمولة",            icon: "📁" },
  { id: "mission",        label: "مهمة عمل",             icon: "💼" },
  { id: "empty6",         label: "",                     icon: "" },
  { id: "empty7",         label: "",                     icon: "" },
];

// ─── Approval Chain Dialog ────────────────────────────────────────────────────
const DEPARTMENTS = ["إدارة الموارد البشرية", "الإدارة العليا", "التسويق", "المبيعات", "المحاسبة"];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HRRequestsSend() {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [delegateDept, setDelegateDept] = useState("");
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);

  const handleRequestClick = (id: string, label: string) => {
    if (!label) return;
    setSelectedRequest(id);

    if (id === "leave") {
      setLeaveFormOpen(true);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl" dir="rtl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span className="text-blue-600 font-medium cursor-pointer hover:underline">الطلبات</span>
          <span>/</span>
          <span>إرسال الطلبات</span>
        </div>

        <div className="flex gap-5">
          {/* ── Left: Request Cards Grid ── */}
          <div className="flex-1 min-w-0">
            {/* Top action bar */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <p className="text-sm text-gray-500">قائمة سلسلة الموافقات الخاصة بهذا الحساب</p>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm">
                <Send className="h-4 w-4" />
                نماذج إرسال الطلبات
              </button>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-6 gap-3">
              {REQUEST_TYPES.map((req) => {
                if (!req.label) {
                  return <div key={req.id} />;
                }
                return (
                  <button
                    key={req.id}
                    onClick={() => handleRequestClick(req.id, req.label)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md",
                      selectedRequest === req.id
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                      {req.icon}
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                      {req.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: Employee Info + Delegate ── */}
          <div className="w-72 flex-shrink-0 space-y-4">
            {/* Employee Card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Blue header */}
              <div className="bg-blue-600 h-16 relative" />
              {/* Avatar */}
              <div className="flex flex-col items-center -mt-8 px-4 pb-4">
                <div className="w-16 h-16 rounded-full border-4 border-white shadow-lg bg-blue-100 flex items-center justify-center overflow-hidden">
                  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                    <circle cx="50" cy="50" r="50" fill="#dbeafe" />
                    <ellipse cx="50" cy="38" rx="16" ry="18" fill="#93c5fd" />
                    <ellipse cx="50" cy="80" rx="26" ry="22" fill="#60a5fa" />
                    <circle cx="50" cy="37" r="13" fill="#fcd34d" />
                    <ellipse cx="50" cy="34" rx="12" ry="8" fill="#1e3a5f" />
                  </svg>
                </div>
              </div>

              {/* Employee Info */}
              <div className="px-4 pb-4 space-y-2 text-sm">
                <div className="flex justify-between border-b border-gray-100 py-1.5">
                  <span className="text-gray-500">الاسم</span>
                  <span className="font-medium text-gray-800 text-left">0001 - عبدالمجيد شودري</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 py-1.5">
                  <span className="text-gray-500">الإدارة</span>
                  <span className="font-medium text-gray-800">إدارة العلياء</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">المدير المباشر</span>
                  <span className="font-medium text-gray-800">عبدالمجيد شودري</span>
                </div>
              </div>
            </div>

            {/* Delegate Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">إرسال طلب عوضاً عن موظف</h3>

              {DEPARTMENTS.map((dept, i) => (
                <div
                  key={dept}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer transition",
                    delegateDept === dept
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  )}
                  onClick={() => setDelegateDept(delegateDept === dept ? "" : dept)}
                >
                  <span className="text-sm text-gray-700">{dept}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-gray-400 transition-transform",
                      delegateDept === dept && "rotate-180"
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Forms */}
      <LeaveRequestForm open={leaveFormOpen} onOpenChange={setLeaveFormOpen} />
    </Layout>
  );
}
