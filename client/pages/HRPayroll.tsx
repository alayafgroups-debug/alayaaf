import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  ArrowRight,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Save,
  X,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

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

const STATUS_COLORS: Record<string, string> = {
  "مدفوع": "bg-green-100 text-green-700 border-green-200",
  "معلق": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "ملغي": "bg-red-100 text-red-700 border-red-200",
};

export default function HRPayroll() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [selected, setSelected] = useState<PayrollEntry | null>(null);
  const [fMonth, setFMonth] = useState("");
  const [fSearch, setFSearch] = useState("");
  const [fStatus, setFStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.from("payroll").select("*").order("month", { ascending: false });
        if (!error && data) setEntries(data.map(mapRow));
        else setEntries([]);
      } catch { setEntries([]); }
    };
    load();
  }, [refreshKey]);

  const filtered = entries.filter((e) => {
    if (fMonth && e.month !== fMonth) return false;
    if (fSearch && !e.empName.includes(fSearch) && !e.empId.includes(fSearch)) return false;
    if (fStatus && e.status !== fStatus) return false;
    return true;
  });

  const totalNet = filtered.reduce((s, e) => s + e.netSalary, 0);
  const paidCount = filtered.filter((e) => e.status === "مدفوع").length;
  const pendingCount = filtered.filter((e) => e.status === "معلق").length;

  if (mode === "create" || (mode === "edit" && selected))
    return <PayrollForm mode={mode} entry={mode === "edit" ? selected! : undefined} onBack={() => setMode("list")} onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }} />;

  const handleMarkPaid = async (entry: PayrollEntry) => {
    const today = new Date().toISOString().slice(0, 10);
    try { await supabase.from("payroll").update({ status: "مدفوع", paid_date: today }).eq("id", entry.id); } catch {}
    setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "مدفوع", paidDate: today } : e));
    toast({ title: "تم الدفع", description: `تم تسجيل راتب ${entry.empName} كمدفوع` });
  };

  const handleDelete = async (entry: PayrollEntry) => {
    if (!confirm(`حذف سجل راتب "${entry.empName}"؟`)) return;
    try { await supabase.from("payroll").delete().eq("id", entry.id); } catch {}
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    toast({ title: "تم الحذف" });
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>مسير الرواتب</title>
    <style>body{font-family:Arial;direction:rtl;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:right}th{background:#1d4ed8;color:white}</style></head><body>
    <h2>مسير الرواتب</h2>
    <table><thead><tr><th>رقم الموظف</th><th>الاسم</th><th>القسم</th><th>الشهر</th><th>الراتب الأساسي</th><th>البدلات</th><th>الاستقطاعات</th><th>الصافي</th><th>الحالة</th></tr></thead><tbody>
    ${filtered.map((e) => `<tr><td>${e.empId}</td><td>${e.empName}</td><td>${e.department}</td><td>${e.month}</td><td>${e.basicSalary.toLocaleString()}</td><td>${e.allowances.toLocaleString()}</td><td>${e.deductions.toLocaleString()}</td><td>${e.netSalary.toLocaleString()}</td><td>${e.status}</td></tr>`).join("")}
    </tbody></table><p><strong>الإجمالي: ${totalNet.toLocaleString()} ر.س</strong></p></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <Layout>
      <div dir="rtl" className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-green-600" />
            <h1 className="text-2xl font-bold">مسير الرواتب</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/hr/dashboard")} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 transition">
              <ArrowRight className="h-4 w-4" /> رجوع
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 transition">
              <Printer className="h-4 w-4" /> طباعة
            </button>
            <button onClick={() => setMode("create")} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
              <Plus className="h-4 w-4" /> إدخال راتب
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-700 rounded-xl p-4 text-white text-center shadow">
            <div className="text-2xl font-bold">{totalNet.toLocaleString("ar-SA")} ر.س</div>
            <div className="text-sm opacity-90 mt-1">إجمالي الرواتب</div>
          </div>
          <div className="bg-green-600 rounded-xl p-4 text-white text-center shadow">
            <div className="text-2xl font-bold">{paidCount}</div>
            <div className="text-sm opacity-90 mt-1">تم الصرف</div>
          </div>
          <div className="bg-yellow-500 rounded-xl p-4 text-white text-center shadow">
            <div className="text-2xl font-bold">{pendingCount}</div>
            <div className="text-sm opacity-90 mt-1">معلق</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <input value={fSearch} onChange={(e) => setFSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم" className="w-full pr-9 pl-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <input type="month" value={fMonth} onChange={(e) => setFMonth(e.target.value)} className="px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white">
              <option value="">كل الحالات</option>
              <option>مدفوع</option>
              <option>معلق</option>
              <option>ملغي</option>
            </select>
            <button onClick={() => { setFSearch(""); setFMonth(""); setFStatus(""); }} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition">
              إعادة ضبط
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="bg-green-700 text-white">
                <th className="px-3 py-3 font-semibold">رقم الموظف</th>
                <th className="px-3 py-3 font-semibold">الاسم</th>
                <th className="px-3 py-3 font-semibold">القسم</th>
                <th className="px-3 py-3 font-semibold">الشهر</th>
                <th className="px-3 py-3 font-semibold">الأساسي</th>
                <th className="px-3 py-3 font-semibold">البدلات</th>
                <th className="px-3 py-3 font-semibold">الاستقطاعات</th>
                <th className="px-3 py-3 font-semibold">الصافي</th>
                <th className="px-3 py-3 font-semibold">الحالة</th>
                <th className="px-3 py-3 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-gray-400">لا توجد بيانات</td></tr>
              ) : filtered.map((e, idx) => (
                <tr key={e.id} className={cn("border-b border-gray-100 hover:bg-green-50 transition", idx % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                  <td className="px-3 py-3 font-mono text-green-700 font-semibold">{e.empId}</td>
                  <td className="px-3 py-3 font-medium">{e.empName}</td>
                  <td className="px-3 py-3 text-gray-600 max-w-[130px] truncate">{e.department}</td>
                  <td className="px-3 py-3 text-gray-600">{e.month}</td>
                  <td className="px-3 py-3">{e.basicSalary.toLocaleString()} ر.س</td>
                  <td className="px-3 py-3 text-green-600">+{e.allowances.toLocaleString()}</td>
                  <td className="px-3 py-3 text-red-500">-{e.deductions.toLocaleString()}</td>
                  <td className="px-3 py-3 font-bold text-blue-700">{e.netSalary.toLocaleString()} ر.س</td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold border", STATUS_COLORS[e.status] ?? "bg-gray-100 text-gray-600")}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      {e.status === "معلق" && (
                        <button onClick={() => handleMarkPaid(e)} className="p-1.5 rounded bg-green-500 text-white hover:bg-green-600 transition" title="تسجيل كمدفوع">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => { setSelected(e); setMode("edit"); }} className="p-1.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition" title="تعديل">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(e)} className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600 transition" title="حذف">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-bold text-gray-700 border-t-2">
                  <td colSpan={7} className="px-3 py-3 text-right">الإجمالي</td>
                  <td className="px-3 py-3 text-blue-700">{totalNet.toLocaleString()} ر.س</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </Layout>
  );
}

// ─── Payroll Form ─────────────────────────────────────────────────────────────
function PayrollForm({ mode, entry, onBack, onSaved }: {
  mode: "create" | "edit";
  entry?: PayrollEntry;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PayrollEntry>(entry ?? emptyEntry());
  const [saving, setSaving] = useState(false);

  const set = (field: keyof PayrollEntry, value: string | number) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      updated.netSalary = updated.basicSalary + updated.allowances - updated.deductions;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!form.empName.trim()) { toast({ title: "خطأ", description: "اسم الموظف مطلوب", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { id: form.id, emp_id: form.empId, emp_name: form.empName, department: form.department, month: form.month, basic_salary: form.basicSalary, allowances: form.allowances, deductions: form.deductions, net_salary: form.netSalary, status: form.status, paid_date: form.paidDate || null, notes: form.notes };
      if (mode === "create") await supabase.from("payroll").insert([payload]);
      else await supabase.from("payroll").update(payload).eq("id", form.id);
    } catch {}
    toast({ title: mode === "create" ? "تم الإضافة" : "تم التعديل", description: `راتب ${form.empName}` });
    setSaving(false);
    onSaved();
  };

  return (
    <Layout>
      <div dir="rtl" className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-green-600" />
            <h1 className="text-2xl font-bold">{mode === "create" ? "إدخال راتب جديد" : "تعديل الراتب"}</h1>
          </div>
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
            <F label="الشهر" value={form.month} onChange={(v) => set("month", v)} type="month" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white">
                <option>معلق</option><option>مدفوع</option><option>ملغي</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumF label="الراتب الأساسي (ر.س)" value={form.basicSalary} onChange={(v) => set("basicSalary", v)} />
            <NumF label="البدلات (ر.س)" value={form.allowances} onChange={(v) => set("allowances", v)} />
            <NumF label="الاستقطاعات (ر.س)" value={form.deductions} onChange={(v) => set("deductions", v)} />
          </div>
          <div className="bg-green-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-green-700 font-semibold">صافي الراتب</span>
            <span className="text-2xl font-bold text-green-700">{form.netSalary.toLocaleString()} ر.س</span>
          </div>
          {form.status === "مدفوع" && <F label="تاريخ الصرف" value={form.paidDate} onChange={(v) => set("paidDate", v)} type="date" />}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function F({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" />
    </div>
  );
}

function NumF({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} min={0} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" />
    </div>
  );
}
