import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { ArrowRight, Search, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type EmpLite = {
  id: string;
  name: string;
  jobTitle: string;
  department: string;
  branch: string;
  workLocation: string;
  employeeType: string;
  status: string;
  baseSalary: number;
};

const monthNames: Record<string, string> = {
  "01": "يناير",
  "02": "فبراير",
  "03": "مارس",
  "04": "أبريل",
  "05": "مايو",
  "06": "يونيو",
  "07": "يوليو",
  "08": "أغسطس",
  "09": "سبتمبر",
  "10": "أكتوبر",
  "11": "نوفمبر",
  "12": "ديسمبر",
};

const current = new Date();
const defaultYear = String(current.getFullYear());
const defaultMonth = String(current.getMonth() + 1).padStart(2, "0");

export default function HRPayrollStatement() {
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<EmpLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const [yearFilter, setYearFilter] = useState(defaultYear);
  const [monthFilter, setMonthFilter] = useState(defaultMonth);
  const [branchFilter, setBranchFilter] = useState("الكل");
  const [departmentFilter, setDepartmentFilter] = useState("الكل");
  const [locationFilter, setLocationFilter] = useState("الكل");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("نشط");

  const [pageMode, setPageMode] = useState<"setup" | "report">("setup");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalStep, setApprovalStep] = useState<1 | 2>(1);
  const [approvalScope, setApprovalScope] = useState<"all" | "partial">("all");
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  const [approvalDepartment, setApprovalDepartment] = useState("الكل");
  const [approvalBranch, setApprovalBranch] = useState("الكل");
  const [approvalLocation, setApprovalLocation] = useState("الكل");
  const [approvalStopKeyword, setApprovalStopKeyword] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("id, name, job_title, department, branch, work_location, employment_type, status, base_salary")
          .order("name");

        if (error) {
          toast({ title: "تعذر تحميل الموظفين", description: error.message });
          return;
        }

        if (data) {
          setEmployees(
            data.map((r) => ({
              id: String(r.id ?? ""),
              name: String(r.name ?? ""),
              jobTitle: String(r.job_title ?? ""),
              department: String(r.department ?? ""),
              branch: String(r.branch ?? ""),
              workLocation: String(r.work_location ?? r.branch ?? ""),
              employeeType: String(r.employment_type ?? "أساسي"),
              status: String(r.status ?? "نشط"),
              baseSalary: Number(r.base_salary ?? 0),
            }))
          );
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const options = useMemo(() => {
    const uniq = (list: string[]) => ["الكل", ...Array.from(new Set(list.filter(Boolean)))];

    return {
      years: Array.from({ length: 6 }, (_, idx) => String(Number(defaultYear) - 2 + idx)),
      months: Object.entries(monthNames).map(([value, label]) => ({ value, label })),
      branches: uniq(employees.map((e) => e.branch)),
      departments: uniq(employees.map((e) => e.department)),
      locations: uniq(employees.map((e) => e.workLocation)),
      types: uniq(employees.map((e) => e.employeeType)),
      statuses: ["الكل", "نشط", "موقوف", "غير فعال"],
    };
  }, [employees]);

  const period = `${yearFilter}-${monthFilter}`;

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const keyword = search.trim();

      if (keyword && !e.name.includes(keyword) && !e.department.includes(keyword) && !e.branch.includes(keyword)) {
        return false;
      }

      if (branchFilter !== "الكل" && e.branch !== branchFilter) return false;
      if (departmentFilter !== "الكل" && e.department !== departmentFilter) return false;
      if (locationFilter !== "الكل" && e.workLocation !== locationFilter) return false;
      if (typeFilter !== "الكل" && e.employeeType !== typeFilter) return false;
      if (statusFilter !== "الكل" && e.status !== statusFilter) return false;

      return true;
    });
  }, [employees, search, branchFilter, departmentFilter, locationFilter, typeFilter, statusFilter]);

  useEffect(() => {
    setSelected(new Set());
  }, [search, branchFilter, departmentFilter, locationFilter, typeFilter, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (filtered.length === 0) return;
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((e) => e.id)));
  };

  const selectedEmployees = useMemo(() => filtered.filter((e) => selected.has(e.id)), [filtered, selected]);

  const createPayrollRecords = async (targetEmployees: EmpLite[]) => {
    const { data: existing } = await supabase
      .from("payroll")
      .select("emp_id")
      .eq("month", period);

    const existingIds = new Set((existing || []).map((r) => String(r.emp_id)));

    const payload = targetEmployees
      .filter((e) => !existingIds.has(e.id))
      .map((e) => ({
        emp_id: e.id,
        emp_name: e.name,
        department: e.department,
        month: period,
        basic_salary: e.baseSalary,
        allowances: 0,
        deductions: 0,
        net_salary: e.baseSalary,
        status: "معلق",
      }));

    if (payload.length === 0) {
      toast({ title: "موجود مسبقاً", description: "تم إنشاء مسير هؤلاء الموظفين مسبقاً" });
      return false;
    }

    const { error } = await supabase.from("payroll").insert(payload);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "تم الإنشاء", description: `تم إنشاء ${payload.length} سجل رواتب` });
    return true;
  };

  const handleGenerate = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast({ title: "تنبيه", description: "اختر موظفاً واحداً على الأقل", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const emps = filtered.filter((e) => ids.includes(e.id));
      const done = await createPayrollRecords(emps);
      if (done) setSelected(new Set());
    } catch {
      toast({ title: "خطأ", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleFullReport = () => {
    if (selectedEmployees.length === 0) {
      toast({ title: "تنبيه", description: "اختر الموظفين أولاً لعرض التقرير الكامل", variant: "destructive" });
      return;
    }
    setPageMode("report");
  };

  const handleOpenApproval = () => {
    setApprovalScope("all");
    setApprovalStep(1);
    setApprovalDepartment("الكل");
    setApprovalBranch("الكل");
    setApprovalLocation("الكل");
    setApprovalStopKeyword("");
    setApprovalOpen(true);
  };

  const getApprovalEmployees = () => {
    if (approvalScope === "all") return selectedEmployees;

    return selectedEmployees.filter((e) => {
      if (approvalDepartment !== "الكل" && e.department !== approvalDepartment) return false;
      if (approvalBranch !== "الكل" && e.branch !== approvalBranch) return false;
      if (approvalLocation !== "الكل" && e.workLocation !== approvalLocation) return false;
      if (approvalStopKeyword && !e.name.includes(approvalStopKeyword)) return false;
      return true;
    });
  };

  const handleSendApproval = async () => {
    const target = getApprovalEmployees();
    if (target.length === 0) {
      toast({ title: "لا يوجد موظفون", description: "لا يوجد موظفون مطابقون للاختيار الحالي", variant: "destructive" });
      return;
    }

    setApprovalSubmitting(true);
    try {
      const done = await createPayrollRecords(target);
      if (done) {
        toast({ title: "تم إرسال طلب الاعتماد", description: `تم تجهيز ${target.length} موظف للاعتماد` });
        setApprovalOpen(false);
        setSelected(new Set());
        setPageMode("setup");
      }
    } finally {
      setApprovalSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">حساب الراتب</h2>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FilterSelect label="السنة" value={yearFilter} onChange={setYearFilter} options={options.years} />
              <FilterSelect label="شهر" value={monthFilter} onChange={setMonthFilter} options={options.months.map((m) => ({ value: m.value, label: m.label }))} />
              <FilterSelect label="الفئة" value={typeFilter} onChange={setTypeFilter} options={options.types} />

              <FilterSelect label="مكان العمل" value={locationFilter} onChange={setLocationFilter} options={options.locations} />
              <FilterSelect label="الإدارة" value={departmentFilter} onChange={setDepartmentFilter} options={options.departments} />
              <FilterSelect label="القسم/الفرع" value={branchFilter} onChange={setBranchFilter} options={options.branches} />

              <FilterSelect label="إيقاف/تفعيل الموظفين" value={statusFilter} onChange={setStatusFilter} options={options.statuses} />
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">نوع الموظفين</label>
                <div className="h-10 border border-gray-300 rounded-md px-3 flex items-center bg-gray-50 text-sm text-gray-700">
                  {typeFilter}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">بحث الموظفين</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="بحث بالاسم / القسم / الفرع"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-3 pr-9 h-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={handleFullReport}>تقرير كامل</Button>
              <Button onClick={handleGenerate} disabled={generating || selected.size === 0} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                {generating ? "جاري المعالجة..." : "اختيار الموظفين (تفصيلي)"}
              </Button>
            </div>
          </div>
        </div>

        {pageMode === "setup" ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center gap-4">
              <h2 className="text-lg font-bold text-gray-800">الموظفون ({filtered.length})</h2>
              <div className="text-sm text-gray-600">فترة المسير: {period}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-[#004e89] text-white">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">
                      <Checkbox
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onCheckedChange={selectAll}
                        className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-[#004e89]"
                      />
                    </th>
                    <th className="py-3 px-4 font-medium">الصورة</th>
                    <th className="py-3 px-4 font-medium">الاسم</th>
                    <th className="py-3 px-4 font-medium">المسمى الوظيفي</th>
                    <th className="py-3 px-4 font-medium">الإدارة</th>
                    <th className="py-3 px-4 font-medium">القسم/الفرع</th>
                    <th className="py-3 px-4 font-medium">مكان العمل</th>
                    <th className="py-3 px-4 font-medium">نوع الموظف</th>
                    <th className="py-3 px-4 font-medium">الحالة</th>
                    <th className="py-3 px-4 font-medium">الراتب الأساسي</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={10} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={10} className="py-8 text-center text-gray-500">لا يوجد موظفون مطابقون للفلاتر</td></tr>
                  ) : (
                    filtered.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-center">
                          <Checkbox checked={selected.has(emp.id)} onCheckedChange={() => toggleSelect(emp.id)} />
                        </td>
                        <td className="py-3 px-4">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-[#004e89] text-white text-xs">{emp.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">{emp.name}</td>
                        <td className="py-3 px-4">{emp.jobTitle || "—"}</td>
                        <td className="py-3 px-4">{emp.department || "—"}</td>
                        <td className="py-3 px-4">{emp.branch || "—"}</td>
                        <td className="py-3 px-4">{emp.workLocation || "—"}</td>
                        <td className="py-3 px-4">{emp.employeeType || "—"}</td>
                        <td className="py-3 px-4">{emp.status || "—"}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-700">{emp.baseSalary.toLocaleString()} ر.س</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setPageMode("setup")}>
                  <ArrowRight className="h-4 w-4" /> رجوع
                </Button>
                <h2 className="text-lg font-bold text-gray-800">النتائج (تقرير شامل)</h2>
              </div>
              <Button onClick={handleOpenApproval} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                <Send className="h-4 w-4" /> إرسال طلب اعتماد رواتب الموظفين
              </Button>
            </div>

            <div className="p-4 border-b border-gray-100 text-sm text-gray-700">
              الشهر: {monthNames[monthFilter]} | السنة: {yearFilter} | عدد الموظفين المختارين: {selectedEmployees.length}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right min-w-[1300px]">
                <thead className="bg-[#0a5a92] text-white">
                  <tr>
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">الموظف</th>
                    <th className="py-2 px-2">القسم</th>
                    <th className="py-2 px-2">الفرع</th>
                    <th className="py-2 px-2">أيام العمل</th>
                    <th className="py-2 px-2">الراتب الأساسي</th>
                    <th className="py-2 px-2">البدلات</th>
                    <th className="py-2 px-2">إضافي</th>
                    <th className="py-2 px-2">عمولات</th>
                    <th className="py-2 px-2">استقطاعات</th>
                    <th className="py-2 px-2">صافي الراتب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedEmployees.map((emp, idx) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="py-2 px-2">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium">{emp.name}</td>
                      <td className="py-2 px-2">{emp.department || "-"}</td>
                      <td className="py-2 px-2">{emp.branch || "-"}</td>
                      <td className="py-2 px-2">30</td>
                      <td className="py-2 px-2">{emp.baseSalary.toFixed(2)}</td>
                      <td className="py-2 px-2">0.00</td>
                      <td className="py-2 px-2">0.00</td>
                      <td className="py-2 px-2">0.00</td>
                      <td className="py-2 px-2 text-red-600">0.00</td>
                      <td className="py-2 px-2 font-semibold text-emerald-700">{emp.baseSalary.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {approvalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => setApprovalOpen(false)} className="text-gray-500 hover:text-gray-800">
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-2xl font-bold text-gray-800">إرسال طلب اعتماد رواتب الموظفين</h3>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-2xl font-semibold text-gray-800">كشف الرواتب</label>
                  <select
                    value={approvalScope}
                    onChange={(e) => setApprovalScope(e.target.value as "all" | "partial")}
                    className="w-full h-12 border border-gray-300 rounded-md px-3 text-lg"
                  >
                    <option value="all">لجميع الموظفين</option>
                    <option value="partial">لجزء من الموظفين</option>
                  </select>
                </div>

                {approvalStep === 2 && approvalScope === "partial" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-2">
                      <label className="text-lg font-semibold text-gray-700">اختر الإدارة</label>
                      <select value={approvalDepartment} onChange={(e) => setApprovalDepartment(e.target.value)} className="w-full h-12 border border-gray-300 rounded-md px-3">
                        <option>الكل</option>
                        {options.departments.filter((d) => d !== "الكل").map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-lg font-semibold text-gray-700">اختر الفرع</label>
                      <select value={approvalBranch} onChange={(e) => setApprovalBranch(e.target.value)} className="w-full h-12 border border-gray-300 rounded-md px-3">
                        <option>الكل</option>
                        {options.branches.filter((b) => b !== "الكل").map((b) => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-lg font-semibold text-gray-700">اختر موقع العمل</label>
                      <select value={approvalLocation} onChange={(e) => setApprovalLocation(e.target.value)} className="w-full h-12 border border-gray-300 rounded-md px-3">
                        <option>الكل</option>
                        {options.locations.filter((l) => l !== "الكل").map((l) => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-lg font-semibold text-gray-700">إيقاف رواتب الموظفين</label>
                      <Input
                        value={approvalStopKeyword}
                        onChange={(e) => setApprovalStopKeyword(e.target.value)}
                        placeholder="اختر الموظف المراد إيقاف راتبه"
                        className="h-12"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex justify-start gap-3">
                {approvalScope === "partial" && approvalStep === 1 ? (
                  <Button onClick={() => setApprovalStep(2)} className="bg-[#004e89] hover:bg-[#003d6d] text-white">التالي</Button>
                ) : (
                  <Button onClick={handleSendApproval} disabled={approvalSubmitting} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                    {approvalSubmitting ? "جاري الإرسال..." : "إرسال"}
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | Array<{ value: string; label: string }>;
}) {
  const normalized = options.map((op) =>
    typeof op === "string" ? { value: op, label: op } : op
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none"
      >
        {normalized.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
    </div>
  );
}
