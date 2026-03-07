import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  ArrowRight,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
  UserCheck,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

// ─── Types ──────────────────────────────────────────────────────────────────
type Employee = {
  id: string;
  empId: string;
  name: string;
  nationality: string;
  department: string;
  jobTitle: string;
  branch: string;
  costCenter: string;
  hireDate: string;
  totalSalary: number;
  status: string;
  phone: string;
  email: string;
  nationalId: string;
  notes: string;
};

const emptyEmployee = (): Employee => ({
  id: crypto.randomUUID(),
  empId: "",
  name: "",
  nationality: "",
  department: "",
  jobTitle: "",
  branch: "",
  costCenter: "",
  hireDate: "",
  totalSalary: 0,
  status: "نشط",
  phone: "",
  email: "",
  nationalId: "",
  notes: "",
});

const mapRow = (r: Record<string, unknown>): Employee => ({
  id: String(r.id ?? ""),
  empId: String(r.emp_id ?? ""),
  name: String(r.name ?? ""),
  nationality: String(r.nationality ?? ""),
  department: String(r.department ?? ""),
  jobTitle: String(r.job_title ?? ""),
  branch: String(r.branch ?? ""),
  costCenter: String(r.cost_center ?? ""),
  hireDate: String(r.hire_date ?? ""),
  totalSalary: Number(r.total_salary ?? 0),
  status: String(r.status ?? "نشط"),
  phone: String(r.phone ?? ""),
  email: String(r.email ?? ""),
  nationalId: String(r.national_id ?? ""),
  notes: String(r.notes ?? ""),
});

const NATIONALITIES = ["مصر", "سوريا", "المملكة العربية السعودية", "باكستان", "الهند", "الفلبين", "اليمن", "السودان", "الأردن", "لبنان"];
const DEPARTMENTS = ["قسم الصيانة والتشغيل", "قسم شركة البرمجيات", "قسم المبيعات", "قسم الموارد البشرية", "قسم المحاسبة", "الإدارة العليا"];
const BRANCHES = ["فرع التشغيل والصيانة", "الفرع الرئيسي", "فرع المبيعات"];
const STATUSES = ["نشط", "غير نشط", "إجازة", "منتهي"];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HREmployees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState<"list" | "create" | "edit" | "view">("list");
  const [selected, setSelected] = useState<Employee | null>(null);

  // Filters
  const [fSearch, setFSearch] = useState("");
  const [fNationality, setFNationality] = useState("");
  const [fDepartment, setFDepartment] = useState("");
  const [fBranch, setFBranch] = useState("");
  const [fStatus, setFStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .order("emp_id", { ascending: true });
        if (!error && data) {
          setEmployees(data.map(mapRow));
        } else {
          setEmployees([]);
        }
      } catch {
        setEmployees([]);
      }
    };
    load();
  }, [refreshKey]);

  const filtered = employees.filter((e) => {
    if (fSearch && !e.name.includes(fSearch) && !e.empId.includes(fSearch)) return false;
    if (fNationality && e.nationality !== fNationality) return false;
    if (fDepartment && e.department !== fDepartment) return false;
    if (fBranch && e.branch !== fBranch) return false;
    if (fStatus && e.status !== fStatus) return false;
    return true;
  });

  const totalActive = employees.filter((e) => e.status === "نشط").length;

  if (mode === "create") return <EmployeeForm mode="create" onBack={() => setMode("list")} onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }} />;
  if (mode === "edit" && selected) return <EmployeeForm mode="edit" employee={selected} onBack={() => setMode("list")} onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }} />;
  if (mode === "view" && selected) return <EmployeeView employee={selected} onBack={() => setMode("list")} onEdit={() => setMode("edit")} />;

  return (
    <Layout>
      <div dir="rtl" className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-foreground">
              قائمة الموظفين
              <span className="mr-2 inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white text-sm rounded-full">{employees.length}</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/hr/dashboard")} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
              <ArrowRight className="h-4 w-4" />
              رجوع
            </button>
            <button onClick={() => setMode("create")} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
              <Plus className="h-4 w-4" />
              إضافة موظف
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="إجمالي الموظفين" value={employees.length} color="bg-blue-700" />
          <StatCard label="الموظفين النشطون" value={totalActive} color="bg-green-600" />
          <StatCard label="نتائج البحث الحالية" value={filtered.length} color="bg-indigo-500" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <input value={fSearch} onChange={(e) => setFSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم" className="w-full pr-9 pl-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <select value={fNationality} onChange={(e) => setFNationality(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">اختر الجنسية</option>
              {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={fDepartment} onChange={(e) => setFDepartment(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">اختر القسم</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={fBranch} onChange={(e) => setFBranch(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">اختر الفرع</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">كل الحالات</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => { setFSearch(""); setFNationality(""); setFDepartment(""); setFBranch(""); setFStatus(""); }} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition">
              <Filter className="h-4 w-4" />
              إعادة ضبط
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="px-3 py-3 font-semibold whitespace-nowrap">رقم الموظف</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">الاسم</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">الجنسية</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">القسم</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">الوظيفة</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">الفرع</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">مركز التكلفة</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">تاريخ التعيين</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">الراتب الإجمالي</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">الحالة</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="py-12 text-center text-gray-400">لا توجد بيانات</td></tr>
              ) : (
                filtered.map((emp, idx) => (
                  <tr key={emp.id} className={cn("border-b border-gray-100 hover:bg-blue-50 transition", idx % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                    <td className="px-3 py-3 font-mono text-blue-700 font-semibold">{emp.empId}</td>
                    <td className="px-3 py-3 font-medium text-gray-800">{emp.name}</td>
                    <td className="px-3 py-3 text-gray-600">{emp.nationality}</td>
                    <td className="px-3 py-3 text-gray-600 max-w-[140px] truncate">{emp.department}</td>
                    <td className="px-3 py-3 text-gray-600 max-w-[120px] truncate">{emp.jobTitle || "-"}</td>
                    <td className="px-3 py-3 text-gray-600">{emp.branch || "-"}</td>
                    <td className="px-3 py-3 text-gray-600 font-mono">{emp.costCenter || "-"}</td>
                    <td className="px-3 py-3 text-gray-600">{emp.hireDate}</td>
                    <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {emp.totalSalary.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={emp.status} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelected(emp); setMode("view"); }} className="p-1.5 rounded bg-cyan-500 text-white hover:bg-cyan-600 transition" title="عرض">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { setSelected(emp); setMode("edit"); }} className="p-1.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition" title="تعديل">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(emp)} className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600 transition" title="حذف">
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

        {/* Footer */}
        <div className="text-sm text-gray-500 text-center">
          عرض {filtered.length} من {employees.length} موظف
        </div>
      </div>
    </Layout>
  );

  async function handleDelete(emp: Employee) {
    if (!confirm(`هل تريد حذف الموظف "${emp.name}"؟`)) return;
    try {
      await supabase.from("employees").delete().eq("id", emp.id);
    } catch {}
    setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    toast({ title: "تم الحذف", description: `تم حذف الموظف ${emp.name}` });
  }
}

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "نشط": "bg-green-100 text-green-700 border-green-200",
    "غير نشط": "bg-gray-100 text-gray-600 border-gray-200",
    "إجازة": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "منتهي": "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold border", colors[status] ?? "bg-gray-100 text-gray-600")}>
      {status}
    </span>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn("rounded-xl p-4 text-white flex flex-col items-center gap-1 shadow", color)}>
      <span className="text-3xl font-bold">{value}</span>
      <span className="text-sm opacity-90">{label}</span>
    </div>
  );
}

// ─── Employee Form (Create / Edit) ────────────────────────────────────────────
function EmployeeForm({ mode, employee, onBack, onSaved }: {
  mode: "create" | "edit";
  employee?: Employee;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Employee>(employee ?? emptyEmployee());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof Employee, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("الاسم مطلوب"); return; }
    if (!form.department.trim()) { setError("القسم مطلوب"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        id: form.id,
        emp_id: form.empId,
        name: form.name,
        nationality: form.nationality,
        department: form.department,
        job_title: form.jobTitle,
        branch: form.branch,
        cost_center: form.costCenter,
        hire_date: form.hireDate || null,
        total_salary: form.totalSalary,
        status: form.status,
        phone: form.phone,
        email: form.email,
        national_id: form.nationalId,
        notes: form.notes,
      };
      if (mode === "create") {
        await supabase.from("employees").insert([payload]);
      } else {
        await supabase.from("employees").update(payload).eq("id", form.id);
      }
    } catch {}
    toast({ title: mode === "create" ? "تم الإضافة" : "تم التعديل", description: `تم حفظ بيانات الموظف ${form.name}` });
    setSaving(false);
    onSaved();
  };

  return (
    <Layout>
      <div dir="rtl" className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCheck className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold">{mode === "create" ? "إضافة موظف جديد" : "تعديل بيانات الموظف"}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={onBack} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50 transition">
              <X className="h-4 w-4" />
              إلغاء
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-6">
          {/* Basic Info */}
          <Section title="المعلومات الأساسية">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="رقم الموظف" value={form.empId} onChange={(v) => set("empId", v)} placeholder="EMP-0001" />
              <Field label="الاسم الكامل *" value={form.name} onChange={(v) => set("name", v)} placeholder="اسم الموظف" />
              <SelectField label="الجنسية" value={form.nationality} onChange={(v) => set("nationality", v)} options={NATIONALITIES} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="رقم الهوية الوطنية" value={form.nationalId} onChange={(v) => set("nationalId", v)} placeholder="1234567890" />
              <Field label="رقم الهاتف" value={form.phone} onChange={(v) => set("phone", v)} placeholder="05xxxxxxxx" />
              <Field label="البريد الإلكتروني" value={form.email} onChange={(v) => set("email", v)} placeholder="example@email.com" type="email" />
            </div>
          </Section>

          {/* Job Info */}
          <Section title="المعلومات الوظيفية">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectField label="القسم *" value={form.department} onChange={(v) => set("department", v)} options={DEPARTMENTS} />
              <Field label="المسمى الوظيفي" value={form.jobTitle} onChange={(v) => set("jobTitle", v)} placeholder="مدير، محاسب، مهندس..." />
              <SelectField label="الفرع" value={form.branch} onChange={(v) => set("branch", v)} options={BRANCHES} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="مركز التكلفة" value={form.costCenter} onChange={(v) => set("costCenter", v)} placeholder="0000192101" />
              <Field label="تاريخ التعيين" value={form.hireDate} onChange={(v) => set("hireDate", v)} type="date" />
              <SelectField label="الحالة" value={form.status} onChange={(v) => set("status", v)} options={STATUSES} />
            </div>
          </Section>

          {/* Salary */}
          <Section title="الراتب">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الراتب الإجمالي (ر.س)</label>
                <input
                  type="number"
                  value={form.totalSalary}
                  onChange={(e) => set("totalSalary", Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0.00"
                  min={0}
                />
              </div>
            </div>
          </Section>

          {/* Notes */}
          <Section title="ملاحظات">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="أي ملاحظات إضافية..."
            />
          </Section>
        </div>
      </div>
    </Layout>
  );
}

// ─── Employee View ────────────────────────────────────────────────────────────
function EmployeeView({ employee: emp, onBack, onEdit }: { employee: Employee; onBack: () => void; onEdit: () => void }) {
  return (
    <Layout>
      <div dir="rtl" className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCheck className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold">بيانات الموظف</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={onBack} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 transition">
              <ArrowRight className="h-4 w-4" />
              رجوع
            </button>
            <button onClick={onEdit} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
              <Pencil className="h-4 w-4" />
              تعديل
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-6">
          {/* Employee Header */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {emp.name.charAt(0)}
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{emp.name}</div>
              <div className="text-sm text-gray-500">{emp.empId} | {emp.jobTitle || "—"}</div>
              <StatusBadge status={emp.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoGroup title="المعلومات الشخصية">
              <InfoRow label="الجنسية" value={emp.nationality} />
              <InfoRow label="رقم الهوية" value={emp.nationalId} />
              <InfoRow label="الهاتف" value={emp.phone} />
              <InfoRow label="البريد الإلكتروني" value={emp.email} />
            </InfoGroup>
            <InfoGroup title="المعلومات الوظيفية">
              <InfoRow label="القسم" value={emp.department} />
              <InfoRow label="الوظيفة" value={emp.jobTitle} />
              <InfoRow label="الفرع" value={emp.branch} />
              <InfoRow label="مركز التكلفة" value={emp.costCenter} />
              <InfoRow label="تاريخ التعيين" value={emp.hireDate} />
            </InfoGroup>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-blue-700 font-semibold">الراتب الإجمالي</span>
            <span className="text-2xl font-bold text-blue-700">
              {emp.totalSalary.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
            </span>
          </div>

          {emp.notes && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">ملاحظات</h4>
              <p className="text-sm text-gray-600">{emp.notes}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-800 border-b pb-2 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
        <option value="">اختر...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
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
