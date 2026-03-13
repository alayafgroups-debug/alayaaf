import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

type ChartRow = { id: string; empId: string; name: string; months: string[] };

export default function HRLeavesChart() {
  const [items, setItems] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: emps } = await supabase.from("employees").select("id, employee_id, name").eq("status", "نشط").order("name");
        const { data: leaves } = await supabase.from("leave_requests").select("emp_id, start_date, days, status").eq("status", "موافق");
        if (!emps) { setLoading(false); return; }

        const leaveMap: Record<string, Set<number>> = {};
        (leaves ?? []).forEach((l: any) => {
          if (!l.start_date) return;
          const d = new Date(l.start_date);
          if (d.getFullYear() !== year) return;
          const key = l.emp_id;
          if (!leaveMap[key]) leaveMap[key] = new Set();
          leaveMap[key].add(d.getMonth());
        });

        setItems(emps.map((e: any) => {
          const empLeaveMonths = leaveMap[e.id] ?? new Set();
          const months = Array.from({ length: 12 }, (_, i) => empLeaveMonths.has(i) ? "إجازة" : "-");
          return { id: e.id, empId: e.employee_id ?? "", name: e.name ?? "", months };
        }));
      } catch {} finally { setLoading(false); }
    })();
  }, [year]);

  const filtered = items.filter((i) => !search || i.name.includes(search) || i.empId.includes(search));

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">مخطط الإجازات</h1>
          <div className="flex items-center gap-3">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 border rounded-md px-3 bg-white text-sm">
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
            <span className="text-sm text-gray-500">{filtered.length} موظف</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-2 font-medium">الرقم الوظيفي</th>
                  <th className="py-3 px-2 font-medium text-right min-w-[150px]">الاسم</th>
                  {MONTHS.map((m) => <th key={m} className="py-3 px-2 font-medium">{m}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {loading ? (
                  <tr><td colSpan={14} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={14} className="text-center py-8 text-gray-400">لا توجد بيانات</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-2">{row.empId}</td>
                    <td className="py-3 px-2 font-medium text-right">{row.name}</td>
                    {row.months.map((m, i) => (
                      <td key={i} className={`py-3 px-2 ${m === "إجازة" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-400"}`}>{m}</td>
                    ))}
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
