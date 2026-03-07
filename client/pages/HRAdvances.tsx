import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Plus,
  Save,
  X,
  Trash2,
  Eye,
  Wallet,
  Calendar,
  CheckCircle,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import {
  PageHeader,
  FilterBar,
  FilterInput,
  FilterSelect,
  FilterActions,
  DataTable,
  ActionBtn,
} from "@/components/SalesPageUI";

type EmployeeOption = {
  id: string;
  empId: string;
  name: string;
  totalSalary: number;
};

type Advance = {
  id: string;
  loanNo: string;
  empId: string;
  empName: string;
  amount: number;
  monthlyInstallment: number;
  installments: number;
  paidInstallments: number;
  remainingAmount: number;
  requestDate: string;
  startDate: string;
  endDate: string;
  status: string;
  journalEntryNo: string;
  reason: string;
};

type NewAdvanceForm = {
  employeeId: string;
  amount: string;
  installments: string;
  requestDate: string;
  startDate: string;
  reason: string;
};

const emptyForm = (): NewAdvanceForm => ({
  employeeId: "",
  amount: "",
  installments: "1",
  requestDate: new Date().toISOString().slice(0, 10),
  startDate: new Date().toISOString().slice(0, 10),
  reason: "",
});

const mapAdvanceRow = (row: Record<string, unknown>): Advance => {
  const amount = Number(row.amount ?? 0);
  const installments = Number(row.installments ?? 1) || 1;
  const paidInstallments = Number(row.paid_installments ?? 0);
  const monthlyInstallment = Number(row.monthly_installment ?? (amount / installments || 0));
  const remainingAmount = Number(row.remaining_amount ?? amount);
  const statusRaw = String(row.status ?? "معلقة");

  return {
    id: String(row.id ?? ""),
    loanNo: String(row.id ?? "").slice(0, 8).toUpperCase(),
    empId: String(row.emp_id ?? ""),
    empName: String(row.emp_name ?? ""),
    amount,
    monthlyInstallment,
    installments,
    paidInstallments,
    remainingAmount,
    requestDate: String(row.request_date ?? ""),
    startDate: String(row.start_date ?? ""),
    endDate: String(row.end_date ?? ""),
    status: remainingAmount <= 0 ? "مكتملة" : statusRaw,
    journalEntryNo: String(row.journal_entry_no ?? ""),
    reason: String(row.reason ?? row.notes ?? ""),
  };
};

const mapEmployee = (row: Record<string, unknown>): EmployeeOption => ({
  id: String(row.id ?? ""),
  empId: String(row.emp_id ?? ""),
  name: String(row.name ?? ""),
  totalSalary: Number(row.total_salary ?? 0),
});

const statusBadge: Record<string, string> = {
  "معلقة": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "مكتملة": "bg-green-100 text-green-700 border-green-200",
  "ملغاة": "bg-red-100 text-red-700 border-red-200",
};

export default function HRAdvances() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"list" | "create">("list");
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewAdvanceForm>(emptyForm());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Advance | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const monthlyInstallment = useMemo(() => {
    const amount = Number(form.amount || 0);
    const installments = Math.max(1, Number(form.installments || 1));
    return amount > 0 ? amount / installments : 0;
  }, [form.amount, form.installments]);

  const endDate = useMemo(() => {
    if (!form.startDate) return "";
    const start = new Date(form.startDate);
    const installments = Math.max(1, Number(form.installments || 1));
    start.setMonth(start.getMonth() + installments - 1);
    return start.toISOString().slice(0, 10);
  }, [form.startDate, form.installments]);

  const filtered = advances.filter((a) => {
    if (search && !`${a.empName} ${a.empId} ${a.loanNo}`.includes(search)) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    return true;
  });

  const activeCount = advances.filter((a) => a.status === "معلقة").length;
  const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);

  async function loadAll() {
    setLoading(true);
    try {
      const [advRes, empRes] = await Promise.all([
        supabase.from("hr_advances").select("*").order("created_at", { ascending: false }),
        supabase
          .from("employees")
          .select("id, emp_id, name, total_salary")
          .eq("status", "نشط")
          .order("name", { ascending: true }),
      ]);

      if (!advRes.error && advRes.data) {
        setAdvances(advRes.data.map((r) => mapAdvanceRow(r as Record<string, unknown>)));
      } else {
        setAdvances([]);
      }

      if (!empRes.error && empRes.data) {
        setEmployees(empRes.data.map((r) => mapEmployee(r as Record<string, unknown>)));
      } else {
        setEmployees([]);
      }
    } catch {
      setAdvances([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAdvance() {
    if (!form.employeeId) {
      toast({ title: "تنبيه", description: "اختر الموظف", variant: "destructive" });
      return;
    }
    const amount = Number(form.amount || 0);
    if (amount <= 0) {
      toast({ title: "تنبيه", description: "أدخل مبلغ سلفة صحيح", variant: "destructive" });
      return;
    }

    const emp = employees.find((e) => e.id === form.employeeId);
    if (!emp) {
      toast({ title: "خطأ", description: "بيانات الموظف غير متاحة", variant: "destructive" });
      return;
    }

    const installments = Math.max(1, Number(form.installments || 1));
    const monthly = Number((amount / installments).toFixed(2));
    const journal = `JV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;

    setSaving(true);
    try {
      const payload = {
        id: crypto.randomUUID(),
        employee_id: emp.id,
        emp_id: emp.empId,
        emp_name: emp.name,
        amount,
        installments,
        monthly_installment: monthly,
        paid_installments: 0,
        remaining_amount: amount,
        request_date: form.requestDate || null,
        start_date: form.startDate || null,
        end_date: endDate || null,
        status: "معلقة",
        reason: form.reason,
        notes: form.reason,
        journal_entry_no: journal,
      };

      const { error } = await supabase.from("hr_advances").insert([payload]);
      if (error) throw error;

      toast({ title: "تم الحفظ", description: "تم حفظ السلفة بنجاح" });
      setForm(emptyForm());
      setMode("list");
      await loadAll();
    } catch {
      toast({ title: "فشل الحفظ", description: "تعذر حفظ السلفة", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(advance: Advance) {
    if (!confirm(`حذف السلفة ${advance.loanNo}؟`)) return;
    try {
      const { error } = await supabase.from("hr_advances").delete().eq("id", advance.id);
      if (error) throw error;
      setAdvances((prev) => prev.filter((a) => a.id !== advance.id));
      if (selected?.id === advance.id) setSelected(null);
      toast({ title: "تم الحذف" });
    } catch {
      toast({ title: "خطأ", description: "تعذر حذف السلفة", variant: "destructive" });
    }
  }

  async function handlePayInstallment(advance: Advance) {
    if (advance.status !== "معلقة") return;
    const nextPaid = Math.min(advance.installments, advance.paidInstallments + 1);
    const nextRemaining = Math.max(0, Number((advance.amount - nextPaid * advance.monthlyInstallment).toFixed(2)));
    const nextStatus = nextRemaining <= 0 ? "مكتملة" : "معلقة";

    try {
      const { error } = await supabase
        .from("hr_advances")
        .update({
          paid_installments: nextPaid,
          remaining_amount: nextRemaining,
          status: nextStatus,
        })
        .eq("id", advance.id);
      if (error) throw error;

      setAdvances((prev) =>
        prev.map((a) =>
          a.id === advance.id
            ? {
                ...a,
                paidInstallments: nextPaid,
                remainingAmount: nextRemaining,
                status: nextStatus,
              }
            : a
        )
      );

      toast({ title: "تم التحديث", description: "تم تسجيل سداد قسط" });
    } catch {
      toast({ title: "خطأ", description: "تعذر تحديث السلفة", variant: "destructive" });
    }
  }

  if (mode === "create") {
    return (
      <Layout>
        <div dir="rtl" className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Plus className="h-6 w-6 text-blue-600" />
              إضافة سلفة جديدة
            </h1>
            <button
              onClick={() => setMode("list")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-700 text-white text-sm hover:bg-slate-800"
            >
              <ArrowRight className="h-4 w-4" /> رجوع
            </button>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">الموظف *</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{`${e.empId} - ${e.name}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">مبلغ السلفة *</label>
                <input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">عدد الأقساط</label>
                <input
                  type="number"
                  min={1}
                  value={form.installments}
                  onChange={(e) => setForm((f) => ({ ...f, installments: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">القسط الشهري (اقتراح)</label>
                <input
                  value={monthlyInstallment.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-3 py-2 border rounded-md text-sm bg-gray-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1">تاريخ السلفة</label>
                <input
                  type="date"
                  value={form.requestDate}
                  onChange={(e) => setForm((f) => ({ ...f, requestDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">بيان من</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">بيان إلى</label>
                <input
                  type="date"
                  value={endDate}
                  readOnly
                  className="w-full px-3 py-2 border rounded-md text-sm bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">السبب</label>
              <textarea
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md text-sm resize-none"
              />
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleCreateAdvance}
                disabled={saving}
                className="inline-flex items-center gap-1 px-5 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "جاري الحفظ..." : "حفظ السلفة"}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div dir="rtl" className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-6 w-6 text-amber-500" />
            سلف الموظفين
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/hr/dashboard")}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-700 text-white text-sm hover:bg-slate-800"
            >
              <ArrowRight className="h-4 w-4" /> رجوع
            </button>
            <button
              onClick={() => setMode("create")}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> سلفة جديدة
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-2 text-sm font-semibold">قائمة السلف</div>

          <div className="p-3 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث برقم السلفة أو الموظف"
                  className="w-full pr-9 pl-3 py-2 text-sm border rounded-md"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border rounded-md bg-white"
              >
                <option value="">كل الحالات</option>
                <option value="معلقة">معلقة</option>
                <option value="مكتملة">مكتملة</option>
                <option value="ملغاة">ملغاة</option>
              </select>
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                }}
                className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50"
              >
                إعادة ضبط
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="px-3 py-2">رقم السلفة</th>
                  <th className="px-3 py-2">الموظف</th>
                  <th className="px-3 py-2">المبلغ</th>
                  <th className="px-3 py-2">القسط الشهري</th>
                  <th className="px-3 py-2">الأقساط</th>
                  <th className="px-3 py-2">المتبقي</th>
                  <th className="px-3 py-2">تاريخ السلفة</th>
                  <th className="px-3 py-2">الحالة</th>
                  <th className="px-3 py-2">القيد</th>
                  <th className="px-3 py-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-400">جاري التحميل...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-gray-400">لا توجد سلف</td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-pink-700">{a.loanNo}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setSelected(a)}
                          className="text-cyan-700 hover:underline"
                        >
                          {a.empName} / {a.empId}
                        </button>
                      </td>
                      <td className="px-3 py-2">{a.amount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2">{a.monthlyInstallment.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2">{a.paidInstallments}/{a.installments}</td>
                      <td className="px-3 py-2 text-red-600">{a.remainingAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2">{a.requestDate}</td>
                      <td className="px-3 py-2">
                        <span className={cn("px-2 py-0.5 rounded text-xs border font-semibold", statusBadge[a.status] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-white">
                        {a.journalEntryNo ? (
                          <span className="bg-green-700 px-2 py-0.5 rounded">{a.journalEntryNo}</span>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelected(a)}
                            className="p-1.5 rounded bg-cyan-600 text-white hover:bg-cyan-700"
                            title="عرض"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {a.status === "معلقة" && (
                            <button
                              onClick={() => handlePayInstallment(a)}
                              className="p-1.5 rounded bg-amber-500 text-white hover:bg-amber-600"
                              title="سداد قسط"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {a.status === "مكتملة" && (
                            <button className="p-1.5 rounded bg-green-600 text-white" title="مكتملة">
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(a)}
                            className="p-1.5 rounded bg-red-600 text-white hover:bg-red-700"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard title="إجمالي السلف" value={advances.length} color="bg-blue-600" />
          <SummaryCard title="سلف معلقة" value={activeCount} color="bg-amber-500" />
          <SummaryCard title="إجمالي المبالغ" value={totalAdvances.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} color="bg-cyan-500" />
        </div>

        {selected && (
          <div className="bg-white border rounded-lg shadow-sm p-4 relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute left-3 top-3 p-1 rounded bg-gray-100 hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="font-semibold mb-3 text-gray-800">تفاصيل السلفة</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Info label="رقم السلفة" value={selected.loanNo} />
              <Info label="الموظف" value={`${selected.empName} (${selected.empId})`} />
              <Info label="المبلغ" value={selected.amount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} />
              <Info label="القسط الشهري" value={selected.monthlyInstallment.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} />
              <Info label="الأقساط" value={`${selected.paidInstallments}/${selected.installments}`} />
              <Info label="المتبقي" value={selected.remainingAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} />
              <Info label="الفترة" value={`${selected.startDate || "-"} إلى ${selected.endDate || "-"}`} />
              <Info label="القيد" value={selected.journalEntryNo || "-"} />
              <Info label="الحالة" value={selected.status} />
            </div>
            {selected.reason && <p className="mt-3 text-sm text-gray-600">السبب: {selected.reason}</p>}
          </div>
        )}
      </div>
    </Layout>
  );
}

function SummaryCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  return (
    <div className={cn("rounded-md p-4 text-white text-center", color)}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm mt-1 opacity-90">{title}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-md p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-gray-800">{value}</div>
    </div>
  );
}
