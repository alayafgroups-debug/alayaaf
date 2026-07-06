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

type ArchiveRow = {
  id: string;
  month: string;
  empName: string;
  department: string;
  basicSalary: number;
  allowances: number;
  overtime: number;
  bonus: number;
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

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير" });
      return;
    }

    const header = [
      "الشهر",
      "الموظف",
      "الإدارة",
      "الراتب الأساسي",
      "البدلات",
      "ساعات إضافية",
      "مكافآت",
      "إجمالي الاستحقاقات",
      "الاستقطاعات",
      "صافي الراتب",
      "الحالة",
      "تاريخ الصرف",
      "ملاحظات",
    ];

    const rows = filtered.map((r) => {
      const entitlements = r.basicSalary + r.allowances + r.overtime + r.bonus;
      return [
        r.month,
        r.empName,
        r.department,
        r.basicSalary.toFixed(2),
        r.allowances.toFixed(2),
        r.overtime.toFixed(2),
        r.bonus.toFixed(2),
        entitlements.toFixed(2),
        r.deductions.toFixed(2),
        r.netSalary.toFixed(2),
        r.status,
        r.paidDate || "-",
        r.notes || "-",
      ];
    });

    const csv = [header, ...rows]
      .map((line) =>
        line
          .map((cell) => {
            const value = String(cell ?? "").replace(/"/g, '""');
            return `"${value}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-archive-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "تم تصدير الملف" });
  };

  const printArchive = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHtml = filtered
      .map((r, idx) => {
        const entitlements = r.basicSalary + r.allowances + r.overtime + r.bonus;
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${r.month}</td>
            <td>${r.empName}</td>
            <td>${r.department}</td>
            <td>${r.basicSalary.toFixed(2)}</td>
            <td>${r.allowances.toFixed(2)}</td>
            <td>${r.overtime.toFixed(2)}</td>
            <td>${r.bonus.toFixed(2)}</td>
            <td>${entitlements.toFixed(2)}</td>
            <td>${r.deductions.toFixed(2)}</td>
            <td>${r.netSalary.toFixed(2)}</td>
            <td>${r.status}</td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>أرشيف الرواتب</title>
        <style>
          body{font-family:Arial,sans-serif;padding:20px;color:#0f172a}
          h1{margin:0 0 12px;font-size:22px}
          table{width:100%;border-collapse:collapse;font-size:12px}
          th,td{border:1px solid #cbd5e1;padding:6px;text-align:center}
          th{background:#f1f5f9}
          .summary{margin-top:10px;font-weight:700}
        </style>
      </head>
      <body>
        <h1>أرشيف الرواتب</h1>
        <table>
          <thead>
            <tr>
              <th>#</th><th>الشهر</th><th>الموظف</th><th>الإدارة</th><th>الأساسي</th><th>البدلات</th>
              <th>إضافي</th><th>مكافآت</th><th>الاستحقاقات</th><th>الاستقطاعات</th><th>الصافي</th><th>الحالة</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="summary">إجمالي صافي الرواتب: ${totalNet.toFixed(2)} ريال</div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const printSingle = (rec: ArchiveRow) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const entitlements = rec.basicSalary + rec.allowances + rec.overtime + rec.bonus;

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>سجل راتب - ${rec.empName}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}
          h2{margin:0 0 14px}
          .row{display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:8px 0}
          .label{color:#64748b}
          .val{font-weight:700}
        </style>
      </head>
      <body>
        <h2>تفاصيل سجل الراتب</h2>
        <div class="row"><span class="label">الموظف</span><span class="val">${rec.empName}</span></div>
        <div class="row"><span class="label">الشهر</span><span class="val">${rec.month}</span></div>
        <div class="row"><span class="label">الإدارة</span><span class="val">${rec.department}</span></div>
        <div class="row"><span class="label">الراتب الأساسي</span><span class="val">${rec.basicSalary.toFixed(2)}</span></div>
        <div class="row"><span class="label">البدلات</span><span class="val">${rec.allowances.toFixed(2)}</span></div>
        <div class="row"><span class="label">الساعات الإضافية</span><span class="val">${rec.overtime.toFixed(2)}</span></div>
        <div class="row"><span class="label">المكافآت</span><span class="val">${rec.bonus.toFixed(2)}</span></div>
        <div class="row"><span class="label">إجمالي الاستحقاقات</span><span class="val">${entitlements.toFixed(2)}</span></div>
        <div class="row"><span class="label">الاستقطاعات</span><span class="val">${rec.deductions.toFixed(2)}</span></div>
        <div class="row"><span class="label">صافي الراتب</span><span class="val">${rec.netSalary.toFixed(2)}</span></div>
        <div class="row"><span class="label">الحالة</span><span class="val">${rec.status}</span></div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

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
                title="تصدير CSV"
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
                  <th className="py-2 px-2 font-medium">الاستقطاعات</th>
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
                    <td colSpan={12} className="py-10 text-slate-400">جاري التحميل...</td>
                  </tr>
                ) : pageData.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-10 text-slate-400">لا توجد سجلات</td>
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
                <Detail label="الاستقطاعات" value={money(selectedRecord.deductions)} />
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
