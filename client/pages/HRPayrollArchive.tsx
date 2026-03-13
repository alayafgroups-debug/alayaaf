import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Printer, Download, Eye, FileText, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type ArchiveRow = {
  id: string; month: string; empName: string; basicSalary: number;
  allowances: number; deductions: number; netSalary: number; status: string;
};

export default function HRPayrollArchive() {
  const [records, setRecords] = useState<ArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from("payroll").select("*").order("month", { ascending: false });
        if (data) setRecords(data.map((r) => ({
          id: String(r.id), month: String(r.month ?? ""), empName: String(r.emp_name ?? ""),
          basicSalary: Number(r.basic_salary ?? 0), allowances: Number(r.allowances ?? 0),
          deductions: Number(r.deductions ?? 0), netSalary: Number(r.net_salary ?? 0),
          status: String(r.status ?? "معلق"),
        })));
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = records.filter((r) => {
    if (search && !r.empName.includes(search)) return false;
    if (monthFilter && r.month !== monthFilter) return false;
    return true;
  });

  const handleDelete = async (rec: ArchiveRow) => {
    if (!confirm(`حذف سجل ${rec.empName}؟`)) return;
    await supabase.from("payroll").delete().eq("id", rec.id);
    setRecords((prev) => prev.filter((r) => r.id !== rec.id));
    toast({ title: "تم الحذف" });
  };

  return (
    <Layout>
      <div className="p-6 max-w-full overflow-hidden mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#004e89] text-white p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold">أرشيف الرواتب</h2>
              <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="h-8 rounded px-2 text-sm bg-white text-black border-none outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-white/10 rounded text-white" title="تصدير"><Download className="h-4 w-4" /></button>
              <button className="p-1.5 hover:bg-white/10 rounded text-white" title="طباعة"><Printer className="h-4 w-4" /></button>
              <span className="bg-white rounded px-2 py-1 text-black font-medium text-sm">{filtered.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-2 font-medium">الشهر</th>
                  <th className="py-3 px-2 font-medium min-w-[150px]">
                    <Input placeholder="بحث بالاسم" className="h-8 text-center text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </th>
                  <th className="py-3 px-2 font-medium">الراتب الأساسي</th>
                  <th className="py-3 px-2 font-medium">البدلات</th>
                  <th className="py-3 px-2 font-medium text-[#004e89]">إجمالي الاستحقاقات</th>
                  <th className="py-3 px-2 font-medium text-red-600">الاستقطاعات</th>
                  <th className="py-3 px-2 font-medium text-green-600">صافي الراتب</th>
                  <th className="py-3 px-2 font-medium">الحالة</th>
                  <th className="py-3 px-2 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-8 text-center text-gray-400">لا توجد سجلات</td></tr>
                ) : filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-2 text-gray-600">{rec.month}</td>
                    <td className="py-3 px-2 font-medium text-gray-900">{rec.empName}</td>
                    <td className="py-3 px-2">{rec.basicSalary.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-2">{rec.allowances.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-2 font-semibold text-[#004e89]">{(rec.basicSalary + rec.allowances).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-2 font-semibold text-red-600">{rec.deductions.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-2 font-semibold text-green-600">{rec.netSalary.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${rec.status === "مدفوع" ? "bg-green-100 text-green-700" : rec.status === "ملغي" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{rec.status}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <button className="text-gray-400 hover:text-[#004e89]" title="عرض"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(rec)} className="text-red-400 hover:text-red-600" title="حذف"><XCircle className="h-4 w-4" /></button>
                      </div>
                    </td>
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
