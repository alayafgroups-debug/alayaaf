import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";

type Row = { id: string; empId: string; name: string; type: string; annualBalance: string; remainingBalance: string; joinDate: string; contractDate: string };

export default function HRLeavesOtherBalance() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: emps } = await supabase.from("employees").select("id, emp_id, name, hire_date, gender").in("status", ["نشط", "فعال"]).order("name");
        const { data: types } = await supabase.from("leave_types").select("*").neq("name", "إجازة سنوية");
        if (!emps || !types) { setLoading(false); return; }

        const rows: Row[] = [];
        emps.forEach((e: any) => {
          types.forEach((t: any) => {
            if (t.gender === "female" && e.gender !== "أنثى") return;
            if (t.gender === "male" && e.gender !== "ذكر") return;
            rows.push({
              id: `${e.id}-${t.id}`, empId: e.emp_id ?? "", name: e.name ?? "",
              type: t.name ?? "", annualBalance: String(t.max_days ?? 0) + ".00",
              remainingBalance: String(t.max_days ?? 0) + ".00",
              joinDate: e.hire_date ?? "-", contractDate: e.hire_date ?? "-",
            });
          });
        });
        setItems(rows);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const filtered = items.filter((i) => !search || i.name.includes(search) || i.empId.includes(search));

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">أرصدة الإجازات الأخرى</h1>
        </div>
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
            <span className="text-sm text-gray-500">{filtered.length} سجل</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-3 font-medium">الرقم الوظيفي</th>
                  <th className="py-3 px-3 font-medium text-right">الاسم</th>
                  <th className="py-3 px-3 font-medium">نوع الإجازة</th>
                  <th className="py-3 px-3 font-medium">الرصيد السنوي</th>
                  <th className="py-3 px-3 font-medium">الرصيد المتبقي</th>
                  <th className="py-3 px-3 font-medium">تاريخ التعيين</th>
                  <th className="py-3 px-3 font-medium">تاريخ التعاقد</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">لا توجد بيانات</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-3">{row.empId}</td>
                    <td className="py-3 px-3 font-medium text-right">{row.name}</td>
                    <td className="py-3 px-3">{row.type}</td>
                    <td className="py-3 px-3">{row.annualBalance}</td>
                    <td className="py-3 px-3">{row.remainingBalance}</td>
                    <td className="py-3 px-3">{row.joinDate}</td>
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
