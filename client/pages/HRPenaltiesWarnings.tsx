import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { ArrowRight, Eye, FileText, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type Employee = {
  id: string;
  empId: string;
  name: string;
  department: string;
};

type Warning = {
  id: string;
  empId: string;
  empName: string;
  department: string;
  date: string;
  subject: string;
  message: string;
  senderName: string;
  status: string;
  sentAt: string;
};

const getLocalDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const initialForm = {
  employeeId: "",
  subject: "",
  date: getLocalDate(),
  message: "السلام عليكم ورحمة الله وبركاته\nنحيطكم علماً بضرورة الالتزام بأنظمة وتعليمات العمل، ونأمل عدم تكرار المخالفة مستقبلاً.",
};

export default function HRPenaltiesWarnings() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyPreview, setHistoryPreview] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [employeesResult, warningsResult] = await Promise.all([
        supabase.from("employees").select("id, emp_id, name, department, status").order("name"),
        supabase.from("penalty_warnings").select("*").order("sent_at", { ascending: false }),
      ]);

      if (employeesResult.error) throw employeesResult.error;
      if (warningsResult.error) throw warningsResult.error;

      const employeeRows: Employee[] = (employeesResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        empId: String(row.emp_id ?? row.id),
        name: String(row.name ?? ""),
        department: String(row.department ?? ""),
      }));

      setEmployees(employeeRows);
      setWarnings(
        (warningsResult.data ?? []).map((row: any) => ({
          id: String(row.id),
          empId: String(row.emp_id ?? ""),
          empName: String(row.emp_name ?? ""),
          department: employeeRows.find((employee) => employee.empId === String(row.emp_id))?.department ?? "",
          date: String(row.warning_date ?? ""),
          subject: String(row.subject ?? ""),
          message: String(row.message ?? ""),
          senderName: String(row.sender_name ?? "الإدارة"),
          status: String(row.status ?? "مرسل"),
          sentAt: String(row.sent_at ?? ""),
        }))
      );
    } catch (error) {
      toast({
        title: "تعذر تحميل الإنذارات",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedEmployee = employees.find((employee) => employee.id === form.employeeId);

  const validateForm = () => {
    if (!selectedEmployee || !form.subject.trim() || !form.date || !form.message.trim()) {
      toast({ title: "أكمل الحقول المطلوبة", description: "الموظف والموضوع والتاريخ ونص الإنذار مطلوبة", variant: "destructive" });
      return false;
    }
    return true;
  };

  const openFormPreview = () => {
    if (!validateForm()) return;
    setHistoryPreview(false);
    setPreviewOpen(true);
  };

  const handleSave = async () => {
    if (!validateForm() || !selectedEmployee) return;

    setSaving(true);
    try {
      const session = JSON.parse(localStorage.getItem("user_session") || "{}");
      const { error } = await supabase.from("penalty_warnings").insert({
        emp_id: selectedEmployee.empId,
        emp_name: selectedEmployee.name,
        employee_record_id: selectedEmployee.id,
        warning_date: form.date,
        subject: form.subject.trim(),
        message: form.message.trim(),
        sender_name: session.name || "الإدارة",
        status: "مرسل",
      });
      if (error) throw error;

      toast({ title: "تم إرسال الإنذار", description: `تم إرسال الإنذار إلى ${selectedEmployee.name}` });
      setForm({ ...initialForm, date: getLocalDate() });
      setPreviewOpen(false);
      setShowForm(false);
      await loadData();
    } catch (error) {
      toast({
        title: "تعذر إرسال الإنذار",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const keyword = search.trim();
    if (!keyword) return warnings;
    return warnings.filter((warning) =>
      [warning.empName, warning.department, warning.subject, warning.message, warning.senderName, warning.status]
        .some((value) => value.includes(keyword))
    );
  }, [warnings, search]);

  const showSavedWarning = (warning: Warning) => {
    const employee = employees.find((row) => row.empId === warning.empId);
    setForm({
      employeeId: employee?.id ?? "",
      subject: warning.subject,
      date: warning.date,
      message: warning.message,
    });
    setHistoryPreview(true);
    setPreviewOpen(true);
  };

  return (
    <Layout>
      <div className="w-full p-4 space-y-5" dir="rtl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">الإنذارات</h1>
            <p className="mt-1 text-sm text-gray-500">إنشاء إنذار رسمي وإرساله مباشرة إلى لوحة الموظف</p>
          </div>
          <Button onClick={() => setShowForm((current) => !current)} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
            {showForm ? <X className="h-4 w-4 ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
            {showForm ? "إغلاق النموذج" : "إرسال إنذار"}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="font-bold text-gray-900">إرسال إنذار</h2>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}><ArrowRight className="h-4 w-4 ml-1" /> عودة</Button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="اسم الموظف" required>
                  <select
                    value={form.employeeId}
                    onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#004e89]"
                  >
                    <option value="">اختر الموظف</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                  </select>
                </Field>

                <Field label="الموضوع" required>
                  <Input
                    value={form.subject}
                    onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                    placeholder="اكتب موضوع الإنذار"
                  />
                </Field>

                <Field label="التاريخ" required>
                  <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
                </Field>

                <div className="md:col-span-2">
                  <Field label="النص" required>
                    <textarea
                      value={form.message}
                      onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                      rows={6}
                      className="w-full resize-y rounded-md border border-gray-300 px-3 py-3 text-sm leading-7 outline-none focus:ring-2 focus:ring-[#004e89]"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <Button variant="outline" onClick={openFormPreview}><Eye className="h-4 w-4 ml-2" /> معاينة</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                  {saving ? "جاري الإرسال..." : "حفظ وإرسال"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-gray-100 p-4">
            <h2 className="font-bold text-gray-900">سجل الإنذارات ({filtered.length})</h2>
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث في الإنذارات" className="pr-9" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm text-right">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">اسم الموظف</th>
                  <th className="py-3 px-4">الإدارة</th>
                  <th className="py-3 px-4">المرسل</th>
                  <th className="py-3 px-4">الموضوع</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">عرض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-500"><FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />لا توجد إنذارات مرسلة</td></tr>
                ) : filtered.map((warning) => (
                  <tr key={warning.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">{warning.date}</td>
                    <td className="py-3 px-4 font-medium">{warning.empName}</td>
                    <td className="py-3 px-4">{warning.department || "—"}</td>
                    <td className="py-3 px-4">{warning.senderName}</td>
                    <td className="py-3 px-4">{warning.subject}</td>
                    <td className="py-3 px-4"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">{warning.status}</span></td>
                    <td className="py-3 px-4 text-center">
                      <button type="button" onClick={() => showSavedWarning(warning)} className="text-[#004e89] hover:text-[#003d6d]" aria-label={`عرض إنذار ${warning.empName}`}>
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {previewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
            <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h3 className="text-xl font-bold text-gray-900">معاينة الإنذار</h3>
                <button type="button" onClick={() => setPreviewOpen(false)} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="border-b border-gray-100 pb-4 text-center">
                  <h4 className="text-2xl font-bold text-[#004e89]">إنذار إداري</h4>
                  <p className="mt-1 text-sm text-gray-500">التاريخ: {form.date}</p>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 mb-1">الموظف</span>
                  <span className="font-medium text-gray-900">{selectedEmployee?.name || "—"}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 mb-1">الموضوع</span>
                  <span className="font-medium text-gray-900">{form.subject}</span>
                </div>
                <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 leading-7 text-gray-800">{form.message}</div>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>رجوع</Button>
                {!historyPreview && (
                  <Button onClick={handleSave} disabled={saving} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                    {saving ? "جاري الإرسال..." : "حفظ وإرسال للموظف"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-gray-700">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children}
    </label>
  );
}
