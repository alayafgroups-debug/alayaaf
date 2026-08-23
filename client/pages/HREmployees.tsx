import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import {
  Users,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  Columns3,
  Printer,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/SalesPageUI";
import EmployeeForm, { emptyForm, mapRowToForm } from "./EmployeeForm";
import type { EmpFormData } from "./EmployeeForm";
import { useI18n } from "@/i18n";

// ─── Constants ───────────────────────────────────────────────────────────────
const DEPARTMENTS = ["قسم الصيانة والتشغيل", "قسم شركة البرمجيات", "قسم المبيعات", "قسم الموارد البشرية", "قسم المحاسبة", "الإدارة العليا"];
const STATUSES = ["فعال", "غير فعال", "إجازة", "منتهي"];

type OptionalColumn = "englishName" | "directorate" | "nationality" | "nationalId" | "hireDate" | "phone" | "email";

const OPTIONAL_COLUMNS: { key: OptionalColumn; label: string }[] = [
  { key: "englishName", label: "الاسم بالإنجليزية" },
  { key: "directorate", label: "الإدارة" },
  { key: "nationality", label: "الجنسية" },
  { key: "nationalId", label: "رقم الهوية" },
  { key: "hireDate", label: "تاريخ التعيين" },
  { key: "phone", label: "رقم الجوال" },
  { key: "email", label: "البريد الإلكتروني" },
];

const STATUS_COLORS: Record<string, string> = {
  "فعال": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "نشط": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "غير فعال": "bg-slate-100 text-slate-600 border-slate-200",
  "غير نشط": "bg-slate-100 text-slate-600 border-slate-200",
  "إجازة": "bg-amber-50 text-amber-700 border-amber-200",
  "منتهي": "bg-rose-50 text-rose-700 border-rose-200",
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HREmployees() {
  const { t, direction, locale, formatNumber } = useI18n();
  const [employees, setEmployees] = useState<EmpFormData[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState<"list" | "create" | "edit" | "view">("list");
  const [selected, setSelected] = useState<EmpFormData | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [fSearch, setFSearch] = useState("");
  const [fDepartment, setFDepartment] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Record<OptionalColumn, boolean>>({
    englishName: false,
    directorate: true,
    nationality: true,
    nationalId: true,
    hireDate: true,
    phone: true,
    email: true,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setEmployees(data.map(mapRowToForm));
        }
      } catch {
        // no-op
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  const filtered = useMemo(() => employees.filter((e) => {
    const keyword = fSearch.trim().toLowerCase();
    if (keyword && ![e.name, e.firstName, e.empId, e.phone, e.email, e.nationalId]
      .some((value) => value.toLowerCase().includes(keyword))) return false;
    if (fDepartment && e.department !== fDepartment) return false;
    if (fStatus && e.status !== fStatus) return false;
    return true;
  }), [employees, fSearch, fDepartment, fStatus]);

  useEffect(() => {
    setPage(1);
  }, [fSearch, fDepartment, fStatus, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageData = filtered.slice(pageStart, pageStart + pageSize);
  const visibleColumnCount = 8 + Object.values(visibleColumns).filter(Boolean).length;
  const allPageSelected = pageData.length > 0 && pageData.every((employee) => selectedIds.has(employee.id));

  const exportCsv = () => {
    if (!filtered.length) {
      toast({ title: t("لا توجد بيانات للتصدير") });
      return;
    }
    const rows = filtered.map((employee) => [
      employee.empId, employee.name, employee.firstName, employee.status, employee.branch,
      employee.department, employee.jobTitle, employee.directorate, employee.nationality,
      employee.nationalId, employee.hireDate, employee.phone, employee.email,
    ]);
    const csv = [[t("رقم الموظف"), t("الاسم العربي"), t("الاسم بالإنجليزية"), t("الحالة"), t("الفرع"), t("القسم"), t("المسمى الوظيفي"), t("الإدارة"), t("الجنسية"), t("رقم الهوية"), t("تاريخ التعيين"), t("رقم الجوال"), t("البريد الإلكتروني")], ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "employees.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const togglePageSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      pageData.forEach((employee) => allPageSelected ? next.delete(employee.id) : next.add(employee.id));
      return next;
    });
  };

  if (mode === "create") {
    return (
      <EmployeeForm
        mode="create"
        initialData={emptyForm()}
        onBack={() => setMode("list")}
        onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }}
      />
    );
  }

  if (mode === "edit" && selected) {
    return (
      <EmployeeForm
        mode="edit"
        initialData={selected}
        onBack={() => setMode("list")}
        onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }}
      />
    );
  }

  if (mode === "view" && selected) {
    return <EmployeeView employee={selected} onBack={() => setMode("list")} onEdit={() => setMode("edit")} />;
  }

  return (
    <Layout>
      <div dir={direction} className="space-y-4">
        {/* ─── Header bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            {t("قائمة الموظفين")}
          </h1>
          <button
            onClick={() => setMode("create")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow"
          >
            + {t("إضافة موظف جديد")}
          </button>
        </div>

        {/* ─── Table Card ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden" onClick={() => showColumnMenu && setShowColumnMenu(false)}>
          {/* Blue title bar */}
          <div className="bg-blue-700 px-4 py-2.5 flex items-center justify-between text-white">
            <span className="font-semibold text-sm">
              {t("قائمة الموظفين")} — {formatNumber(filtered.length)} {t("موظف")}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={exportCsv} title={t("تصدير CSV")} className="p-1.5 rounded hover:bg-white/20 transition"><Download className="h-4 w-4" /></button>
              <button title={t("طباعة")} className="p-1.5 rounded hover:bg-white/20 transition"><Printer className="h-4 w-4" /></button>
              <button onClick={() => setRefreshKey((k) => k + 1)} title={t("تحديث")} className="p-1.5 rounded hover:bg-white/20 transition"><RefreshCw className="h-4 w-4" /></button>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowColumnMenu((v) => !v); }}
                  title={t("إظهار/إخفاء الأعمدة")}
                  className="p-1.5 rounded hover:bg-white/20 transition"
                >
                  <Columns3 className="h-4 w-4" />
                </button>
                {showColumnMenu && (
                  <div
                    className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 space-y-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs font-semibold text-gray-500 px-2 pb-1">{t("إظهار / إخفاء الأعمدة")}</p>
                    {OPTIONAL_COLUMNS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={visibleColumns[key]}
                          onChange={() => setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className="rounded"
                        />
                        {t(label)}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters row */}
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={t("بحث سريع...")}
                value={fSearch}
                onChange={(e) => setFSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white pe-8 ps-3 py-1.5 text-sm text-start focus:outline-none focus:border-blue-400"
              />
            </div>
            <select
              value={fDepartment}
              onChange={(e) => setFDepartment(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:border-blue-400"
            >
              <option value="">{t("جميع الأقسام")}</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:border-blue-400"
            >
              <option value="">جميع الحالات</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button
              onClick={() => { setFSearch(""); setFDepartment(""); setFStatus(""); }}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-100 transition text-gray-600"
            >
              {t("مسح")}
            </button>
            {selectedIds.size > 0 && (
              <span className="text-xs text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-2 py-1 rounded-md">
                {formatNumber(selectedIds.size)} {t("محدد")}
              </span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs" dir={direction}>
              <thead>
                <tr className="bg-slate-100 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-8 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePageSelection}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الرقم الوظيفي")}</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600 whitespace-nowrap">{t("إجراءات")}</th>
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الاسم")}</th>
                  {visibleColumns.englishName && <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الاسم بالإنجليزية")}</th>}
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الفرع")}</th>
                  {visibleColumns.directorate && <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">الإدارة</th>}
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("القسم")}</th>
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("المسمى الوظيفي")}</th>
                  {visibleColumns.nationality && <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">الجنسية</th>}
                  {visibleColumns.nationalId && <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">رقم الهوية</th>}
                  {visibleColumns.hireDate && <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">تاريخ التعيين</th>}
                  {visibleColumns.phone && <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">رقم الجوال</th>}
                  {visibleColumns.email && <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">البريد الإلكتروني</th>}
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">وضع العمل</th>
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الحالة")}</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={visibleColumnCount + 2} className="py-12 text-center text-gray-400 text-sm">{t("جاري التحميل...")}</td>
                  </tr>
                )}
                {!loading && pageData.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    className={cn(
                      "border-b border-gray-100 transition-colors",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/60",
                      selectedIds.has(emp.id) && "bg-blue-50",
                      "hover:bg-blue-50/70"
                    )}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(emp.id)}
                        onChange={() => setSelectedIds((prev) => {
                          const next = new Set(prev);
                          next.has(emp.id) ? next.delete(emp.id) : next.add(emp.id);
                          return next;
                        })}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-blue-800 font-semibold whitespace-nowrap">
                      {emp.accountTitle || emp.empId || "—"}
                      {emp.accountTitle && emp.empId && emp.accountTitle !== emp.empId && (
                        <span className="text-[10px] text-gray-400 font-normal block">{emp.empId}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => { setSelected(emp); setMode("view"); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title={t("عرض")}><Eye className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { setSelected(emp); setMode("edit"); }} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded" title={t("تعديل")}><Edit className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(emp)} className="p-1 text-rose-600 hover:bg-rose-100 rounded" title={t("حذف")}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{locale === "en" ? emp.firstName || emp.name || "—" : emp.name || emp.firstName || "—"}</td>
                    {visibleColumns.englishName && <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{emp.firstName || "—"}</td>}
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.branch || "—"}</td>
                    {visibleColumns.directorate && <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.directorate || "—"}</td>}
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.department || "—"}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.jobTitle || "—"}</td>
                    {visibleColumns.nationality && <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.nationality || "—"}</td>}
                    {visibleColumns.nationalId && <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap">{emp.nationalId || "—"}</td>}
                    {visibleColumns.hireDate && <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{emp.hireDate || "—"}</td>}
                    {visibleColumns.phone && <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.phone || "—"}</td>}
                    {visibleColumns.email && <td className="px-3 py-2 text-gray-500 whitespace-nowrap max-w-[160px] truncate">{emp.email || "—"}</td>}
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.employmentType || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border", STATUS_COLORS[emp.status] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
                        {emp.status ? t(emp.status) : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumnCount + 2} className="py-14 text-center text-gray-400">{t("لا يوجد موظفون")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer: pagination + page size + count */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span>عرض</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 10)}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>من أصل {filtered.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 text-gray-500">
                {filtered.length > 0 ? `${pageStart + 1} إلى ${Math.min(pageStart + pageSize, filtered.length)} من ${filtered.length}` : "0 نتائج"}
              </span>
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = safePage <= 3 ? i + 1 : safePage + i - 2;
                if (pageNumber < 1 || pageNumber > totalPages) return null;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={cn(
                      "w-6 h-6 rounded border text-[11px] transition",
                      pageNumber === safePage
                        ? "bg-blue-700 text-white border-blue-700 font-bold"
                        : "bg-white border-gray-300 hover:bg-gray-100"
                    )}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">العدد</span>
              <span className="font-bold text-blue-700">{filtered.length}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );

  async function handleDelete(emp: EmpFormData) {
    if (!confirm(`هل تريد حذف الموظف "${emp.name || emp.firstName}"؟`)) return;
    try {
      await supabase.from("employees").delete().eq("id", emp.id);
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      toast({ title: "تم الحذف", description: `تم حذف الموظف ${emp.name || emp.firstName}` });
    } catch {
      toast({ title: "خطأ", description: "فشل حذف الموظف", variant: "destructive" });
    }
  }
}

// ─── Employee View ────────────────────────────────────────────────────────────
function EmployeeView({ employee: emp, onBack, onEdit }: { employee: EmpFormData; onBack: () => void; onEdit: () => void }) {
  return (
    <Layout>
      <div dir="rtl" className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">بيانات الموظف</h1>
          <div className="flex gap-2">
            <button onClick={onBack} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50">
              <ArrowRight className="h-4 w-4" /> رجوع
            </button>
            <button onClick={onEdit} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              <Edit className="h-4 w-4" /> تعديل
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {(emp.name || emp.firstName || "م").charAt(0)}
            </div>
            <div>
              <div className="text-xl font-bold">{emp.name || emp.firstName}</div>
              <div className="text-sm text-gray-500">{emp.empId} | {emp.jobTitle || "—"}</div>
              <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold border mt-1", STATUS_COLORS[emp.status] ?? "bg-gray-100 text-gray-600")}>
                {emp.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <InfoGroup title="المعلومات الشخصية">
              <InfoRow label="الجنسية" value={emp.nationality} />
              <InfoRow label="رقم الهوية" value={emp.nationalId} />
              <InfoRow label="الجنس" value={emp.gender} />
              <InfoRow label="الحالة الاجتماعية" value={emp.maritalStatus} />
              <InfoRow label="الهاتف" value={emp.phone} />
              <InfoRow label="البريد الإلكتروني" value={emp.email} />
            </InfoGroup>
            <InfoGroup title="المعلومات الوظيفية">
              <InfoRow label="القسم" value={emp.department} />
              <InfoRow label="المسمى الوظيفي" value={emp.jobTitle} />
              <InfoRow label="الفرع" value={emp.branch} />
              <InfoRow label="تاريخ التعيين" value={emp.hireDate} />
              <InfoRow label="المدير المباشر" value={emp.directManager} />
              <InfoRow label="جدول العمل" value={emp.workSchedule} />
            </InfoGroup>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-blue-700 font-semibold">الراتب الأساسي</span>
            <span className="text-2xl font-bold text-blue-700">
              {emp.baseSalary.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value || "—"}</span>
    </div>
  );
}
