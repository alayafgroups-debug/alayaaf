import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

type Row = { id: string; jobId: string; name: string; employeeShare: string; companyShare: string; total: string; subscriptionNumber: string; subscriptionDate: string };

export default function HRInsuranceSocial() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("employees").select("id, emp_id, name, base_salary, hire_date").in("status", ["نشط", "فعال"]).order("name");
      if (data) setItems(data.map((e: any) => ({
        id: String(e.id), jobId: e.emp_id ?? "", name: e.name ?? "",
        employeeShare: "9.75%", companyShare: "11.75%",
        total: ((e.base_salary ?? 0) * 0.2150).toFixed(2),
        subscriptionNumber: "-", subscriptionDate: e.hire_date ?? "-",
      })));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = items.filter((i) => !search || i.name.includes(search) || i.jobId.includes(search));

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">التأمينات الاجتماعية</h1>
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
            <table className="w-full text-sm text-right min-w-[1000px]">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4 font-medium">الرقم الوظيفي</th>
                  <th className="py-3 px-4 font-medium">الاسم</th>
                  <th className="py-3 px-4 font-medium">نسبة تحمل الموظف</th>
                  <th className="py-3 px-4 font-medium">نسبة تحمل المنشأة</th>
                  <th className="py-3 px-4 font-medium">الإجمالي</th>
                  <th className="py-3 px-4 font-medium">رقم الاشتراك</th>
                  <th className="py-3 px-4 font-medium">تاريخ الاشتراك</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">لا توجد بيانات</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">{row.jobId}</td>
                    <td className="py-3 px-4 font-medium">{row.name}</td>
                    <td className="py-3 px-4">{row.employeeShare}</td>
                    <td className="py-3 px-4">{row.companyShare}</td>
                    <td className="py-3 px-4">{row.total}</td>
                    <td className="py-3 px-4">{row.subscriptionNumber}</td>
                    <td className="py-3 px-4">{row.subscriptionDate}</td>
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
