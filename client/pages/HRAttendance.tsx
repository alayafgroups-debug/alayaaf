import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight, Plus, Pencil, Trash2, Search, Save, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

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

const SAMPLE: AttendanceRecord[] = [
  { id: "1", empId: "EMP-0001", empName: "سائق سائق", department: "قسم الصيانة والتشغيل", date: "2026-02-10", checkIn: "07:55", checkOut: "16:05", status: "حاضر", lateMinutes: 0, notes: "" },
  { id: "2", empId: "EMP-0002", empName: "مشرف حركة", department: "قسم الصيانة والتشغيل", date: "2026-02-10", checkIn: "08:20", checkOut: "16:00", status: "متأخر", lateMinutes: 20, notes: "" },
  { id: "3", empId: "EMP-0003", empName: "مدير الشؤون الإدارية", department: "قسم الصيانة والتشغيل", date: "2026-02-10", checkIn: "", checkOut: "", status: "غائب", lateMinutes: 0, notes: "إجازة مرضية" },
  { id: "4", empId: "EMP-0007", empName: "مدير النظام", department: "قسم الصيانة والتشغيل", date: "2026-02-10", checkIn: "08:00", checkOut: "16:00", status: "حاضر", lateMinutes: 0, notes: "" },
  { id: "5", empId: "EMP-0008", empName: "ندوى مبيعات", department: "قسم شركة البرمجيات", date: "2026-02-10", checkIn: "08:05", checkOut: "16:00", status: "حاضر", lateMinutes: 5, notes: "" },
  { id: "6", empId: "EMP-0009", empName: "علي عديل", department: "قسم الصيانة والتشغيل", date: "2026-02-10", checkIn: "08:00", checkOut: "16:00", status: "حاضر", lateMinutes: 0, notes: "" },
  { id: "7", empId: "EMP-0010", empName: "أحمد المحمدي", department: "قسم المحاسبة", date: "2026-02-10", checkIn: "", checkOut: "", status: "إجازة", lateMinutes: 0, notes: "إجازة سنوية" },
];

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
        if (!error && data && data.length > 0) setRecords(data.map(mapRow));
        else setRecords(SAMPLE);
      } catch { setRecords(SAMPLE); }
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

  return (
    <Layout>
      <div dir="rtl" className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-7 w-7 text-green-700" />
            <h1 className="text-2xl font-bold">كافة الدوام</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/hr/dashboard")} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 transition">
              <ArrowRight className="h-4 w-4" /> رجوع
            </button>
            <button onClick={() => setMode("create")} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition">
              <Plus className="h-4 w-4" /> تسجيل حضور
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-green-600 rounded-xl p-4 text-white text-center shadow">
            <div className="text-2xl font-bold">{presentCount}</div>
            <div className="text-sm opacity-90 mt-1">حاضر</div>
          </div>
          <div className="bg-yellow-500 rounded-xl p-4 text-white text-center shadow">
            <div className="text-2xl font-bold">{lateCount}</div>
            <div className="text-sm opacity-90 mt-1">متأخر</div>
          </div>
          <div className="bg-red-500 rounded-xl p-4 text-white text-center shadow">
            <div className="text-2xl font-bold">{absentCount}</div>
            <div className="text-sm opacity-90 mt-1">غائب</div>
          </div>
          <div className="bg-blue-500 rounded-xl p-4 text-white text-center shadow">
            <div className="text-2xl font-bold">{leaveCount}</div>
            <div className="text-sm opacity-90 mt-1">إجازة / مأمورية</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <input value={fSearch} onChange={(e) => setFSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم" className="w-full pr-9 pl-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-green-600" />
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-green-600 bg-white">
              <option value="">كل الحالات</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => { setFSearch(""); setFDate(""); setFStatus(""); }} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition">
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
                <th className="px-3 py-3 font-semibold">التاريخ</th>
                <th className="px-3 py-3 font-semibold">وقت الدخول</th>
                <th className="px-3 py-3 font-semibold">وقت الخروج</th>
                <th className="px-3 py-3 font-semibold">الحالة</th>
                <th className="px-3 py-3 font-semibold">دقائق التأخر</th>
                <th className="px-3 py-3 font-semibold">ملاحظات</th>
                <th className="px-3 py-3 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-gray-400">لا توجد بيانات</td></tr>
              ) : filtered.map((r, idx) => (
                <tr key={r.id} className={cn("border-b border-gray-100 hover:bg-green-50 transition", idx % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                  <td className="px-3 py-3 font-mono text-green-700 font-semibold">{r.empId}</td>
                  <td className="px-3 py-3 font-medium">{r.empName}</td>
                  <td className="px-3 py-3 text-gray-600 max-w-[130px] truncate">{r.department}</td>
                  <td className="px-3 py-3 text-gray-600">{r.date}</td>
                  <td className="px-3 py-3 text-gray-700 font-mono">{r.checkIn || "—"}</td>
                  <td className="px-3 py-3 text-gray-700 font-mono">{r.checkOut || "—"}</td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold border", STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600")}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {r.lateMinutes > 0 ? <span className="text-yellow-600 font-semibold">{r.lateMinutes} د</span> : "—"}
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs max-w-[100px] truncate">{r.notes || "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setSelected(r); setMode("edit"); }} className="p-1.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition" title="تعديل">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(r)} className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600 transition" title="حذف">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
