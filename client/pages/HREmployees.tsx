import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  ArrowRight,
  Search,
  Eye,
  Edit,
  Trash2,
  X,
  Save,
  UserCheck,
  FileText,
  Download,
  Settings,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/SalesPageUI";

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
const EMPLOYEES_STORAGE_KEY = "hr_employees_local";

const readLocalEmployees = (): Employee[] => {
  try {
    const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalEmployees = (employees: Employee[]) => {
  try {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
  } catch {}
};

const mergeEmployees = (dbEmployees: Employee[], localEmployees: Employee[]) => {
  const merged = new Map<string, Employee>();
  dbEmployees.forEach((emp) => merged.set(emp.id, emp));
  localEmployees.forEach((emp) => merged.set(emp.id, emp));
  return Array.from(merged.values());
};

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
      const localEmployees = readLocalEmployees();
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .order("emp_id", { ascending: true });

        if (!error && data) {
          setEmployees(mergeEmployees(data.map(mapRow), localEmployees));
        } else {
          setEmployees(localEmployees);
        }
      } catch {
        setEmployees(localEmployees);
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

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      "نشط": "bg-green-500 text-white",
      "غير نشط": "bg-slate-500 text-white",
      "إجازة": "bg-yellow-500 text-white",
      "منتهي": "bg-red-500 text-white",
    };
    return colors[status] ?? "bg-slate-500 text-white";
  };

  if (mode === "create") return <EmployeeForm mode="create" onBack={() => setMode("list")} onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }} />;
  if (mode === "edit" && selected) return <EmployeeForm mode="edit" employee={selected} onBack={() => setMode("list")} onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }} />;
  if (mode === "view" && selected) return <EmployeeView employee={selected} onBack={() => setMode("list")} onEdit={() => setMode("edit")} />;

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          icon={Users}
          title="الموظفون"
          subtitle="إدارة وتتبع جميع الموظفين في المؤسسة"
          actionLabel="إضافة موظف جديد"
          onAction={() => setMode("create")}
          gradient="from-emerald-600 to-green-700"
        />

        {/* Toolbar */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 flex items-center justify-between text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <h2 className="font-semibold">قائمة الموظفين ({filtered.length})</h2>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1.5 hover:bg-white/20 rounded-lg transition" title="بحث">
                <Search className="h-5 w-5" />
              </button>
              <button className="p-1.5 hover:bg-white/20 rounded-lg transition" title="تصفية">
                <Filter className="h-5 w-5" />
              </button>
              <button className="p-1.5 hover:bg-white/20 rounded-lg transition" title="تصدير">
                <Download className="h-5 w-5" />
              </button>
              <button className="p-1.5 hover:bg-white/20 rounded-lg transition" title="إعدادات">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search & Filter Row */}
          <div className="px-5 py-3 border-b border-border/30 flex flex-wrap items-center gap-3" dir="rtl">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="البحث برقم الموظف أو الاسم..."
                value={fSearch}
                onChange={(e) => setFSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pr-9 pl-3 py-2 text-sm text-right"
              />
            </div>
            <select
              value={fDepartment}
              onChange={(e) => setFDepartment(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-right"
            >
              <option value="">جميع الأقسام</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-right"
            >
              <option value="">جميع الحالات</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button
              onClick={() => { setFSearch(""); setFNationality(""); setFDepartment(""); setFBranch(""); setFStatus(""); }}
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition"
            >
              إعادة تعيين
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b border-border/30 bg-muted/40">
                  <th className="px-4 py-3 text-right font-semibold text-foreground w-[100px]">الإجراءات</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">الراتب</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">تاريخ التعيين</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">الفرع</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">الوظيفة</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">القسم</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">الجنسية</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">الاسم</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">رقم الموظف</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelected(emp); setMode("view"); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="عرض">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setSelected(emp); setMode("edit"); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="تعديل">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(emp)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="حذف">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", getStatusColor(emp.status))}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle font-medium whitespace-nowrap">{emp.totalSalary.toLocaleString()}</td>
                    <td className="px-4 py-3 align-middle text-muted-foreground whitespace-nowrap">{emp.hireDate}</td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{emp.branch || "-"}</td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{emp.jobTitle || "-"}</td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{emp.department}</td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{emp.nationality}</td>
                    <td className="px-4 py-3 align-middle font-semibold">{emp.name}</td>
                    <td className="px-4 py-3 align-middle font-mono text-emerald-700 font-semibold whitespace-nowrap">{emp.empId}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="px-4 py-12 text-center text-muted-foreground">
                لا يوجد موظفون
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );

  async function handleDelete(emp: Employee) {
    if (!confirm(`هل تريد حذف الموظف "${emp.name}"؟`)) return;
    try {
      await supabase.from("employees").delete().eq("id", emp.id);
    } catch {}

    setEmployees((prev) => {
      const next = prev.filter((e) => e.id !== emp.id);
      writeLocalEmployees(next);
      return next;
    });

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

// ─── Employee Form (Multi-Step) ──────────────────────────────────────────────
function EmployeeForm({ mode, employee, onBack, onSaved }: {
  mode: "create" | "edit";
  employee?: Employee;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Employee>(employee ?? emptyEmployee());
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof Employee, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const steps = [
    { title: "المعلومات الأساسية", id: "basic" },
    { title: "المعلومات الشخصية", id: "personal" },
    { title: "المعلومات الوظيفية", id: "job" },
    { title: "الراتب والاستحقاقات", id: "salary" },
    { title: "البيانات الإضافية", id: "additional" },
  ];

  const canProceed = () => {
    if (currentStep === 0 && !form.name.trim()) return false;
    if (currentStep === 2 && !form.department.trim()) return false;
    return true;
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("الاسم مطلوب"); return; }
    if (!form.department.trim()) { setError("القسم مطلوب"); return; }

    setSaving(true);
    setError("");

    const localEmployees = readLocalEmployees();
    const localUpdated =
      mode === "create"
        ? [...localEmployees, form]
        : localEmployees.some((e) => e.id === form.id)
          ? localEmployees.map((e) => (e.id === form.id ? form : e))
          : [...localEmployees, form];

    writeLocalEmployees(localUpdated);

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
          <button onClick={onBack} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50 transition">
            <X className="h-4 w-4" />
            إلغاء
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    idx === currentStep
                      ? "bg-blue-600 text-white"
                      : idx < currentStep
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-700"
                  )}
                >
                  {idx < currentStep ? "✓" : idx + 1}
                </button>
                <div className={cn(
                  "h-1 flex-1 mx-2 rounded-full",
                  idx < currentStep ? "bg-green-600" : idx === currentStep ? "bg-blue-600" : "bg-gray-300"
                )} />
              </div>
            ))}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white",
              currentStep === steps.length - 1 ? "bg-green-600" : "bg-gray-200 text-gray-700"
            )}>
              {currentStep === steps.length - 1 ? "✓" : steps.length}
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {steps[currentStep].title}
            </p>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-6">
          {currentStep === 0 && (
            <>
              <Section title="المعلومات الأساسية">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="رقم الموظف" value={form.empId} onChange={(v) => set("empId", v)} placeholder="EMP-0001" />
                  <Field label="الاسم الكامل *" value={form.name} onChange={(v) => set("name", v)} placeholder="اسم الموظف" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField label="الجنسية" value={form.nationality} onChange={(v) => set("nationality", v)} options={NATIONALITIES} />
                  <Field label="رقم الهوية الوطنية" value={form.nationalId} onChange={(v) => set("nationalId", v)} placeholder="1234567890" />
                </div>
              </Section>
            </>
          )}

          {currentStep === 1 && (
            <>
              <Section title="المعلومات الشخصية">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="رقم الهاتف" value={form.phone} onChange={(v) => set("phone", v)} placeholder="05xxxxxxxx" />
                  <Field label="البريد الإلكتروني" value={form.email} onChange={(v) => set("email", v)} placeholder="example@email.com" type="email" />
                </div>
              </Section>
            </>
          )}

          {currentStep === 2 && (
            <>
              <Section title="المعلومات الوظيفية">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField label="القسم *" value={form.department} onChange={(v) => set("department", v)} options={DEPARTMENTS} />
                  <Field label="المسمى الوظيفي" value={form.jobTitle} onChange={(v) => set("jobTitle", v)} placeholder="مدير، محاسب، مهندس..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField label="الفرع" value={form.branch} onChange={(v) => set("branch", v)} options={BRANCHES} />
                  <Field label="مركز التكلفة" value={form.costCenter} onChange={(v) => set("costCenter", v)} placeholder="0000192101" />
                </div>
              </Section>
            </>
          )}

          {currentStep === 3 && (
            <>
              <Section title="الراتب والاستحقاقات">
                <div className="grid grid-cols-1 gap-4">
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
            </>
          )}

          {currentStep === 4 && (
            <>
              <Section title="البيانات الإضافية">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Field label="تاريخ التعيين" value={form.hireDate} onChange={(v) => set("hireDate", v)} type="date" />
                  </div>
                  <div>
                    <SelectField label="الحالة" value={form.status} onChange={(v) => set("status", v)} options={STATUSES} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="أي ملاحظات إضافية..."
                  />
                </div>
              </Section>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </button>

          <div className="text-sm text-gray-600">
            {currentStep + 1} من {steps.length}
          </div>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
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
