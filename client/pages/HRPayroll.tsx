import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  ArrowRight,
  Plus,
  Eye,
  Trash2,
  Save,
  X,
  Printer,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import {
  PageHeader,
  FilterBar,
  FilterInput,
  FilterSelect,
  FilterActions,
  DataTable,
  ActionBtn,
} from "@/components/SalesPageUI";

type PayrollEntry = {
  id: string;
  empId: string;
  empName: string;
  department: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
  paidDate: string;
  notes: string;
};

type PayrollRun = {
  runNo: string;
  month: string;
  monthLabel: string;
  employeesCount: number;
  grossTotal: number;
  deductionsTotal: number;
  netTotal: number;
  status: "مدفوعة" | "قيد المعالجة" | "ملغاة";
};

type EmployeeLite = {
  id: string;
  emp_id: string | null;
  name: string;
  department: string | null;
  total_salary: number | null;
  status: string | null;
};

const emptyEntry = (): PayrollEntry => ({
  id: crypto.randomUUID(),
  empId: "",
  empName: "",
  department: "",
  month: new Date().toISOString().slice(0, 7),
  basicSalary: 0,
  allowances: 0,
  deductions: 0,
  netSalary: 0,
  status: "معلق",
  paidDate: "",
  notes: "",
});

const mapRow = (r: Record<string, unknown>): PayrollEntry => ({
  id: String(r.id ?? ""),
  empId: String(r.emp_id ?? ""),
  empName: String(r.emp_name ?? ""),
  department: String(r.department ?? ""),
  month: String(r.month ?? ""),
  basicSalary: Number(r.basic_salary ?? 0),
  allowances: Number(r.allowances ?? 0),
  deductions: Number(r.deductions ?? 0),
  netSalary: Number(r.net_salary ?? 0),
  status: String(r.status ?? "معلق"),
  paidDate: String(r.paid_date ?? ""),
  notes: String(r.notes ?? ""),
});

const RUN_STATUS_COLORS: Record<PayrollRun["status"], string> = {
  "مدفوعة": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "قيد المعالجة": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "ملغاة": "bg-red-100 text-red-700 border-red-200",
};

export default function HRPayroll() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [fMonth, setFMonth] = useState("");
  const [fSearch, setFSearch] = useState("");
  const [fStatus, setFStatus] = useState<"" | PayrollRun["status"]>("");
  const [detailsMonth, setDetailsMonth] = useState("");
  const [generationMonth, setGenerationMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("payroll")
          .select("*")
          .order("month", { ascending: false });
        if (!error && data) setEntries(data.map(mapRow));
        else setEntries([]);
      } catch {
        setEntries([]);
      }
    };
    load();
  }, [refreshKey]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (fMonth && e.month !== fMonth) return false;
      if (fSearch && !e.empName.includes(fSearch) && !e.empId.includes(fSearch)) return false;
      return true;
    });
  }, [entries, fMonth, fSearch]);

  const payrollRuns = useMemo(() => {
    const grouped = new Map<string, PayrollEntry[]>();

    filteredEntries.forEach((entry) => {
      if (!grouped.has(entry.month)) grouped.set(entry.month, []);
      grouped.get(entry.month)!.push(entry);
    });

    const runs = Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, monthEntries], index) => {
        const grossTotal = monthEntries.reduce(
          (sum, e) => sum + e.basicSalary + e.allowances,
          0
        );
        const deductionsTotal = monthEntries.reduce(
          (sum, e) => sum + e.deductions,
          0
        );
        const netTotal = monthEntries.reduce((sum, e) => sum + e.netSalary, 0);

        const statuses = monthEntries.map((e) => e.status);
        const allCanceled = statuses.every((s) => s === "ملغي");
        const allPaid = statuses.every((s) => s === "مدفوع");

        const status: PayrollRun["status"] = allCanceled
          ? "ملغاة"
          : allPaid
            ? "مدفوعة"
            : "قيد المعالجة";

        return {
          runNo: `PAY-${month.replace("-", "")}-${String(index + 1).padStart(2, "0")}`,
          month,
          monthLabel: formatMonthLabel(month),
          employeesCount: monthEntries.length,
          grossTotal,
          deductionsTotal,
          netTotal,
          status,
        };
      });

    if (!fStatus) return runs;
    return runs.filter((run) => run.status === fStatus);
  }, [filteredEntries, fStatus]);

  const detailsEntries = useMemo(
    () => entries.filter((e) => e.month === detailsMonth),
    [entries, detailsMonth]
  );

  const totalNet = payrollRuns.reduce((sum, run) => sum + run.netTotal, 0);
  const paidRunsCount = payrollRuns.filter((run) => run.status === "مدفوعة").length;
  const processingRunsCount = payrollRuns.filter((run) => run.status === "قيد المعالجة").length;

  if (mode === "create") {
    return (
      <PayrollForm
        onBack={() => setMode("list")}
        onSaved={() => {
          setMode("list");
          setRefreshKey((k) => k + 1);
        }}
      />
    );
  }

  const handleMarkRunPaid = async (run: PayrollRun) => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await supabase
        .from("payroll")
        .update({ status: "مدفوع", paid_date: today })
        .eq("month", run.month);
    } catch {}

    setEntries((prev) =>
      prev.map((e) =>
        e.month === run.month ? { ...e, status: "مدفوع", paidDate: today } : e
      )
    );

    toast({ title: "تم اعتماد المسير", description: `تم اعتماد مسير ${run.monthLabel}` });
  };

  const handleDeleteRun = async (run: PayrollRun) => {
    if (!confirm(`حذف مسير الرواتب للفترة ${run.monthLabel}؟`)) return;

    try {
      await supabase.from("payroll").delete().eq("month", run.month);
    } catch {}

    setEntries((prev) => prev.filter((e) => e.month !== run.month));
    if (detailsMonth === run.month) setDetailsMonth("");
    toast({ title: "تم الحذف" });
  };

  const handleGenerateMonthlyRun = async () => {
    if (!generationMonth) {
      toast({ title: "تنبيه", description: "اختر الفترة أولاً", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("id, emp_id, name, department, total_salary, status")
        .eq("status", "نشط");

      if (employeesError) throw employeesError;

      const activeEmployees = (employees ?? []) as EmployeeLite[];
      if (activeEmployees.length === 0) {
        toast({ title: "لا يوجد موظفون", description: "لا يوجد موظفون نشطون لإنشاء المسير" });
        return;
      }

      const { data: existingRows, error: existingError } = await supabase
        .from("payroll")
        .select("emp_id")
        .eq("month", generationMonth);

      if (existingError) throw existingError;

      const existingEmpIds = new Set((existingRows ?? []).map((r) => String(r.emp_id ?? "")).filter(Boolean));

      const newPayload = activeEmployees
        .map((emp) => {
          const empId = String(emp.emp_id ?? "").trim() || String(emp.id);
          const basicSalary = Number(emp.total_salary ?? 0);
          return {
            id: crypto.randomUUID(),
            emp_id: empId,
            emp_name: emp.name,
            department: emp.department ?? "",
            month: generationMonth,
            basic_salary: basicSalary,
            allowances: 0,
            deductions: 0,
            net_salary: basicSalary,
            status: "معلق",
            paid_date: null,
            notes: "تم الإنشاء تلقائياً من مسير الرواتب الشهري",
          };
        })
        .filter((row) => !existingEmpIds.has(String(row.emp_id)));

      if (newPayload.length === 0) {
        toast({ title: "لا يوجد جديد", description: "تم إنشاء هذا المسير مسبقاً لكل الموظفين النشطين" });
        return;
      }

      const { error: insertError } = await supabase.from("payroll").insert(newPayload);
      if (insertError) throw insertError;

      toast({ title: "تم الإنشاء", description: `تم إنشاء ${newPayload.length} سجل رواتب للفترة ${formatMonthLabel(generationMonth)}` });
      setFMonth(generationMonth);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      console.error(e);
      toast({ title: "فشل الإنشاء", description: "تعذر إنشاء المسير التلقائي", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`<html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>مسير الرواتب الشهري</title>
      <style>
      body{font-family:Arial;direction:rtl;padding:20px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:8px;text-align:right}
      th{background:#111827;color:#fff}
      </style></head><body>
      <h2>مسير الرواتب الشهري</h2>
      <table><thead><tr>
      <th>رقم المسير</th><th>الفترة</th><th>عدد الموظفين</th><th>إجمالي الرواتب</th><th>إجمالي الخصومات</th><th>صافي الرواتب</th><th>الحالة</th>
      </tr></thead><tbody>
      ${payrollRuns
        .map(
          (r) => `<tr>
            <td>${r.runNo}</td>
            <td>${r.monthLabel}</td>
            <td>${r.employeesCount}</td>
            <td>${r.grossTotal.toLocaleString()}</td>
            <td>${r.deductionsTotal.toLocaleString()}</td>
            <td>${r.netTotal.toLocaleString()}</td>
            <td>${r.status}</td>
          </tr>`
        )
        .join("")}
      </tbody></table>
      </body></html>`);

    w.document.close();
    w.print();
  };

  return (
    <Layout>
      <div dir="rtl" className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-cyan-600" />
            مسير الرواتب الشهري
          </h1>
          <button
            onClick={() => navigate("/hr/dashboard")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-700 text-white text-sm hover:bg-slate-800 transition"
          >
            <ArrowRight className="h-4 w-4" /> رجوع
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-2 text-sm font-semibold flex items-center justify-between">
            <span>جميع مسيرات الرواتب</span>
            <span className="bg-blue-800 px-2 py-0.5 rounded text-xs">{payrollRuns.length} مسير</span>
          </div>

          <div className="p-3 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={fSearch}
                  onChange={(e) => setFSearch(e.target.value)}
                  placeholder="بحث باسم الموظف أو رقمه"
                  className="w-full pr-9 pl-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <input
                type="month"
                value={fMonth}
                onChange={(e) => setFMonth(e.target.value)}
                className="px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value as "" | PayrollRun["status"])}
                className="px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">كل الحالات</option>
                <option value="مدفوعة">مدفوعة</option>
                <option value="قيد المعالجة">قيد المعالجة</option>
                <option value="ملغاة">ملغاة</option>
              </select>

              <div className="md:col-span-2 flex gap-2">
                <input
                  type="month"
                  value={generationMonth}
                  onChange={(e) => setGenerationMonth(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleGenerateMonthlyRun}
                  disabled={generating}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  {generating ? "جاري الإنشاء..." : "إنشاء تلقائي"}
                </button>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
                >
                  <Printer className="h-4 w-4 inline ml-1" /> طباعة
                </button>
                <button
                  onClick={() => setMode("create")}
                  className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 inline ml-1" /> إضافة
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">رقم المسير</th>
                  <th className="px-3 py-2 font-semibold">الفترة</th>
                  <th className="px-3 py-2 font-semibold">عدد الموظفين</th>
                  <th className="px-3 py-2 font-semibold">إجمالي الرواتب</th>
                  <th className="px-3 py-2 font-semibold">إجمالي الخصومات</th>
                  <th className="px-3 py-2 font-semibold">صافي الرواتب</th>
                  <th className="px-3 py-2 font-semibold">الحالة</th>
                  <th className="px-3 py-2 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {payrollRuns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-gray-400">
                      لا توجد مسيرات رواتب
                    </td>
                  </tr>
                ) : (
                  payrollRuns.map((run, index) => (
                    <tr
                      key={run.runNo}
                      className={cn(
                        "border-b border-gray-100 hover:bg-blue-50 transition",
                        detailsMonth === run.month && "bg-blue-50"
                      )}
                    >
                      <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2 font-mono text-blue-700 font-semibold">{run.runNo}</td>
                      <td className="px-3 py-2">{run.monthLabel}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block bg-cyan-100 text-cyan-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                          {run.employeesCount} موظفين
                        </span>
                      </td>
                      <td className="px-3 py-2 text-blue-700 font-semibold">{run.grossTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-red-500">{run.deductionsTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-emerald-600 font-bold">{run.netTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2">
                        <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-semibold border", RUN_STATUS_COLORS[run.status])}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetailsMonth(detailsMonth === run.month ? "" : run.month)}
                            className="p-1.5 rounded bg-sky-600 text-white hover:bg-sky-700"
                            title="عرض التفاصيل"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {run.status !== "مدفوعة" && (
                            <button
                              onClick={() => handleMarkRunPaid(run)}
                              className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                              title="اعتماد المسير"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRun(run)}
                            className="p-1.5 rounded bg-red-600 text-white hover:bg-red-700"
                            title="حذف المسير"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {payrollRuns.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={6} className="px-3 py-2">الإجمالي</td>
                    <td className="px-3 py-2 text-blue-700">{totalNet.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {detailsMonth && (
          <div className="bg-white rounded-xl border border-gray-200 shadow overflow-hidden">
            <div className="bg-slate-700 text-white px-4 py-2 text-sm font-semibold">
              تفاصيل المسير - {formatMonthLabel(detailsMonth)}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="px-3 py-2">رقم الموظف</th>
                    <th className="px-3 py-2">الاسم</th>
                    <th className="px-3 py-2">القسم</th>
                    <th className="px-3 py-2">الأساسي</th>
                    <th className="px-3 py-2">البدلات</th>
                    <th className="px-3 py-2">الاستقطاعات</th>
                    <th className="px-3 py-2">الصافي</th>
                    <th className="px-3 py-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsEntries.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="px-3 py-2 font-mono text-blue-700">{e.empId}</td>
                      <td className="px-3 py-2">{e.empName}</td>
                      <td className="px-3 py-2">{e.department}</td>
                      <td className="px-3 py-2">{e.basicSalary.toLocaleString()}</td>
                      <td className="px-3 py-2 text-green-600">{e.allowances.toLocaleString()}</td>
                      <td className="px-3 py-2 text-red-500">{e.deductions.toLocaleString()}</td>
                      <td className="px-3 py-2 font-semibold text-emerald-600">{e.netSalary.toLocaleString()}</td>
                      <td className="px-3 py-2">{e.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard color="bg-cyan-500" value={totalNet.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} label="إجمالي الرواتب" />
          <SummaryCard color="bg-amber-500" value={processingRunsCount} label="قيد المعالجة" />
          <SummaryCard color="bg-emerald-600" value={paidRunsCount} label="مسيرات مدفوعة" />
          <SummaryCard color="bg-blue-600" value={payrollRuns.length} label="إجمالي المسيرات" />
        </div>
      </div>
    </Layout>
  );
}

function PayrollForm({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<PayrollEntry>(emptyEntry());
  const [saving, setSaving] = useState(false);

  const set = (field: keyof PayrollEntry, value: string | number) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      updated.netSalary = updated.basicSalary + updated.allowances - updated.deductions;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!form.empName.trim()) {
      toast({ title: "خطأ", description: "اسم الموظف مطلوب", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: form.id,
        emp_id: form.empId,
        emp_name: form.empName,
        department: form.department,
        month: form.month,
        basic_salary: form.basicSalary,
        allowances: form.allowances,
        deductions: form.deductions,
        net_salary: form.netSalary,
        status: form.status,
        paid_date: form.paidDate || null,
        notes: form.notes,
      };
      await supabase.from("payroll").insert([payload]);
    } catch {}

    toast({ title: "تم الإضافة", description: `تمت إضافة راتب ${form.empName}` });
    setSaving(false);
    onSaved();
  };

  return (
    <Layout>
      <div dir="rtl" className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" /> إضافة راتب
          </h1>
          <div className="flex gap-2">
            <button onClick={onBack} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 transition">
              <X className="h-4 w-4" /> إلغاء
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <F label="رقم الموظف" value={form.empId} onChange={(v) => set("empId", v)} placeholder="EMP-0001" />
            <F label="اسم الموظف *" value={form.empName} onChange={(v) => set("empName", v)} placeholder="الاسم الكامل" />
            <F label="القسم" value={form.department} onChange={(v) => set("department", v)} placeholder="القسم" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="الفترة" value={form.month} onChange={(v) => set("month", v)} type="month" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option>معلق</option>
                <option>مدفوع</option>
                <option>ملغي</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumF label="الراتب الأساسي (ر.س)" value={form.basicSalary} onChange={(v) => set("basicSalary", v)} />
            <NumF label="البدلات (ر.س)" value={form.allowances} onChange={(v) => set("allowances", v)} />
            <NumF label="الخصومات (ر.س)" value={form.deductions} onChange={(v) => set("deductions", v)} />
          </div>

          <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-blue-700 font-semibold">صافي الراتب</span>
            <span className="text-2xl font-bold text-blue-700">{form.netSalary.toLocaleString()} ر.س</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SummaryCard({ color, value, label }: { color: string; value: string | number; label: string }) {
  return (
    <div className={cn("rounded-md p-4 text-white text-center shadow", color)}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-90 mt-1">{label}</div>
    </div>
  );
}

function F({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function NumF({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} min={0} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function formatMonthLabel(month: string) {
  const [year, monthNum] = month.split("-");
  const monthNames = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];

  const idx = Number(monthNum) - 1;
  if (idx < 0 || idx > 11) return month;
  return `${monthNames[idx]} ${year}`;
}
