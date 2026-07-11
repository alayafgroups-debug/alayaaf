import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import {
  UserX,
  Search,
  Eye,
  Edit,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import EmployeeForm, { mapRowToForm } from "./EmployeeForm";
import type { EmpFormData } from "./EmployeeForm";

// Status values that count as "inactive"
const INACTIVE_STATUSES = ["غير فعال", "غير نشط", "منتهي", "inactive"];

const STATUS_COLORS: Record<string, string> = {
  "غير فعال": "bg-slate-100 text-slate-600 border-slate-200",
  "غير نشط": "bg-slate-100 text-slate-600 border-slate-200",
  "منتهي": "bg-rose-50 text-rose-700 border-rose-200",
  "إجازة": "bg-amber-50 text-amber-700 border-amber-200",
};

export default function HREmployeesInactive() {
  const [employees, setEmployees] = useState<EmpFormData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState<"list" | "edit" | "view">("list");
  const [selected, setSelected] = useState<EmpFormData | null>(null);

  // Filters
  const [fSearch, setFSearch] = useState("");
  const [fStatus, setFStatus] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          toast({ title: "خطأ في تحميل البيانات", description: error.message });
          return;
        }

        if (data) {
          const all = data.map(mapRowToForm);
          // Keep only employees whose status is one of the inactive values
          const inactive = all.filter((e) =>
            INACTIVE_STATUSES.some((s) => e.status === s)
          );
          setEmployees(inactive);
        }
      } catch {
        toast({ title: "خطأ", description: "فشل تحميل بيانات الموظفين" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        const keyword = fSearch.trim().toLowerCase();
        if (
          keyword &&
          ![e.name, e.firstName, e.empId, e.phone, e.email].some((v) =>
            v.toLowerCase().includes(keyword)
          )
        )
          return false;
        if (fStatus && e.status !== fStatus) return false;
        return true;
      }),
    [employees, fSearch, fStatus]
  );

  useEffect(() => {
    setPage(1);
  }, [fSearch, fStatus, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageData = filtered.slice(pageStart, pageStart + pageSize);

  const exportCsv = () => {
    if (!filtered.length) {
      toast({ title: "لا توجد بيانات للتصدير" });
      return;
    }
    const rows = filtered.map((e) => [
      e.empId, e.name, e.firstName, e.status, e.branch,
      e.department, e.jobTitle, e.nationality, e.nationalId,
      e.hireDate, e.phone, e.email,
    ]);
    const csv = [
      ["رقم الموظف", "الاسم العربي", "الاسم الإنجليزي", "الحالة", "الفرع",
       "القسم", "المسمى الوظيفي", "الجنسية", "رقم الهوية",
       "تاريخ التعيين", "الجوال", "البريد الإلكتروني"],
      ...rows,
    ]
      .map((r) =>
        r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "inactive_employees.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Edit / View modes ──────────────────────────────────────────────────────
  if (mode === "edit" && selected) {
    return (
      <EmployeeForm
        mode="edit"
        initialData={selected}
        onBack={() => setMode("list")}
        onSaved={() => {
          setMode("list");
          setRefreshKey((k) => k + 1);
        }}
      />
    );
  }

  if (mode === "view" && selected) {
    return (
      <Layout>
        <div dir="rtl" className="space-y-6 max-w-4xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">بيانات الموظف</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("list")}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
              >
                <ArrowRight className="h-4 w-4" /> رجوع
              </button>
              <button
                onClick={() => setMode("edit")}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" /> تعديل
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="h-16 w-16 rounded-full bg-slate-600 flex items-center justify-center text-white text-2xl font-bold">
                {(selected.name || selected.firstName || "م").charAt(0)}
              </div>
              <div>
                <div className="text-xl font-bold">{selected.name || selected.firstName}</div>
                <div className="text-sm text-gray-500">
                  {selected.empId} | {selected.jobTitle || "—"}
                </div>
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-xs font-semibold border mt-1",
                    STATUS_COLORS[selected.status] ?? "bg-gray-100 text-gray-600 border-gray-200"
                  )}
                >
                  {selected.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <InfoGroup title="المعلومات الشخصية">
                <InfoRow label="الجنسية" value={selected.nationality} />
                <InfoRow label="رقم الهوية" value={selected.nationalId} />
                <InfoRow label="الجنس" value={selected.gender} />
                <InfoRow label="الهاتف" value={selected.phone} />
                <InfoRow label="البريد الإلكتروني" value={selected.email} />
              </InfoGroup>
              <InfoGroup title="المعلومات الوظيفية">
                <InfoRow label="القسم" value={selected.department} />
                <InfoRow label="المسمى الوظيفي" value={selected.jobTitle} />
                <InfoRow label="الفرع" value={selected.branch} />
                <InfoRow label="تاريخ التعيين" value={selected.hireDate} />
                <InfoRow label="المدير المباشر" value={selected.directManager} />
              </InfoGroup>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── List mode ──────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div dir="rtl" className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <UserX className="h-5 w-5 text-slate-600" />
            الموظفون غير الفعالين
          </h1>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 transition"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Title bar */}
          <div className="bg-slate-700 px-4 py-2.5 flex items-center justify-between text-white">
            <span className="font-semibold text-sm">
              الموظفون غير الفعالين — {filtered.length} موظف
            </span>
            <button
              onClick={exportCsv}
              title="تصدير CSV"
              className="p-1.5 rounded hover:bg-white/20 transition"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          {/* Filters */}
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث..."
                value={fSearch}
                onChange={(e) => setFSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white pr-8 pl-3 py-1.5 text-sm text-right focus:outline-none focus:border-slate-400"
              />
            </div>
            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-right focus:outline-none"
            >
              <option value="">جميع الحالات</option>
              {INACTIVE_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => { setFSearch(""); setFStatus(""); }}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-100 transition text-gray-600"
            >
              مسح
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs" dir="rtl">
              <thead>
                <tr className="bg-slate-100 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">الرقم الوظيفي</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">الاسم</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">الفرع</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">القسم</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">المسمى الوظيفي</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">الجنسية</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">رقم الهوية</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">تاريخ التعيين</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">رقم الجوال</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">الحالة</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600 whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-400 text-sm">
                      جاري التحميل...
                    </td>
                  </tr>
                )}
                {!loading &&
                  pageData.map((emp, idx) => (
                    <tr
                      key={emp.id}
                      className={cn(
                        "border-b border-gray-100 hover:bg-slate-50 transition-colors",
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      )}
                    >
                      <td className="px-3 py-2 font-mono text-slate-700 font-semibold whitespace-nowrap">
                        {emp.empId || "—"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                        {emp.name || emp.firstName || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.branch || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.department || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.jobTitle || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.nationality || "—"}</td>
                      <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap">{emp.nationalId || "—"}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{emp.hireDate || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.phone || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                            STATUS_COLORS[emp.status] ?? "bg-gray-100 text-gray-600 border-gray-200"
                          )}
                        >
                          {emp.status || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => { setSelected(emp); setMode("view"); }}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="عرض"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setSelected(emp); setMode("edit"); }}
                            className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                            title="تعديل / تفعيل"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-14 text-center text-gray-400">
                      لا يوجد موظفون غير فعالين
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span>عرض</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 10)}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>من أصل {filtered.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 text-gray-500">
                {filtered.length > 0
                  ? `${pageStart + 1} إلى ${Math.min(pageStart + pageSize, filtered.length)} من ${filtered.length}`
                  : "0 نتائج"}
              </span>
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const n = safePage <= 3 ? i + 1 : safePage + i - 2;
                if (n < 1 || n > totalPages) return null;
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={cn(
                      "w-6 h-6 rounded border text-[11px] transition",
                      n === safePage
                        ? "bg-slate-700 text-white border-slate-700 font-bold"
                        : "bg-white border-gray-300 hover:bg-gray-100"
                    )}
                  >
                    {n}
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
              <span className="font-bold text-slate-700">{filtered.length}</span>
            </div>
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
