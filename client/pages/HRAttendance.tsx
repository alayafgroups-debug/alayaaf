import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight, Plus, Edit, Trash2, Save, X, CheckCircle, Eye } from "lucide-react";
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

type AttendanceRecord = {
  id: string;
  empId: string;
  empName: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  lateMinutes: number;
  notes: string;
};

const emptyRecord = (): AttendanceRecord => ({
  id: crypto.randomUUID(),
  empId: "",
  empName: "",
  department: "",
  date: new Date().toISOString().slice(0, 10),
  checkIn: "08:00",
  checkOut: "16:00",
  status: "حاضر",
  lateMinutes: 0,
  notes: "",
});

const mapRow = (r: Record<string, unknown>): AttendanceRecord => ({
  id: String(r.id ?? ""),
  empId: String(r.emp_id ?? ""),
  empName: String(r.emp_name ?? ""),
  department: String(r.department ?? ""),
  date: String(r.date ?? ""),
  checkIn: String(r.check_in ?? ""),
  checkOut: String(r.check_out ?? ""),
  status: String(r.status ?? "حاضر"),
  lateMinutes: Number(r.late_minutes ?? 0),
  notes: String(r.notes ?? ""),
});

const STATUS_COLORS: Record<string, string> = {
  "حاضر": "bg-green-100 text-green-700 border-green-200",
  "غائب": "bg-red-100 text-red-700 border-red-200",
  "متأخر": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "إجازة": "bg-blue-100 text-blue-700 border-blue-200",
  "مأمورية": "bg-purple-100 text-purple-700 border-purple-200",
};

const STATUSES = ["حاضر", "غائب", "متأخر", "إجازة", "مأمورية"];

export default function HRAttendance() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [fDate, setFDate] = useState("");
  const [fSearch, setFSearch] = useState("");
  const [fStatus, setFStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.from("attendance").select("*").order("date", { ascending: false });
        if (!error && data) setRecords(data.map(mapRow));
        else setRecords([]);
      } catch { setRecords([]); }
    };
    load();
  }, [refreshKey]);

  const filtered = records.filter((r) => {
    if (fDate && r.date !== fDate) return false;
    if (fSearch && !r.empName.includes(fSearch) && !r.empId.includes(fSearch)) return false;
    if (fStatus && r.status !== fStatus) return false;
    return true;
  });

  const presentCount = filtered.filter((r) => r.status === "حاضر").length;
  const absentCount = filtered.filter((r) => r.status === "غائب").length;
  const lateCount = filtered.filter((r) => r.status === "متأخر").length;
  const leaveCount = filtered.filter((r) => r.status === "إجازة" || r.status === "مأمورية").length;

  if (mode === "create" || (mode === "edit" && selected))
    return <AttendanceForm mode={mode} record={mode === "edit" ? selected! : undefined}
      onBack={() => setMode("list")} onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }} />;

  const handleDelete = async (rec: AttendanceRecord) => {
    if (!confirm(`حذف سجل حضور "${rec.empName}"؟`)) return;
    try { await supabase.from("attendance").delete().eq("id", rec.id); } catch {}
    setRecords((prev) => prev.filter((r) => r.id !== rec.id));
    toast({ title: "تم الحذف" });
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      "حاضر": "bg-green-500 text-white",
      "غائب": "bg-red-500 text-white",
      "متأخر": "bg-yellow-500 text-white",
      "إجازة": "bg-blue-500 text-white",
      "مأمورية": "bg-purple-500 text-white",
    };
    return colors[status] ?? "bg-slate-500 text-white";
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          icon={Clock}
          title="الحضور والانصراف"
          subtitle="إدارة وتتبع حضور وغياب الموظفين"
          actionLabel="تسجيل حضور جديد"
          onAction={() => setMode("create")}
          gradient="from-sky-600 to-cyan-700"
        />

        <FilterBar>
          <FilterInput placeholder="البحث برقم الموظف أو الاسم..." />
          <FilterSelect label="الحالة">
            <option value="">الكل</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </FilterSelect>
          <FilterActions
            onReset={() => { setFSearch(""); setFDate(""); setFStatus(""); }}
            onSearch={() => {}}
          />
        </FilterBar>

        <DataTable
          headers={["الإجراءات", "ملاحظات", "دقائق التأخر", "الحالة", "وقت الخروج", "وقت الدخول", "التاريخ", "القسم", "الاسم", "رقم الموظف"]}
          gradient="from-sky-800 to-cyan-900"
        >
          {filtered.map((r) => (
            <tr key={r.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 align-middle">
                <div className="flex items-center gap-1">
                  <ActionBtn icon={Edit} label="تعديل" color="emerald" onClick={() => { setSelected(r); setMode("edit"); }} />
                  <ActionBtn icon={Trash2} label="حذف" color="red" onClick={() => handleDelete(r)} />
                </div>
              </td>
              <td className="px-4 py-3 align-middle text-xs max-w-xs truncate">{r.notes || "—"}</td>
              <td className="px-4 py-3 align-middle whitespace-nowrap">
                {r.lateMinutes > 0 ? <span className="text-yellow-600 font-semibold">{r.lateMinutes} د</span> : "—"}
              </td>
              <td className="px-4 py-3 align-middle">
                <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", getStatusColor(r.status))}>
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3 align-middle font-mono whitespace-nowrap">{r.checkOut || "—"}</td>
              <td className="px-4 py-3 align-middle font-mono whitespace-nowrap">{r.checkIn || "—"}</td>
              <td className="px-4 py-3 align-middle text-muted-foreground whitespace-nowrap">{r.date}</td>
              <td className="px-4 py-3 align-middle">{r.department}</td>
              <td className="px-4 py-3 align-middle font-semibold">{r.empName}</td>
              <td className="px-4 py-3 align-middle font-mono text-sky-700 whitespace-nowrap">{r.empId}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                لا يوجد سجلات حضور
              </td>
            </tr>
          )}
        </DataTable>
      </div>
    </Layout>
  );
}

// ─── Attendance Form ──────────────────────────────────────────────────────────
function AttendanceForm({ mode, record, onBack, onSaved }: {
  mode: "create" | "edit";
  record?: AttendanceRecord;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AttendanceRecord>(record ?? emptyRecord());
  const [saving, setSaving] = useState(false);

  const set = (field: keyof AttendanceRecord, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.empName.trim()) { toast({ title: "خطأ", description: "اسم الموظف مطلوب", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { id: form.id, emp_id: form.empId, emp_name: form.empName, department: form.department, date: form.date, check_in: form.checkIn, check_out: form.checkOut, status: form.status, late_minutes: form.lateMinutes, notes: form.notes };
      if (mode === "create") await supabase.from("attendance").insert([payload]);
      else await supabase.from("attendance").update(payload).eq("id", form.id);
    } catch {}
    toast({ title: mode === "create" ? "تم التسجيل" : "تم التعديل" });
    setSaving(false);
    onSaved();
  };

  return (
    <Layout>
      <div dir="rtl" className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-7 w-7 text-green-700" />
            <h1 className="text-2xl font-bold">{mode === "create" ? "تسجيل حضور" : "تعديل سجل الحضور"}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={onBack} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 transition">
              <X className="h-4 w-4" /> إلغاء
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <F label="رقم الموظف" value={form.empId} onChange={(v) => set("empId", v)} placeholder="EMP-0001" />
            <F label="اسم الموظف *" value={form.empName} onChange={(v) => set("empName", v)} placeholder="الاسم الكامل" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="القسم" value={form.department} onChange={(v) => set("department", v)} placeholder="القسم" />
            <F label="التاريخ" value={form.date} onChange={(v) => set("date", v)} type="date" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="وقت الدخول" value={form.checkIn} onChange={(v) => set("checkIn", v)} type="time" />
            <F label="وقت الخروج" value={form.checkOut} onChange={(v) => set("checkOut", v)} type="time" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-600 bg-white">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">دقائق التأخر</label>
              <input type="number" value={form.lateMinutes} onChange={(e) => set("lateMinutes", Number(e.target.value))} min={0} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-600" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-600 resize-none" />
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
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-600" />
    </div>
  );
}
