import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Search } from "lucide-react";
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

  const handleGenerate = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast({ title: "تنبيه", description: "اختر موظفاً واحداً على الأقل", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const emps = filtered.filter((e) => ids.includes(e.id));

      const { data: existing } = await supabase
        .from("payroll")
        .select("emp_id")
        .eq("month", period);

      const existingIds = new Set((existing || []).map((r) => String(r.emp_id)));

      const payload = emps
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
        return;
      }

      const { error } = await supabase.from("payroll").insert(payload);
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "تم الإنشاء", description: `تم إنشاء ${payload.length} سجل رواتب` });
      setSelected(new Set());
    } catch {
      toast({ title: "خطأ", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSummaryReport = () => {
    if (filtered.length === 0) {
      toast({ title: "لا توجد بيانات", description: "لا يوجد موظفون مطابقون للفلاتر" });
      return;
    }

    const totalBase = filtered.reduce((sum, e) => sum + e.baseSalary, 0);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = filtered
      .map(
        (e, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${e.name}</td>
            <td>${e.jobTitle || "-"}</td>
            <td>${e.department || "-"}</td>
            <td>${e.branch || "-"}</td>
            <td>${e.employeeType || "-"}</td>
            <td>${e.baseSalary.toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>تقرير شامل (ملخص)</title>
          <style>
            body{font-family:Arial,sans-serif;padding:20px;color:#0f172a}
            h1{margin:0 0 8px;font-size:20px}
            p{margin:0 0 14px;color:#475569;font-size:13px}
            table{width:100%;border-collapse:collapse;font-size:12px}
            th,td{border:1px solid #cbd5e1;padding:6px;text-align:center}
            th{background:#f1f5f9}
            .sum{margin-top:12px;font-weight:700}
          </style>
        </head>
        <body>
          <h1>تقرير شامل (ملخص)</h1>
          <p>الفترة: ${period} | عدد الموظفين: ${filtered.length}</p>
          <table>
            <thead>
              <tr>
                <th>#</th><th>الاسم</th><th>المسمى الوظيفي</th><th>الإدارة</th><th>الفرع</th><th>نوع الموظف</th><th>الراتب الأساسي</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="sum">إجمالي الرواتب الأساسية: ${totalBase.toFixed(2)} ر.س</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
              <Button variant="outline" onClick={handleSummaryReport}>
                تقرير شامل (ملخص)
              </Button>
              <Button onClick={handleGenerate} disabled={generating || selected.size === 0} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                {generating ? "جاري المعالجة..." : "اختيار الموظفين (تفصيلي)"}
              </Button>
            </div>
          </div>
        </div>

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
