import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import {
  Users,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  Settings,
  Filter,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/SalesPageUI";
import EmployeeForm, { emptyForm, mapRowToForm } from "./EmployeeForm";
import type { EmpFormData } from "./EmployeeForm";

// ─── Constants ───────────────────────────────────────────────────────────────
const DEPARTMENTS = ["قسم الصيانة والتشغيل", "قسم شركة البرمجيات", "قسم المبيعات", "قسم الموارد البشرية", "قسم المحاسبة", "الإدارة العليا"];
const STATUSES = ["نشط", "غير نشط", "إجازة", "منتهي"];

const STATUS_COLORS: Record<string, string> = {
  "نشط": "bg-green-100 text-green-700 border-green-200",
  "غير نشط": "bg-gray-100 text-gray-600 border-gray-200",
  "إجازة": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "منتهي": "bg-red-100 text-red-700 border-red-200",
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HREmployees() {
  const [employees, setEmployees] = useState<EmpFormData[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState<"list" | "create" | "edit" | "view">("list");
  const [selected, setSelected] = useState<EmpFormData | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [fSearch, setFSearch] = useState("");
  const [fDepartment, setFDepartment] = useState("");
  const [fStatus, setFStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setEmployees(data.map(mapRowToForm));
        }
      } catch {
        // no-op
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  const filtered = employees.filter((e) => {
    if (fSearch && !e.name.includes(fSearch) && !e.empId.includes(fSearch) && !e.firstName.includes(fSearch)) return false;
    if (fDepartment && e.department !== fDepartment) return false;
    if (fStatus && e.status !== fStatus) return false;
    return true;
  });

  if (mode === "create") {
    return (
      <EmployeeForm
        mode="create"
        initialData={emptyForm()}
        onBack={() => setMode("list")}
        onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }}
      />
    );
  }

  if (mode === "edit" && selected) {
    return (
      <EmployeeForm
        mode="edit"
        initialData={selected}
        onBack={() => setMode("list")}
        onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }}
      />
    );
  }

  if (mode === "view" && selected) {
    return <EmployeeView employee={selected} onBack={() => setMode("list")} onEdit={() => setMode("edit")} />;
  }

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

        {/* Table Card */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 flex items-center justify-between text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <h2 className="font-semibold">قائمة الموظفين ({filtered.length})</h2>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1.5 hover:bg-white/20 rounded-lg transition" title="تصدير"><Download className="h-5 w-5" /></button>
              <button className="p-1.5 hover:bg-white/20 rounded-lg transition" title="إعدادات"><Settings className="h-5 w-5" /></button>
            </div>
          </div>

          {/* Filters */}
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
            <select value={fDepartment} onChange={(e) => setFDepartment(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-right">
              <option value="">جميع الأقسام</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-right">
              <option value="">جميع الحالات</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => { setFSearch(""); setFDepartment(""); setFStatus(""); }} className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition">
              إعادة تعيين
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b border-border/30 bg-muted/40">
                  <th className="px-4 py-3 text-right font-semibold">الإجراءات</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">الراتب الأساسي</th>
                  <th className="px-4 py-3 text-right font-semibold">تاريخ التعيين</th>
                  <th className="px-4 py-3 text-right font-semibold">الفرع</th>
                  <th className="px-4 py-3 text-right font-semibold">المسمى الوظيفي</th>
                  <th className="px-4 py-3 text-right font-semibold">القسم</th>
                  <th className="px-4 py-3 text-right font-semibold">الجنسية</th>
                  <th className="px-4 py-3 text-right font-semibold">الاسم</th>
                  <th className="px-4 py-3 text-right font-semibold">رقم الموظف</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-muted-foreground text-sm">جاري التحميل...</td>
                  </tr>
                )}
                {!loading && filtered.map((emp) => (
                  <tr key={emp.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelected(emp); setMode("view"); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="عرض"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => { setSelected(emp); setMode("edit"); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="تعديل"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(emp)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="حذف"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold border", STATUS_COLORS[emp.status] ?? "bg-gray-100 text-gray-600")}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle font-medium">{emp.baseSalary.toLocaleString()} ر.س</td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{emp.hireDate || "-"}</td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{emp.branch || "-"}</td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{emp.jobTitle || "-"}</td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{emp.department || "-"}</td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{emp.nationality || "-"}</td>
                    <td className="px-4 py-3 align-middle font-semibold">{emp.name || emp.firstName}</td>
                    <td className="px-4 py-3 align-middle font-mono text-emerald-700 font-semibold">{emp.empId || "-"}</td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">لا يوجد موظفون</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );

  async function handleDelete(emp: EmpFormData) {
    if (!confirm(`هل تريد حذف الموظف "${emp.name || emp.firstName}"؟`)) return;
    try {
      await supabase.from("employees").delete().eq("id", emp.id);
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      toast({ title: "تم الحذف", description: `تم حذف الموظف ${emp.name || emp.firstName}` });
    } catch {
      toast({ title: "خطأ", description: "فشل حذف الموظف", variant: "destructive" });
    }
  }
}

// ─── Employee View ────────────────────────────────────────────────────────────
function EmployeeView({ employee: emp, onBack, onEdit }: { employee: EmpFormData; onBack: () => void; onEdit: () => void }) {
  return (
    <Layout>
      <div dir="rtl" className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">بيانات الموظف</h1>
          <div className="flex gap-2">
            <button onClick={onBack} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50">
              <ArrowRight className="h-4 w-4" /> رجوع
            </button>
            <button onClick={onEdit} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              <Edit className="h-4 w-4" /> تعديل
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {(emp.name || emp.firstName || "م").charAt(0)}
            </div>
            <div>
              <div className="text-xl font-bold">{emp.name || emp.firstName}</div>
              <div className="text-sm text-gray-500">{emp.empId} | {emp.jobTitle || "—"}</div>
              <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold border mt-1", STATUS_COLORS[emp.status] ?? "bg-gray-100 text-gray-600")}>
                {emp.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <InfoGroup title="المعلومات الشخصية">
              <InfoRow label="الجنسية" value={emp.nationality} />
              <InfoRow label="رقم الهوية" value={emp.nationalId} />
              <InfoRow label="الجنس" value={emp.gender} />
              <InfoRow label="الحالة الاجتماعية" value={emp.maritalStatus} />
              <InfoRow label="الهاتف" value={emp.phone} />
              <InfoRow label="البريد الإلكتروني" value={emp.email} />
            </InfoGroup>
            <InfoGroup title="المعلومات الوظيفية">
              <InfoRow label="القسم" value={emp.department} />
              <InfoRow label="المسمى الوظيفي" value={emp.jobTitle} />
              <InfoRow label="الفرع" value={emp.branch} />
              <InfoRow label="تاريخ التعيين" value={emp.hireDate} />
              <InfoRow label="المدير المباشر" value={emp.directManager} />
              <InfoRow label="جدول العمل" value={emp.workSchedule} />
            </InfoGroup>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-blue-700 font-semibold">الراتب الأساسي</span>
            <span className="text-2xl font-bold text-blue-700">
              {emp.baseSalary.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
            </span>
          </div>
        </div>
      </div>
    </Layout>
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
