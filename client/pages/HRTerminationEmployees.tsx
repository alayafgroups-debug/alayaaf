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
  baseSalary: number;
  totalSalary: number;
  hireDate: string;
  contractEndDate: string;
  jobTitle: string;
};

type TermRow = {
  id: string;
  jobId: string;
  name: string;
  department: string;
  reason: string;
  terminationDate: string;
  reward: number;
  leaveValue: number;
  otherEntitlements: number;
  otherDeductions: number;
  total: number;
  status: string;
  hireDate: string;
  notes: string;
};

const TERM_REASONS = [
  "استقالة", "انتهاء العقد", "إنهاء من قِبل صاحب العمل", "تقاعد", "وفاة", "أخرى",
];

const CONTRACT_TYPES = ["دائم", "مؤقت", "موسمي", "جزئي"];

function calcServiceDuration(hireDateStr: string, endDateStr: string): string {
  if (!hireDateStr || !endDateStr) return "";
  const hire = new Date(hireDateStr);
  const end = new Date(endDateStr);
  if (end < hire) return "";
  let years = end.getFullYear() - hire.getFullYear();
  let months = end.getMonth() - hire.getMonth();
  let days = end.getDate() - hire.getDate();
  if (days < 0) { months -= 1; days += 30; }
  if (months < 0) { years -= 1; months += 12; }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} سنة`);
  if (months > 0) parts.push(`${months} أشهر`);
  if (days > 0) parts.push(`${days} يوم`);
  return parts.join(" ");
}

function calcGratuity(baseSalary: number, hireDateStr: string, endDateStr: string): number {
  if (!hireDateStr || !endDateStr || baseSalary <= 0) return 0;
  const hire = new Date(hireDateStr);
  const end = new Date(endDateStr);
  const msPerYear = 365.25 * 24 * 3600 * 1000;
  const years = (end.getTime() - hire.getTime()) / msPerYear;
  if (years <= 0) return 0;
  const dailySalary = baseSalary / 30;
  let gratuity = 0;
  if (years <= 5) {
    gratuity = dailySalary * 15 * years;
  } else {
    gratuity = dailySalary * 15 * 5 + dailySalary * 30 * (years - 5);
  }
  return Math.round(gratuity * 100) / 100;
}

function calcLeaveValue(totalSalary: number, leaveRemaining: number): number {
  if (!totalSalary || leaveRemaining <= 0) return 0;
  const daily = totalSalary / 30;
  return Math.round(daily * leaveRemaining * 100) / 100;
}

const emptyForm = {
  employeeId: "",
  contractType: "",
  endReason: "",
  terminationDate: new Date().toISOString().slice(0, 10),
  hireDate: "",
  leaveRemaining: "0",
  leaveValue: "0",
  otherEntitlements: "0",
  otherDeductions: "0",
  total: "0",
  notes: "",
};

export default function HRTerminationEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<TermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empsResult, termsResult] = await Promise.all([
        supabase
          .from("employees")
          .select("id, emp_id, name, department, base_salary, total_salary, hire_date, contract_end_date, job_title")
          .in("status", ["نشط", "فعال"])
          .order("name"),
        supabase.from("hr_terminations").select("*").order("created_at", { ascending: false }),
      ]);

      if (empsResult.error) throw empsResult.error;
      if (termsResult.error) throw termsResult.error;

      setEmployees(
        (empsResult.data ?? []).map((row: any) => ({
          id: String(row.id),
          empId: String(row.emp_id ?? row.id),
          name: String(row.name ?? ""),
          department: String(row.department ?? ""),
          baseSalary: Number(row.base_salary ?? 0),
          totalSalary: Number(row.total_salary ?? row.base_salary ?? 0),
          hireDate: String(row.hire_date ?? ""),
          contractEndDate: String(row.contract_end_date ?? ""),
          jobTitle: String(row.job_title ?? ""),
        }))
      );

      setItems(
        (termsResult.data ?? []).map((row: any) => ({
          id: String(row.id),
          jobId: String(row.job_id ?? ""),
          name: String(row.emp_name ?? ""),
          department: String(row.department ?? ""),
          reason: String(row.end_reason ?? row.reason ?? ""),
          terminationDate: String(row.termination_date ?? ""),
          reward: Number(row.reward ?? 0),
          leaveValue: Number(row.leave_value ?? 0),
          otherEntitlements: Number(row.other_entitlements ?? 0),
          otherDeductions: Number(row.other_deductions ?? 0),
          total: Number(row.total ?? 0),
          status: String(row.status ?? "معلق"),
          hireDate: String(row.hire_date ?? ""),
          notes: String(row.notes ?? ""),
        }))
      );
    } catch (error) {
      toast({
        title: "تعذر تحميل البيانات",
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

  const selectedEmployee = employees.find((emp) => emp.id === form.employeeId);

  // Auto-compute fields when employee or date changes
  const computedReward = useMemo(() => {
    if (!selectedEmployee) return 0;
    return calcGratuity(selectedEmployee.baseSalary, selectedEmployee.hireDate, form.terminationDate);
  }, [selectedEmployee, form.terminationDate]);

  const computedLeaveValue = useMemo(() => {
    if (!selectedEmployee) return 0;
    return calcLeaveValue(selectedEmployee.totalSalary, Number(form.leaveRemaining));
  }, [selectedEmployee, form.leaveRemaining]);

  const computedTotal = useMemo(() => {
    return (
      computedReward +
      computedLeaveValue +
      Number(form.otherEntitlements) -
      Number(form.otherDeductions)
    );
  }, [computedReward, computedLeaveValue, form.otherEntitlements, form.otherDeductions]);

  const serviceDuration = useMemo(() => {
    if (!selectedEmployee) return "";
    return calcServiceDuration(selectedEmployee.hireDate, form.terminationDate);
  }, [selectedEmployee, form.terminationDate]);

  const handleEmployeeChange = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    setForm((current) => ({
      ...current,
      employeeId,
      hireDate: emp?.hireDate ?? "",
    }));
  };

  const validateForm = () => {
    if (!selectedEmployee || !form.endReason || !form.terminationDate) {
      toast({ title: "أكمل الحقول المطلوبة", description: "الموظف وسبب إنهاء الخدمة والتاريخ مطلوبة", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !selectedEmployee) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("hr_terminations").insert({
        emp_id: selectedEmployee.id,
        job_id: selectedEmployee.empId,
        emp_name: selectedEmployee.name,
        department: selectedEmployee.department,
        reason: form.endReason,
        end_reason: form.endReason,
        contract_type: form.contractType,
        termination_date: form.terminationDate,
        hire_date: selectedEmployee.hireDate,
        service_duration: serviceDuration,
        reward: computedReward,
        leave_remaining: Number(form.leaveRemaining),
        leave_value: computedLeaveValue,
        other_entitlements: Number(form.otherEntitlements),
        other_deductions: Number(form.otherDeductions),
        total: computedTotal,
        notes: form.notes,
        status: "معلق",
      });
      if (error) throw error;
      toast({ title: "تم حفظ إنهاء الخدمة", description: `تم تسجيل إنهاء خدمة ${selectedEmployee.name}` });
      setForm(emptyForm);
      setShowForm(false);
      setPreviewOpen(false);
      await loadData();
    } catch (error) {
      toast({
        title: "تعذر الحفظ",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter((item) => item.name.includes(search) || item.jobId.includes(search));
  }, [items, search]);

  return (
    <Layout>
      <div className="w-full p-4 space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">إنهاء خدمة الموظفين</h1>
          <Button onClick={() => { setForm(emptyForm); setShowForm((v) => !v); }} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
            {showForm ? <X className="h-4 w-4 ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
            {showForm ? "إغلاق" : "إنهاء خدمة"}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="font-bold text-gray-900">إنهاء خدمة الموظف</h2>
              {selectedEmployee && (
                <span className="text-sm text-emerald-700 font-medium bg-emerald-50 px-3 py-1 rounded-full">
                  راتب الموظف: SAR {selectedEmployee.totalSalary.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="الموظف" required>
                  <select
                    value={form.employeeId}
                    onChange={(event) => handleEmployeeChange(event.target.value)}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#004e89]"
                  >
                    <option value="">اختر الموظف</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} - {employee.empId}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="نوع العقد">
                  <select
                    value={form.contractType}
                    onChange={(event) => setForm((current) => ({ ...current, contractType: event.target.value }))}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#004e89]"
                  >
                    <option value="">اختر نوع العقد</option>
                    {CONTRACT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </Field>

                <Field label="سبب إنهاء الخدمة" required>
                  <select
                    value={form.endReason}
                    onChange={(event) => setForm((current) => ({ ...current, endReason: event.target.value }))}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#004e89]"
                  >
                    <option value="">اختر السبب</option>
                    {TERM_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                  </select>
                </Field>

                <Field label="تاريخ التعيين">
                  <Input type="date" value={form.hireDate || selectedEmployee?.hireDate || ""} readOnly className="bg-gray-50" />
                </Field>

                <Field label="تاريخ إنهاء الخدمة" required>
                  <Input type="date" value={form.terminationDate} onChange={(event) => setForm((current) => ({ ...current, terminationDate: event.target.value }))} />
                  {serviceDuration && (
                    <p className="text-xs text-gray-500 mt-1">المدة: {serviceDuration} يوم/أشهر</p>
                  )}
                </Field>

                <Field label="مساحة إنهاء الخدمة">
                  <Input type="number" value={computedReward.toFixed(2)} readOnly className="bg-gray-50 font-medium" placeholder="تُحسب تلقائياً" />
                </Field>

                <Field label="رصيد الإجازات السنوية المتبقية">
                  <Input type="number" value={form.leaveRemaining} onChange={(event) => setForm((current) => ({ ...current, leaveRemaining: event.target.value }))} min="0" step="0.25" />
                  <p className="text-xs text-gray-400 mt-0.5">يوم</p>
                </Field>

                <Field label="قيمة الإجازات">
                  <Input value={computedLeaveValue.toFixed(2)} readOnly className="bg-gray-50 font-medium" />
                  <p className="text-xs text-gray-400 mt-0.5">= راتب الموظف ÷ 30 × أيام الإجازة</p>
                </Field>

                <Field label="مستحقات أخرى">
                  <Input type="number" value={form.otherEntitlements} onChange={(event) => setForm((current) => ({ ...current, otherEntitlements: event.target.value }))} min="0" step="0.01" />
                </Field>

                <Field label="مطلبيات استقطاع أخرى">
                  <Input type="number" value={form.otherDeductions} onChange={(event) => setForm((current) => ({ ...current, otherDeductions: event.target.value }))} min="0" step="0.01" />
                </Field>

                <Field label="الإجمالي">
                  <div className="flex items-center gap-3">
                    <Input value={computedTotal.toFixed(2)} readOnly className="bg-gray-50 font-bold text-[#004e89]" />
                    <span className="text-xs text-gray-400 whitespace-nowrap">= مبلغ الراتب الأساسي</span>
                  </div>
                </Field>

                <div className="md:col-span-2">
                  <Field label="ملاحظات">
                    <textarea
                      value={form.notes}
                      onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                      rows={3}
                      className="w-full resize-y rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#004e89]"
                    />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field label="المرفق">
                    <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-50">
                      <FileText className="h-4 w-4" />
                      <span>إضافة ملفات</span>
                    </div>
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <Button variant="outline" onClick={() => setPreviewOpen(true)}>معاينة</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Records table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-gray-100 p-4">
            <h2 className="font-bold text-gray-900">سجل إنهاءات الخدمة ({filtered.length})</h2>
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالاسم أو الرقم الوظيفي" className="pr-9" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm text-right">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4">الرقم الوظيفي</th>
                  <th className="py-3 px-4">الاسم</th>
                  <th className="py-3 px-4">الإدارة</th>
                  <th className="py-3 px-4">سبب الإنهاء</th>
                  <th className="py-3 px-4">تاريخ الإنهاء</th>
                  <th className="py-3 px-4">مكافأة نهاية الخدمة</th>
                  <th className="py-3 px-4">قيمة الإجازات</th>
                  <th className="py-3 px-4">الإجمالي</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="py-10 text-center text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-10 text-center text-gray-500"><FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />لا توجد بيانات</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">{row.jobId || "—"}</td>
                    <td className="py-3 px-4 font-medium">{row.name}</td>
                    <td className="py-3 px-4">{row.department || "—"}</td>
                    <td className="py-3 px-4">{row.reason || "—"}</td>
                    <td className="py-3 px-4">{row.terminationDate || "—"}</td>
                    <td className="py-3 px-4">{row.reward.toFixed(2)}</td>
                    <td className="py-3 px-4">{row.leaveValue.toFixed(2)}</td>
                    <td className="py-3 px-4 font-semibold text-[#004e89]">{row.total.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === "موافق عليه" ? "bg-emerald-100 text-emerald-800" :
                        row.status === "مرفوض" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>{row.status}</span>
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
                <h3 className="text-xl font-bold text-gray-900">معاينة إنهاء الخدمة</h3>
                <button type="button" onClick={() => setPreviewOpen(false)} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <h4 className="text-center text-2xl font-bold text-[#004e89]">إنهاء خدمة الموظف</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <PreviewItem label="الموظف" value={selectedEmployee?.name || "—"} />
                  <PreviewItem label="الرقم الوظيفي" value={selectedEmployee?.empId || "—"} />
                  <PreviewItem label="الإدارة" value={selectedEmployee?.department || "—"} />
                  <PreviewItem label="نوع العقد" value={form.contractType || "—"} />
                  <PreviewItem label="سبب الإنهاء" value={form.endReason || "—"} />
                  <PreviewItem label="تاريخ التعيين" value={selectedEmployee?.hireDate || "—"} />
                  <PreviewItem label="تاريخ إنهاء الخدمة" value={form.terminationDate} />
                  <PreviewItem label="مدة الخدمة" value={serviceDuration || "—"} />
                  <PreviewItem label="مكافأة نهاية الخدمة" value={`${computedReward.toFixed(2)} SAR`} />
                  <PreviewItem label="قيمة الإجازات" value={`${computedLeaveValue.toFixed(2)} SAR`} />
                  <PreviewItem label="مستحقات أخرى" value={`${Number(form.otherEntitlements).toFixed(2)} SAR`} />
                  <PreviewItem label="استقطاعات أخرى" value={`${Number(form.otherDeductions).toFixed(2)} SAR`} />
                  <PreviewItem label="الإجمالي" value={`${computedTotal.toFixed(2)} SAR`} />
                </div>
                {form.notes && <p className="text-sm text-gray-600 border-t pt-3"><span className="font-medium">ملاحظات:</span> {form.notes}</p>}
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>رجوع</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
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
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children}
    </label>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs text-gray-500 mb-0.5">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
