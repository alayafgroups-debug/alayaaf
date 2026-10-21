import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { ChevronDown, Loader2, Search, Send, List, X } from "lucide-react";
import { cn } from "@/lib/utils";
import LeaveRequestForm from "@/components/hr/LeaveRequestForm";
import DynamicRequestForm from "@/components/hr/DynamicRequestForm";
import { requestFormSchemas } from "@/components/hr/formSchemas";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";
import { canManagePerm, readUserSession } from "@/lib/authSession";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { ACTIVE_EMPLOYEE_STATUSES } from "@/lib/hrStatus";

/** موظف يُرسل الطلب عوضًا عنه (كما في سمارت: «إرسال طلب عوضًا عن موظف») */
type DelegateEmployee = { id: string; empId: string; name: string };
const toDelegate = (row: Record<string, unknown>): DelegateEmployee => ({
  id: String(row.id ?? ""),
  empId: String(row.emp_id ?? "").trim(),
  name: String(row.name ?? "").trim(),
});

// ─── Request Types Grid ───────────────────────────────────────────────────────
const REQUEST_TYPES = [
  // Row 1
  { id: "custody",        label: "عهدة",                icon: "📋" },
  { id: "leave",          label: "الإجازات",             icon: "📅" },
  { id: "accommodation",  label: "استئذان",             icon: "🏠" },
  { id: "advance",        label: "السلف",                icon: "💰" },
  { id: "disbursement",   label: "الصرف",                icon: "💳" },
  { id: "maintenance",    label: "صيانة",                icon: "🔧" },
  // Row 2
  { id: "purchase",       label: "شراء",                 icon: "🛒" },
  { id: "clearance",      label: "إخلاء طرف",            icon: "🚪" },
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
  { id: "termination",    label: "إقالة موظف",           icon: "🚫" },
  { id: "disburse_bonus", label: "صرف امتياز مالي",      icon: "📝" },
  { id: "empty4",         label: "",                     icon: "" },
  // Row 5
  { id: "empty5",         label: "",                     icon: "" },
  { id: "leave_dues",     label: "صرف مستحقات إجازة",    icon: "📝" },
  { id: "commission",     label: "صرف عمولة",            icon: "📁" },
  { id: "mission",        label: "مهمة عمل",             icon: "💼" },
  { id: "empty6",         label: "",                     icon: "" },
  { id: "empty7",         label: "",                     icon: "" },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HRRequestsSend() {
  const { t, direction } = useI18n();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [delegateDept, setDelegateDept] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [dynamicFormOpen, setDynamicFormOpen] = useState(false);
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState({
    empId: "",
    name: "",
    department: "",
    directManager: ""
  });
  // الطلب عوضًا عن موظف: لمن يدير الطلبات أو الإجازات أو الحضور (قاعدة البيانات تفرض الصلاحية نفسها)
  const { permissions } = useRolePermissions();
  const canDelegate = canManagePerm(permissions, "hr.requests", "hr.leaves", "hr.attendance", "module.hr");
  const [onBehalf, setOnBehalf] = useState<DelegateEmployee | null>(null);
  const [deptEmployees, setDeptEmployees] = useState<Record<string, { loading: boolean; rows: DelegateEmployee[]; error: string }>>({});
  const [delegateSearch, setDelegateSearch] = useState("");
  const [searchResults, setSearchResults] = useState<DelegateEmployee[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);
  // الطلب يُرسل باسم الموظف المختار، وإلا باسم صاحب الجلسة
  const formEmployee = onBehalf ? { empId: onBehalf.empId, name: onBehalf.name } : { empId: employeeInfo.empId, name: employeeInfo.name };
  // عوضًا عن موظف آخر: بلا توقيع (لا يوقّع أحد عن غيره)، ويُذكر المرسل. اختيار نفسه = طلب عادي بتوقيعه
  const onBehalfBy = onBehalf && onBehalf.empId !== employeeInfo.empId
    ? { empId: employeeInfo.empId, name: employeeInfo.name || readUserSession()?.name || "" }
    : null;

  const loadDepartmentEmployees = async (departmentId: string) => {
    if (deptEmployees[departmentId]?.rows.length) return;
    setDeptEmployees((current) => ({ ...current, [departmentId]: { loading: true, rows: [], error: "" } }));
    const { data, error } = await supabase
      .from("employees")
      .select("id, emp_id, name")
      .eq("department_id", departmentId)
      .in("status", ACTIVE_EMPLOYEE_STATUSES)
      .order("name")
      .limit(1000);
    setDeptEmployees((current) => ({
      ...current,
      [departmentId]: { loading: false, rows: error ? [] : (data ?? []).map((row) => toDelegate(row as Record<string, unknown>)), error: error ? t("تعذر تحميل الموظفين") : "" },
    }));
  };

  // بحث بالاسم أو الرقم الوظيفي في كل الموظفين الفعالين
  useEffect(() => {
    const query = delegateSearch.replace(/[,()%*\\]/g, " ").trim();
    const seq = ++searchSeq.current;
    if (!canDelegate || query.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, emp_id, name")
        .in("status", ACTIVE_EMPLOYEE_STATUSES)
        .or(`name.ilike.%${query}%,emp_id.ilike.%${query}%`)
        .order("name")
        .limit(20);
      if (seq !== searchSeq.current) return;
      setSearching(false);
      setSearchResults(error ? [] : (data ?? []).map((row) => toDelegate(row as Record<string, unknown>)));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [delegateSearch, canDelegate]);

  const chooseDelegate = (employee: DelegateEmployee) => {
    // صاحب الجلسة نفسه: طلب عادي
    if (employee.empId && employee.empId === employeeInfo.empId && employee.name === employeeInfo.name) { setOnBehalf(null); return; }
    setOnBehalf(employee);
    setDelegateSearch("");
    setSearchResults([]);
  };

  useEffect(() => {
    const loadAdminUser = async () => {
      try {
        // المرسل هو صاحب الجلسة نفسه (لا أول موظف في الجدول)
        const session = readUserSession();
        const [employeeResult, departmentResult] = await Promise.all([
          session?.empId
            ? supabase.from("employees").select("emp_id, name, department_id, directorate, department, direct_manager").eq("emp_id", session.empId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase.from("departments").select("id, name").order("name"),
        ]);
        const departmentRows = (departmentResult.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name) }));
        setDepartments(departmentRows);
        const data = employeeResult.data;
        if (data) {
          setEmployeeInfo({
            empId: data.emp_id || "",
            name: data.name || "",
            department: departmentRows.find((item) => item.id === String(data.department_id ?? ""))?.name || data.directorate || data.department || "",
            directManager: data.direct_manager || ""
          });
        }
      } catch (err) {
        console.warn("Could not load employee info", err);
      }
    };
    loadAdminUser();
  }, []);

  const handleRequestClick = (id: string, label: string) => {
    if (!label) return;
    setSelectedRequest(id);

    if (id === "leave") {
      setLeaveFormOpen(true);
    } else if (requestFormSchemas[id]) {
      setActiveSchemaId(id);
      setDynamicFormOpen(true);
    } else {
      alert(`${t("نموذج")} ${t(label)} ${t("غير متوفر حالياً")}`);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl" dir={direction}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span className="text-blue-600 font-medium cursor-pointer hover:underline">{t("الطلبات")}</span>
          <span>/</span>
          <span>{t("إرسال الطلبات")}</span>
        </div>

        <div className="flex gap-5">
          {/* ── Left: Request Cards Grid ── */}
          <div className="flex-1 min-w-0">
            {onBehalf && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span>
                  {t("الطلب عوضًا عن")}: <strong>{onBehalf.name}</strong> ({onBehalf.empId || "—"}) — {t("اختر نوع الطلب؛ يُرسل باسمه ويمر بسلسلة موافقاته")}
                </span>
                <button type="button" onClick={() => setOnBehalf(null)} className="flex items-center gap-1 rounded-md border border-amber-400 bg-white px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                  <X className="h-3 w-3" />{t("إلغاء والعودة لطلبي")}
                </button>
              </div>
            )}
            {/* Top action bar */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <p className="text-sm text-gray-500">{t("قائمة سلسلة الموافقات الخاصة بهذا الحساب")}</p>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm">
                <Send className="h-4 w-4" />
                {t("نماذج إرسال الطلبات")}
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
                      {t(req.label)}
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
                  <span className="text-gray-500">{t("الاسم")}</span>
                  <span className="font-medium text-gray-800 text-left">{employeeInfo.empId} - {employeeInfo.name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 py-1.5">
                  <span className="text-gray-500">{t("الإدارة")}</span>
                  <span className="font-medium text-gray-800">{employeeInfo.department}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">{t("المدير المباشر")}</span>
                  <span className="font-medium text-gray-800">{employeeInfo.directManager}</span>
                </div>
              </div>
            </div>

            {/* Delegate Section */}
            {canDelegate && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">{t("إرسال طلب عوضاً عن موظف")}</h3>
              <div className="relative">
                <Search className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={delegateSearch}
                  onChange={(event) => setDelegateSearch(event.target.value)}
                  placeholder={t("بحث بالاسم أو الرقم الوظيفي")}
                  className="w-full rounded-lg border border-gray-200 py-2 pe-2 ps-8 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              {delegateSearch.trim().length >= 2 && (
                <div className="max-h-60 overflow-auto rounded-lg border border-gray-100">
                  {searching ? (
                    <p className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500"><Loader2 className="h-3 w-3 animate-spin" />{t("جاري البحث...")}</p>
                  ) : searchResults.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-500">{t("لا توجد نتائج")}</p>
                  ) : searchResults.map((employee) => (
                    <button key={employee.id} type="button" onClick={() => chooseDelegate(employee)}
                      className={cn("block w-full px-3 py-2 text-start text-sm hover:bg-blue-50", onBehalf?.id === employee.id && "bg-blue-50 font-semibold")}>
                      {employee.name} <span className="text-xs text-gray-500">{employee.empId}</span>
                    </button>
                  ))}
                </div>
              )}

              {departments.map((department) => {
                const open = delegateDept === department.id;
                const state = deptEmployees[department.id];
                return (
                  <div key={department.id} className="space-y-1">
                    <div
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer transition",
                        open ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                      )}
                      onClick={() => {
                        const next = open ? "" : department.id;
                        setDelegateDept(next);
                        if (next) void loadDepartmentEmployees(next);
                      }}
                    >
                      <span className="text-sm text-gray-700">{department.name}</span>
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")} />
                    </div>
                    {open && (
                      <div className="max-h-64 overflow-auto rounded-lg border border-gray-100">
                        {state?.loading ? (
                          <p className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500"><Loader2 className="h-3 w-3 animate-spin" />{t("جاري التحميل...")}</p>
                        ) : state?.error ? (
                          <p className="px-3 py-2 text-xs text-rose-600">{state.error}</p>
                        ) : !state?.rows.length ? (
                          <p className="px-3 py-2 text-xs text-gray-500">{t("لا يوجد موظفون في هذه الإدارة")}</p>
                        ) : state.rows.map((employee) => (
                          <button key={employee.id} type="button" onClick={() => chooseDelegate(employee)}
                            className={cn("block w-full px-3 py-2 text-start text-sm hover:bg-blue-50", onBehalf?.id === employee.id && "bg-blue-50 font-semibold")}>
                            {employee.name} <span className="text-xs text-gray-500">{employee.empId}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Forms */}
      <LeaveRequestForm
        key={`leave-${formEmployee.empId}-${formEmployee.name}`}
        open={leaveFormOpen}
        onOpenChange={setLeaveFormOpen}
        employeeInfo={formEmployee}
        onBehalfBy={onBehalfBy}
      />
      <DynamicRequestForm
        key={`dynamic-${formEmployee.empId}-${formEmployee.name}`}
        open={dynamicFormOpen}
        onOpenChange={setDynamicFormOpen}
        schema={activeSchemaId ? requestFormSchemas[activeSchemaId] : null}
        employeeInfo={formEmployee}
        onBehalfBy={onBehalfBy}
      />
    </Layout>
  );
}
