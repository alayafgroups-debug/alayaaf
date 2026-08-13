import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import {
  Printer,
  Download,
  Eye,
  FileText,
  XCircle,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { exportReportExcel, printReport, ReportColumn } from "@/lib/reportExport";

type ArchiveRow = {
  id: string;
  month: string;
  empName: string;
  department: string;
  basicSalary: number;
  allowances: number;
  overtime: number;
  bonus: number;
  socialInsurance: number;
  deductions: number;
  netSalary: number;
  status: string;
  paidDate: string;
  notes: string;
};

const money = (value: number) =>
  value.toLocaleString("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseMonthYear = (month: string) => {
  const [year = "", mon = ""] = String(month ?? "").split("-");
  return { year, mon };
};

export default function HRPayrollArchive() {
  const [records, setRecords] = useState<ArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("الكل");
  const [monthFilter, setMonthFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [selectedRecord, setSelectedRecord] = useState<ArchiveRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payroll")
        .select("*")
        .order("month", { ascending: false });

      if (error) {
        toast({ title: "تعذّر تحميل الأرشيف", description: error.message });
      }

      if (data) {
        setRecords(
          data.map((r) => ({
            id: String(r.id ?? ""),
            month: String(r.month ?? ""),
            empName: String(r.emp_name ?? "-"),
            department: String(r.department ?? "-"),
            basicSalary: Number(r.basic_salary ?? 0),
            allowances: Number(r.allowances ?? 0),
            overtime: Number((r as Record<string, unknown>).overtime ?? 0),
            bonus: Number((r as Record<string, unknown>).bonus ?? 0),
            socialInsurance: Number((r as Record<string, unknown>).social_insurance_deduction ?? 0),
            deductions: Number(r.deductions ?? 0),
            netSalary: Number(r.net_salary ?? 0),
            status: String(r.status ?? "معلق"),
            paidDate: String(r.paid_date ?? ""),
            notes: String(r.notes ?? ""),
          }))
        );
      }
    } catch {
      toast({ title: "تعذّر تحميل الأرشيف" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const years = useMemo(() => {
    const unique = new Set(records.map((r) => parseMonthYear(r.month).year).filter(Boolean));
    return ["الكل", ...Array.from(unique).sort((a, b) => Number(b) - Number(a))];
  }, [records]);

  const months = useMemo(() => {
    const unique = new Set(records.map((r) => parseMonthYear(r.month).mon).filter(Boolean));
    return ["الكل", ...Array.from(unique).sort((a, b) => Number(a) - Number(b))];
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const keyword = search.trim();
      const { year, mon } = parseMonthYear(r.month);

      if (
        keyword &&
        !r.empName.includes(keyword) &&
        !r.department.includes(keyword) &&
        !r.id.includes(keyword)
      ) {
        return false;
      }

      if (yearFilter !== "الكل" && year !== yearFilter) return false;
      if (monthFilter !== "الكل" && mon !== monthFilter) return false;
      if (statusFilter !== "الكل" && r.status !== statusFilter) return false;

      return true;
    });
  }, [records, search, yearFilter, monthFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, yearFilter, monthFilter, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageData = filtered.slice(pageStart, pageStart + pageSize);

  const totalNet = filtered.reduce((sum, r) => sum + r.netSalary, 0);
  const archiveColumns: ReportColumn[] = [
    { key: "month", label: "الشهر", width: 14 }, { key: "empName", label: "الموظف", width: 25 },
    { key: "department", label: "الإدارة", width: 20 }, { key: "basic", label: "الراتب الأساسي", width: 16 },
    { key: "allowances", label: "البدلات", width: 14 }, { key: "overtime", label: "إضافي", width: 12 },
    { key: "bonus", label: "مكافآت", width: 12 }, { key: "entitlements", label: "الاستحقاقات", width: 16 },
    { key: "socialInsurance", label: "التأمينات الاجتماعية 9.75%", width: 20 },
    { key: "deductions", label: "إجمالي الاستقطاعات", width: 18 }, { key: "net", label: "صافي الراتب", width: 16 },
    { key: "status", label: "الحالة", width: 12 }, { key: "paidDate", label: "تاريخ الصرف", width: 16 },
  ];
  const toArchiveRow = (record: ArchiveRow) => ({
    month: record.month, empName: record.empName, department: record.department,
    basic: record.basicSalary.toFixed(2), allowances: record.allowances.toFixed(2), overtime: record.overtime.toFixed(2), bonus: record.bonus.toFixed(2),
    entitlements: (record.basicSalary + record.allowances + record.overtime + record.bonus).toFixed(2), socialInsurance: record.socialInsurance.toFixed(2), deductions: record.deductions.toFixed(2), net: record.netSalary.toFixed(2), status: record.status, paidDate: record.paidDate || "-",
  });
  const archiveRows = filtered.map(toArchiveRow);
  const archiveSummary = [{ label: "عدد السجلات", value: filtered.length }, { label: "إجمالي صافي الرواتب", value: `${totalNet.toFixed(2)} ر.س` }];

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير" });
      return;
    }

    exportReportExcel({ title: "أرشيف الرواتب", subtitle: "السجلات المطابقة لخيارات البحث والتصفية", columns: archiveColumns, rows: archiveRows, fileName: `أرشيف-الرواتب-${new Date().toISOString().slice(0, 10)}`, summary: archiveSummary });
    toast({ title: "تم تصدير ملف Excel" });
  };

  const printArchive = () => {
    if (archiveRows.length === 0) return;
    printReport({ title: "أرشيف الرواتب", subtitle: "السجلات المطابقة لخيارات البحث والتصفية", columns: archiveColumns, rows: archiveRows, fileName: "payroll-archive", landscape: true, summary: archiveSummary });
  };

  const printSingle = (rec: ArchiveRow) => printReport({ title: `سجل راتب — ${rec.empName}`, subtitle: `تفاصيل راتب شهر ${rec.month}`, columns: archiveColumns, rows: [toArchiveRow(rec)], fileName: `payroll-${rec.month}`, landscape: true, summary: [{ label: "صافي الراتب", value: `${rec.netSalary.toFixed(2)} ر.س` }] });

  const handleDelete = async (rec: ArchiveRow) => {
    if (!confirm(`حذف سجل ${rec.empName}؟`)) return;

    const { error } = await supabase.from("payroll").delete().eq("id", rec.id);
    if (error) {
      toast({ title: "تعذر الحذف", description: error.message });
      return;
    }

    setRecords((prev) => prev.filter((r) => r.id !== rec.id));
    toast({ title: "تم الحذف" });
  };

  return (
    <Layout>
      <div className="p-6 max-w-full mx-auto space-y-4" dir="rtl">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-[#0a5a92] text-white p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold">أرشيف الرواتب</h2>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="h-8 rounded border-0 text-black text-sm px-2"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y === "الكل" ? "السنة: الكل" : y}</option>
                ))}
              </select>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="h-8 rounded border-0 text-black text-sm px-2"
              >
                {months.map((m) => (
                  <option key={m} value={m}>{m === "الكل" ? "الشهر: الكل" : m}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded border-0 text-black text-sm px-2"
              >
                {["الكل", "مدفوع", "معلق", "ملغي"].map((s) => (
                  <option key={s} value={s}>الحالة: {s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                className="p-1.5 hover:bg-white/15 rounded"
                title="تحديث"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={printArchive}
                className="p-1.5 hover:bg-white/15 rounded"
                title="طباعة"
              >
                <Printer className="h-4 w-4" />
              </button>
              <button
                onClick={exportCsv}
                className="p-1.5 hover:bg-white/15 rounded"
                title="تصدير Excel"
              >
                <Download className="h-4 w-4" />
              </button>
              <span className="bg-white rounded px-2 py-1 text-black text-sm font-semibold">
                {filtered.length}
              </span>
            </div>
          </div>

          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-3 flex-wrap">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم / الإدارة / رقم السجل"
              className="h-9 w-80 max-w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
            />

            <div className="mr-auto flex items-center gap-2 text-sm text-slate-600">
              <span>عدد السجلات في الصفحة</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 10)}
                className="h-8 rounded border border-slate-300 bg-white px-2"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center whitespace-nowrap min-w-[1500px]">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2 font-medium">الإجراءات</th>
                  <th className="py-2 px-2 font-medium">الحالة</th>
                  <th className="py-2 px-2 font-medium">صافي الراتب</th>
                  <th className="py-2 px-2 font-medium">إجمالي الاستقطاعات</th>
                  <th className="py-2 px-2 font-medium">التأمينات الاجتماعية 9.75%</th>
                  <th className="py-2 px-2 font-medium">إجمالي الاستحقاقات</th>
                  <th className="py-2 px-2 font-medium">مكافآت</th>
                  <th className="py-2 px-2 font-medium">ساعات إضافية</th>
                  <th className="py-2 px-2 font-medium">البدلات</th>
                  <th className="py-2 px-2 font-medium">الراتب الأساسي</th>
                  <th className="py-2 px-2 font-medium">الإدارة</th>
                  <th className="py-2 px-2 font-medium">الاسم</th>
                  <th className="py-2 px-2 font-medium">الشهر</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="py-10 text-slate-400">جاري التحميل...</td>
                  </tr>
                ) : pageData.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-10 text-slate-400">لا توجد سجلات</td>
                  </tr>
                ) : (
                  pageData.map((rec) => {
                    const entitlements = rec.basicSalary + rec.allowances + rec.overtime + rec.bonus;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedRecord(rec)}
                              className="text-slate-500 hover:text-[#0a5a92]"
                              title="عرض"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => printSingle(rec)}
                              className="text-slate-500 hover:text-indigo-600"
                              title="طباعة السجل"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(rec)}
                              className="text-red-400 hover:text-red-600"
                              title="حذف"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </td>

                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              rec.status === "مدفوع"
                                ? "bg-green-100 text-green-700"
                                : rec.status === "ملغي"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>

                        <td className="py-2 px-2 font-semibold text-green-700">{money(rec.netSalary)}</td>
                        <td className="py-2 px-2 font-semibold text-red-600">{money(rec.deductions)}</td>
                        <td className="py-2 px-2 font-semibold text-orange-600">{money(rec.socialInsurance)}</td>
                        <td className="py-2 px-2 font-semibold text-[#0a5a92]">{money(entitlements)}</td>
                        <td className="py-2 px-2">{money(rec.bonus)}</td>
                        <td className="py-2 px-2">{money(rec.overtime)}</td>
                        <td className="py-2 px-2">{money(rec.allowances)}</td>
                        <td className="py-2 px-2">{money(rec.basicSalary)}</td>
                        <td className="py-2 px-2 text-slate-700">{rec.department}</td>
                        <td className="py-2 px-2 font-medium">{rec.empName}</td>
                        <td className="py-2 px-2 text-slate-600">{rec.month}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm">
            <div className="text-slate-600">
              عرض {filtered.length === 0 ? 0 : pageStart + 1} - {Math.min(pageStart + pageSize, filtered.length)} من {filtered.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-8 w-8 rounded border border-slate-300 bg-white disabled:opacity-40 flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="px-2 py-1 rounded bg-white border border-slate-300 min-w-[70px] text-center">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-8 w-8 rounded border border-slate-300 bg-white disabled:opacity-40 flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="font-semibold text-slate-800">
              إجمالي صافي الرواتب: {money(totalNet)}
            </div>
          </div>
        </div>

        {selectedRecord && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-sm"
                >
                  إغلاق
                </button>
                <h3 className="font-bold">تفاصيل سجل الراتب</h3>
                <button
                  onClick={() => printSingle(selectedRecord)}
                  className="px-3 py-1.5 rounded bg-[#0a5a92] text-white text-sm flex items-center gap-1"
                >
                  <FileText className="h-4 w-4" /> طباعة
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Detail label="الاسم" value={selectedRecord.empName} />
                <Detail label="الشهر" value={selectedRecord.month} />
                <Detail label="الإدارة" value={selectedRecord.department} />
                <Detail label="الراتب الأساسي" value={money(selectedRecord.basicSalary)} />
                <Detail label="البدلات" value={money(selectedRecord.allowances)} />
                <Detail label="ساعات إضافية" value={money(selectedRecord.overtime)} />
                <Detail label="مكافآت" value={money(selectedRecord.bonus)} />
                <Detail
                  label="إجمالي الاستحقاقات"
                  value={money(
                    selectedRecord.basicSalary +
                      selectedRecord.allowances +
                      selectedRecord.overtime +
                      selectedRecord.bonus
                  )}
                />
                <Detail label="التأمينات الاجتماعية 9.75%" value={money(selectedRecord.socialInsurance)} />
                <Detail label="إجمالي الاستقطاعات" value={money(selectedRecord.deductions)} />
                <Detail label="صافي الراتب" value={money(selectedRecord.netSalary)} />
                <Detail label="الحالة" value={selectedRecord.status} />
                <Detail label="تاريخ الصرف" value={selectedRecord.paidDate || "-"} />
                <div className="md:col-span-2">
                  <div className="text-xs text-slate-500 mb-1">ملاحظات</div>
                  <div className="rounded border border-slate-200 bg-slate-50 p-2 min-h-[52px]">
                    {selectedRecord.notes || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2 font-medium">{value}</div>
    </div>
  );
}
