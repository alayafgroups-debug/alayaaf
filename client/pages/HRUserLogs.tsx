import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabaseClient";
import {
  FileText,
  Download,
  Printer,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
type LogEntry = {
  id: string;
  user_name: string;
  created_at: string;
  module: string;
  module_label: string;
  operation: string;
  details: string;
};

// ─── Mock data based on the screenshot ───────────────────────────────────────
const MOCK_LOGS: LogEntry[] = [
  { id: "1",  user_name: "فاطمة حمدي سلطاني",  created_at: "2026-03-09 00:07:34", module: "mobile_attendance", module_label: "الحضور عبر الجوال", operation: "set_attendance_data", details: "في تاريخ 07:34 09-03-2026 قام المستخدم 3 بالعملية في موديول الحضور عبر الجوال وقام بـ 1" },
  { id: "2",  user_name: "فاطمة حمدي سلطاني",  created_at: "2026-03-08 19:55:47", module: "mobile_attendance", module_label: "الحضور عبر الجوال", operation: "set_attendance_data", details: "في تاريخ 19:55 08-03-2026 قام المستخدم 3 بالعملية في موديول الحضور عبر الجوال وقام بـ 1" },
  { id: "3",  user_name: "فاطمة حمدي سلطاني",  created_at: "2026-03-07 22:27:55", module: "mobile_attendance", module_label: "الحضور عبر الجوال", operation: "set_attendance_data", details: "في تاريخ 22:27 07-03-2026 قام المستخدم 3 بالعملية في موديول الحضور عبر الجوال وقام بـ 1" },
  { id: "4",  user_name: "فاطمة حمدي سلطاني",  created_at: "2026-03-07 20:14:09", module: "mobile_attendance", module_label: "الحضور عبر الجوال", operation: "set_attendance_data", details: "في تاريخ 20:14 07-03-2026 قام المستخدم 3 بالعملية في موديول الحضور عبر الجوال وقام بـ 1" },
  { id: "5",  user_name: "فاطمة حمدي سلطاني",  created_at: "2026-03-06 01:06:12", module: "mobile_attendance", module_label: "الحضور عبر الجوال", operation: "set_attendance_data", details: "في تاريخ 01:06 06-03-2026 قام المستخدم 3 بالعملية في موديول الحضور عبر الجوال وقام بـ 1" },
  { id: "6",  user_name: "فاطمة حمدي سلطاني",  created_at: "2026-03-06 01:06:09", module: "mobile_dashboard", module_label: "لوحة المعلومات الجوال", operation: "announcements", details: "في تاريخ 01:06 06-03-2026 قام المستخدم 3 بالعملية في موديول لوحة المعلومات الجوال وقام بـ 1" },
  { id: "7",  user_name: "عبدالمجيد شودري",     created_at: "2026-03-05 23:15:30", module: "applications",       module_label: "التطبيقات",              operation: "save_application",    details: "في تاريخ 23:15 05-03-2026 قام المستخدم 1 بالعملية في موديول التطبيقات وقام بـ 1" },
  { id: "8",  user_name: "عبدالمجيد شودري",     created_at: "2026-03-05 22:13:59", module: "applications",       module_label: "التطبيقات",              operation: "save_application",    details: "في تاريخ 22:13 05-03-2026 قام المستخدم 1 بالعملية في موديول التطبيقات وقام بـ 1" },
  { id: "9",  user_name: "عبدالمجيد شودري",     created_at: "2026-03-05 22:10:50", module: "employees",          module_label: "الموظفون",               operation: "update_finance_data",  details: "في تاريخ 22:10 05-03-2026 قام المستخدم 1 بالعملية في موديول الموظفون وقام بـ 1" },
  { id: "10", user_name: "عبدالمجيد شودري",     created_at: "2026-03-05 22:09:53", module: "payroll",            module_label: "كشف الرواتب",            operation: "delete_payroll_archive", details: "في تاريخ 22:09 05-03-2026 قام المستخدم 1 بالعملية في موديول كشف الرواتب وقام بـ 1" },
];

const MODULE_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "mobile_attendance", label: "الحضور عبر الجوال" },
  { value: "mobile_dashboard", label: "لوحة المعلومات الجوال" },
  { value: "applications", label: "التطبيقات" },
  { value: "employees", label: "الموظفون" },
  { value: "payroll", label: "كشف الرواتب" },
];

const PAGE_SIZES = [10, 25, 50, 100];

const MODULE_COLORS: Record<string, string> = {
  mobile_attendance: "bg-blue-100 text-blue-700",
  mobile_dashboard:  "bg-purple-100 text-purple-700",
  applications:      "bg-amber-100 text-amber-700",
  employees:         "bg-emerald-100 text-emerald-700",
  payroll:           "bg-rose-100 text-rose-700",
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HRUserLogs() {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS);
  const [total, setTotal] = useState(3112);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [moduleFilter, setModuleFilter] = useState("");
  const [search, setSearch] = useState("");

  // Filter locally from mock data (will be replaced with real DB later)
  const filtered = logs.filter((l) => {
    if (moduleFilter && l.module !== moduleFilter) return false;
    if (search && !l.user_name.includes(search) && !l.operation.includes(search)) return false;
    return true;
  });

  const totalPages = Math.ceil(total / pageSize);
  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  const pageNumbers = () => {
    const pages: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      pages.push(i);
    }
    return pages;
  };

  const handlePrint = () => window.print();

  const handleExport = () => {
    const headers = ["المستخدم", "التاريخ", "الموديول", "التأثير", "العملية", "التفاصيل"];
    const rows = filtered.map((l) => [l.user_name, l.created_at, l.module_label, `(${l.module})`, l.operation, l.details]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user_logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-full space-y-4" dir="rtl">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-lg font-bold text-gray-800">تقرير سجلات المستخدمين</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} title="تصدير" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={handlePrint} title="طباعة" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
              <Printer className="h-4 w-4" />
            </button>
            <button title="حذف" className="p-2 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-600 hover:text-red-600 transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          {/* Per page */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">عرض</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Module Filter */}
          <select
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
          >
            {MODULE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث باسم المستخدم أو العملية..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pr-9 pl-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">المستخدم</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">التاريخ</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">التأثير</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">الموديول</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">العملية</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr
                    key={log.id}
                    className={cn("border-b border-gray-100 hover:bg-blue-50/30 transition-colors", i % 2 === 0 ? "bg-white" : "bg-gray-50/40")}
                  >
                    {/* User */}
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{log.user_name}</td>

                    {/* Date */}
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">{log.created_at}</td>

                    {/* Module Label (Arabic) */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", MODULE_COLORS[log.module] ?? "bg-gray-100 text-gray-600")}>
                        {log.module_label}
                      </span>
                    </td>

                    {/* Module (technical key) */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs font-mono">
                      ({log.module})
                    </td>

                    {/* Operation */}
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs font-mono">{log.operation}</td>

                    {/* Details */}
                    <td className="px-4 py-3 text-gray-500 text-xs leading-relaxed max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">لا توجد سجلات</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            {/* Records info */}
            <span className="text-xs text-gray-500">
              من {startRecord} إلى {endRecord} من {total.toLocaleString()}
            </span>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition"
              >
                السابق
              </button>

              {pageNumbers().map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-sm font-medium transition",
                    n === page
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border border-gray-200 hover:bg-gray-100 text-gray-600"
                  )}
                >
                  {n}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition"
              >
                التالي
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
