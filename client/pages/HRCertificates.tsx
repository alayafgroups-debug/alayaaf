import { useEffect, useMemo, useState } from "react";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { ArrowRight, Award, Eye, Plus, Save, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type EmployeeOption = {
  id: string;
  empId: string;
  name: string;
  jobTitle: string;
  hireDate: string;
};

type Certificate = {
  id: string;
  certificateNo: string;
  employeeId: string;
  empId: string;
  empName: string;
  jobTitle: string;
  hireDate: string;
  issueDate: string;
  directedTo: string;
  purpose: string;
  notes: string;
  status: string;
};

type NewCertificateForm = {
  employeeId: string;
  issueDate: string;
  directedTo: string;
  purpose: string;
  notes: string;
};

const CERTIFICATES_STORAGE_KEY = "hr_certificates_local";

const emptyForm = (): NewCertificateForm => ({
  employeeId: "",
  issueDate: new Date().toISOString().slice(0, 10),
  directedTo: "لمن يهمه الأمر",
  purpose: "شهادة خبرة",
  notes: "",
});

const mapEmployee = (row: Record<string, unknown>): EmployeeOption => ({
  id: String(row.id ?? ""),
  empId: String(row.emp_id ?? ""),
  name: String(row.name ?? ""),
  jobTitle: String(row.job_title ?? ""),
  hireDate: String(row.hire_date ?? ""),
});

const mapCertificateRow = (row: Record<string, unknown>): Certificate => {
  const id = String(row.id ?? crypto.randomUUID());
  const issueDate = String(row.issue_date ?? row.created_at ?? "").slice(0, 10);

  return {
    id,
    certificateNo: String(row.certificate_no ?? `CERT-${id.slice(0, 8).toUpperCase()}`),
    employeeId: String(row.employee_id ?? ""),
    empId: String(row.emp_id ?? ""),
    empName: String(row.emp_name ?? ""),
    jobTitle: String(row.job_title ?? ""),
    hireDate: String(row.hire_date ?? ""),
    issueDate,
    directedTo: String(row.directed_to ?? "لمن يهمه الأمر"),
    purpose: String(row.purpose ?? "شهادة خبرة"),
    notes: String(row.notes ?? ""),
    status: String(row.status ?? "معتمدة"),
  };
};

function readLocalCertificates(): Certificate[] {
  try {
    const raw = localStorage.getItem(CERTIFICATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCertificates(certificates: Certificate[]) {
  try {
    localStorage.setItem(CERTIFICATES_STORAGE_KEY, JSON.stringify(certificates));
  } catch {}
}

function mergeCertificates(dbCertificates: Certificate[], localCertificates: Certificate[]) {
  const map = new Map<string, Certificate>();
  dbCertificates.forEach((item) => map.set(item.id, item));
  localCertificates.forEach((item) => map.set(item.id, item));
  return Array.from(map.values()).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
}

export default function HRCertificates() {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [form, setForm] = useState<NewCertificateForm>(emptyForm());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Certificate | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === form.employeeId) ?? null,
    [employees, form.employeeId]
  );

  const filtered = useMemo(
    () =>
      certificates.filter((c) => {
        if (!search) return true;
        return `${c.certificateNo} ${c.empName} ${c.empId}`.includes(search);
      }),
    [certificates, search]
  );

  async function loadAll() {
    setLoading(true);
    const localCertificates = readLocalCertificates();

    const [certResult, empResult] = await Promise.allSettled([
      supabase.from("hr_certificates").select("*").order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select("id, emp_id, name, job_title, hire_date")
        .eq("status", "نشط")
        .order("name", { ascending: true }),
    ]);

    if (certResult.status === "fulfilled" && !certResult.value.error && certResult.value.data) {
      const dbCertificates = certResult.value.data.map((r) => mapCertificateRow(r as Record<string, unknown>));
      const merged = mergeCertificates(dbCertificates, localCertificates);
      setCertificates(merged);
      writeLocalCertificates(merged);
    } else {
      setCertificates(localCertificates);
    }

    if (empResult.status === "fulfilled" && !empResult.value.error && empResult.value.data) {
      setEmployees(empResult.value.data.map((r) => mapEmployee(r as Record<string, unknown>)));
    } else {
      setEmployees([]);
    }

    setLoading(false);
  }

  async function handleCreateCertificate() {
    if (!form.employeeId) {
      toast({ title: "تنبيه", description: "اختر الموظف", variant: "destructive" });
      return;
    }

    const emp = employees.find((e) => e.id === form.employeeId);
    if (!emp) {
      toast({ title: "خطأ", description: "بيانات الموظف غير متاحة", variant: "destructive" });
      return;
    }

    const id = crypto.randomUUID();
    const newCertificate: Certificate = {
      id,
      certificateNo: `CERT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`,
      employeeId: emp.id,
      empId: emp.empId,
      empName: emp.name,
      jobTitle: emp.jobTitle,
      hireDate: emp.hireDate,
      issueDate: form.issueDate,
      directedTo: form.directedTo,
      purpose: form.purpose,
      notes: form.notes,
      status: "معتمدة",
    };

    setSaving(true);
    try {
      const payload = {
        id: newCertificate.id,
        certificate_no: newCertificate.certificateNo,
        employee_id: newCertificate.employeeId,
        emp_id: newCertificate.empId,
        emp_name: newCertificate.empName,
        job_title: newCertificate.jobTitle,
        hire_date: newCertificate.hireDate || null,
        issue_date: newCertificate.issueDate || null,
        directed_to: newCertificate.directedTo,
        purpose: newCertificate.purpose,
        notes: newCertificate.notes,
        status: newCertificate.status,
      };

      const { error } = await supabase.from("hr_certificates").insert([payload]);
      if (error) throw error;

      const next = [newCertificate, ...certificates];
      setCertificates(next);
      writeLocalCertificates(next);
      setMode("list");
      setForm(emptyForm());
      toast({ title: "تم الحفظ", description: "تم إصدار شهادة الخبرة بنجاح" });
    } catch {
      const next = [newCertificate, ...certificates];
      setCertificates(next);
      writeLocalCertificates(next);
      setMode("list");
      setForm(emptyForm());
      toast({ title: "تم الحفظ محليًا", description: "تم حفظ الشهادة محليًا لحين توفر قاعدة البيانات" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(certificate: Certificate) {
    if (!confirm(`حذف الشهادة ${certificate.certificateNo}؟`)) return;

    try {
      await supabase.from("hr_certificates").delete().eq("id", certificate.id);
    } catch {}

    const next = certificates.filter((c) => c.id !== certificate.id);
    setCertificates(next);
    writeLocalCertificates(next);
    if (selected?.id === certificate.id) setSelected(null);
    toast({ title: "تم الحذف" });
  }

  const totalCertificates = certificates.length;

  return (
    <Layout>
      <div dir="rtl" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="h-7 w-7 text-amber-600" />
            <h1 className="text-2xl font-bold text-foreground">شهادات الخبرة</h1>
          </div>

          <div className="flex items-center gap-2">
            {mode === "create" ? (
              <button
                onClick={() => setMode("list")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
              >
                <ArrowRight className="h-4 w-4" />
                رجوع
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode("create");
                  setSelected(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
              >
                <Plus className="h-4 w-4" />
                إصدار شهادة جديدة
              </button>
            )}
          </div>
        </div>

        {mode === "create" ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">بيانات الشهادة</h2>

              <div>
                <label className="text-sm font-medium text-gray-700">الموظف</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">اختر الموظف</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.empId || "بدون رقم"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">تاريخ الإصدار</label>
                  <input
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">موجهة إلى</label>
                  <input
                    value={form.directedTo}
                    onChange={(e) => setForm((prev) => ({ ...prev, directedTo: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="لمن يهمه الأمر"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">الغرض</label>
                <input
                  value={form.purpose}
                  onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="شهادة خبرة"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">ملاحظات إضافية</label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="أي تفاصيل إضافية تظهر داخل الشهادة"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateCertificate}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "جاري الحفظ..." : "حفظ الشهادة"}
                </button>
                <button
                  onClick={() => {
                    setMode("list");
                    setForm(emptyForm());
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-amber-200 shadow-sm p-8">
              <div className="text-center border-b border-dashed border-amber-300 pb-4 mb-6">
                <p className="text-sm text-gray-500">رقم الشهادة</p>
                <p className="font-bold text-gray-800">توليد تلقائي بعد الحفظ</p>
              </div>

              <div className="space-y-4 leading-8 text-gray-700">
                <h3 className="text-center text-2xl font-bold text-amber-700">شهادة خبرة</h3>
                <p className="text-center text-sm">التاريخ: {form.issueDate || "-"}</p>
                <p>
                  تشهد إدارة الشركة بأن الموظف/ة
                  <span className="font-bold mx-1">{selectedEmployee?.name || "................"}</span>
                  رقم الموظف
                  <span className="font-bold mx-1">{selectedEmployee?.empId || "........"}</span>
                  عمل لدينا بمسمى
                  <span className="font-bold mx-1">{selectedEmployee?.jobTitle || "........"}</span>
                  .
                </p>
                <p>
                  وقد منحت هذه الشهادة بناءً على طلبه/طلبها لتقديمها إلى:
                  <span className="font-bold mx-1">{form.directedTo || "........"}</span>
                </p>
                <p>
                  الغرض من الشهادة:
                  <span className="font-bold mx-1">{form.purpose || "........"}</span>
                </p>
                {form.notes ? <p>ملاحظات: {form.notes}</p> : null}
                <p className="pt-8">وتفضلوا بقبول فائق الاحترام.</p>
                <p className="pt-8 text-left">ختم وتوقيع الموارد البشرية</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-sm text-gray-500">إجمالي الشهادات</p>
                <p className="mt-1 text-2xl font-bold text-gray-800">{totalCertificates}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-sm text-gray-500">الشهادات المعتمدة</p>
                <p className="mt-1 text-2xl font-bold text-green-700">
                  {certificates.filter((c) => c.status === "معتمدة").length}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-sm text-gray-500">الموظفون المشمولون</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {new Set(certificates.map((c) => c.empId)).size}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث برقم الشهادة أو الموظف"
                  className="w-full rounded-lg border border-gray-300 pr-10 pl-3 py-2 text-sm"
                />
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-right px-3 py-2 font-semibold">رقم الشهادة</th>
                      <th className="text-right px-3 py-2 font-semibold">الموظف</th>
                      <th className="text-right px-3 py-2 font-semibold">المسمى الوظيفي</th>
                      <th className="text-right px-3 py-2 font-semibold">تاريخ الإصدار</th>
                      <th className="text-right px-3 py-2 font-semibold">الحالة</th>
                      <th className="text-right px-3 py-2 font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                          جاري التحميل...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                          لا توجد شهادات حالياً
                        </td>
                      </tr>
                    ) : (
                      filtered.map((certificate) => (
                        <tr key={certificate.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-medium text-gray-800">{certificate.certificateNo}</td>
                          <td className="px-3 py-2">{certificate.empName} ({certificate.empId || "-"})</td>
                          <td className="px-3 py-2">{certificate.jobTitle || "-"}</td>
                          <td className="px-3 py-2">{certificate.issueDate || "-"}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex px-2 py-1 rounded border text-xs bg-green-100 text-green-700 border-green-200">
                              {certificate.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelected(certificate)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                عرض
                              </button>
                              <button
                                onClick={() => handleDelete(certificate)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                حذف
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

            {selected ? (
              <div className="bg-white rounded-xl border-2 border-amber-200 shadow-sm p-8">
                <div className="flex items-center justify-between border-b border-dashed border-amber-300 pb-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500">رقم الشهادة</p>
                    <p className="font-bold text-gray-800">{selected.certificateNo}</p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-xs hover:bg-gray-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    إغلاق
                  </button>
                </div>

                <div className="space-y-4 leading-8 text-gray-700">
                  <h3 className="text-center text-2xl font-bold text-amber-700">شهادة خبرة</h3>
                  <p className="text-center text-sm">التاريخ: {selected.issueDate || "-"}</p>
                  <p>
                    تشهد إدارة الشركة بأن الموظف/ة
                    <span className="font-bold mx-1">{selected.empName}</span>
                    رقم الموظف
                    <span className="font-bold mx-1">{selected.empId || "-"}</span>
                    عمل لدينا بمسمى
                    <span className="font-bold mx-1">{selected.jobTitle || "-"}</span>
                    .
                  </p>
                  <p>
                    وقد منحت هذه الشهادة بناءً على طلبه/طلبها لتقديمها إلى:
                    <span className="font-bold mx-1">{selected.directedTo || "-"}</span>
                  </p>
                  <p>
                    الغرض من الشهادة:
                    <span className="font-bold mx-1">{selected.purpose || "-"}</span>
                  </p>
                  {selected.notes ? <p>ملاحظات: {selected.notes}</p> : null}
                  <p className="pt-8">وتفضلوا بقبول فائق الاحترام.</p>
                  <p className="pt-8 text-left">ختم وتوقيع الموارد البشرية</p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Layout>
  );
}
