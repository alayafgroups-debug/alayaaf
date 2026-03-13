import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";

type BalanceRow = {
  id: string; empId: string; name: string; annual: string; remainingPrev: string;
  endOfYear: string; remaining: string; current: string; lastReturn: string; contractDate: string;
};

export default function HRLeavesAnnualBalance() {
  const [items, setItems] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: emps } = await supabase.from("employees").select("id, employee_id, name, hire_date").eq("status", "نشط").order("name");
        if (!emps) { setLoading(false); return; }

        const { data: leaves } = await supabase.from("leave_requests").select("emp_id, days, status").eq("status", "موافق");

        const usedMap: Record<string, number> = {};
        (leaves ?? []).forEach((l: any) => { usedMap[l.emp_id] = (usedMap[l.emp_id] ?? 0) + (l.days ?? 0); });

        setItems(emps.map((e: any) => {
          const annualDays = 21;
          const used = usedMap[e.id] ?? 0;
          const remaining = annualDays - used;
          return {
            id: String(e.id), empId: e.employee_id ?? "", name: e.name ?? "",
            annual: annualDays.toFixed(2), remainingPrev: "0.00",
            endOfYear: annualDays.toFixed(2), remaining: remaining.toFixed(2),
            current: remaining.toFixed(2), lastReturn: "-",
            contractDate: e.hire_date ?? "-",
          };
        }));
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const filtered = items.filter((i) => !search || i.name.includes(search) || i.empId.includes(search));

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">أرصدة الإجازات السنوية</h1>
          <span className="text-sm text-gray-500">تاريخ التقرير: {new Date().toLocaleDateString("ar-SA")}</span>
        </div>

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="بحث بالاسم أو الرقم الوظيفي..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
            <span className="text-sm text-gray-500">{filtered.length} موظف</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-3 font-medium">الرقم الوظيفي</th>
                  <th className="py-3 px-3 font-medium text-right">الاسم</th>
                  <th className="py-3 px-3 font-medium">الرصيد السنوي</th>
                  <th className="py-3 px-3 font-medium">رصيد سنوات سابقة</th>
                  <th className="py-3 px-3 font-medium">حتى نهاية السنة</th>
                  <th className="py-3 px-3 font-medium">الرصيد المتبقي</th>
                  <th className="py-3 px-3 font-medium text-[#a5d8ff]">رصيد اللحظة</th>
                  <th className="py-3 px-3 font-medium">آخر عودة</th>
                  <th className="py-3 px-3 font-medium">تاريخ التعاقد</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">لا توجد بيانات</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-3">{row.empId}</td>
                    <td className="py-3 px-3 font-medium text-right">{row.name}</td>
                    <td className="py-3 px-3">{row.annual}</td>
                    <td className="py-3 px-3">{row.remainingPrev}</td>
                    <td className="py-3 px-3">{row.endOfYear}</td>
                    <td className="py-3 px-3">{row.remaining}</td>
                    <td className="py-3 px-3 font-semibold text-[#004e89]">{row.current}</td>
                    <td className="py-3 px-3">{row.lastReturn}</td>
                    <td className="py-3 px-3">{row.contractDate}</td>
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
