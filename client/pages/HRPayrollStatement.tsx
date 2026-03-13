import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type EmpLite = { id: string; name: string; jobTitle: string; department: string; branch: string; workTime: string; baseSalary: number };

export default function HRPayrollStatement() {
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<EmpLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from("employees").select("id, name, job_title, department, branch, work_time, base_salary").eq("status", "نشط");
        if (data) setEmployees(data.map((r) => ({
          id: String(r.id), name: String(r.name ?? ""), jobTitle: String(r.job_title ?? ""),
          department: String(r.department ?? ""), branch: String(r.branch ?? ""),
          workTime: String(r.work_time ?? "كامل"), baseSalary: Number(r.base_salary ?? 0),
        })));
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = employees.filter((e) => !search || e.name.includes(search));

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((e) => e.id)));
  };

  const handleGenerate = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) { toast({ title: "تنبيه", description: "اختر موظفاً واحداً على الأقل", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const emps = employees.filter((e) => ids.includes(e.id));
      const { data: existing } = await supabase.from("payroll").select("emp_id").eq("month", month);
      const existingIds = new Set((existing || []).map((r) => String(r.emp_id)));
      const payload = emps.filter((e) => !existingIds.has(e.id)).map((e) => ({
        emp_id: e.id, emp_name: e.name, department: e.department, month,
        basic_salary: e.baseSalary, allowances: 0, deductions: 0, net_salary: e.baseSalary, status: "معلق",
      }));
      if (payload.length === 0) { toast({ title: "موجود مسبقاً", description: "تم إنشاء مسير هؤلاء الموظفين مسبقاً" }); return; }
      await supabase.from("payroll").insert(payload);
      toast({ title: "تم الإنشاء", description: `تم إنشاء ${payload.length} سجل رواتب` });
      setSelected(new Set());
    } catch { toast({ title: "خطأ", variant: "destructive" }); } finally { setGenerating(false); }
  };

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">حساب الراتب</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">الفترة</label>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button onClick={handleGenerate} disabled={generating || selected.size === 0} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                {generating ? "جاري الإنشاء..." : `إنشاء مسير (${selected.size} موظف)`}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800">الموظفون ({filtered.length})</h2>
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="بحث" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-3 pr-9 h-10" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">
                    <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={selectAll} className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-[#004e89]" />
                  </th>
                  <th className="py-3 px-4 font-medium">الصورة</th>
                  <th className="py-3 px-4 font-medium">الاسم</th>
                  <th className="py-3 px-4 font-medium">المسمى الوظيفي</th>
                  <th className="py-3 px-4 font-medium">القسم</th>
                  <th className="py-3 px-4 font-medium">الفرع</th>
                  <th className="py-3 px-4 font-medium">الراتب الأساسي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-500">لا يوجد موظفون نشطون</td></tr>
                ) : filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-center"><Checkbox checked={selected.has(emp.id)} onCheckedChange={() => toggleSelect(emp.id)} /></td>
                    <td className="py-3 px-4">
                      <Avatar className="h-8 w-8"><AvatarFallback className="bg-[#004e89] text-white text-xs">{emp.name.charAt(0)}</AvatarFallback></Avatar>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{emp.name}</td>
                    <td className="py-3 px-4">{emp.jobTitle || "—"}</td>
                    <td className="py-3 px-4">{emp.department || "—"}</td>
                    <td className="py-3 px-4">{emp.branch || "—"}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">{emp.baseSalary.toLocaleString()} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
