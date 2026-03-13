import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type RequestRow = {
  id: string; requestDate: string; empId: string; empName: string;
  moveType: string; requestType: string; status: string; lastUpdate: string;
};

export default function HRRequestsIncoming() {
  const [items, setItems] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("leave_requests").select("*").order("created_at", { ascending: false });
      if (data) setItems(data.map((r: any) => ({
        id: String(r.id), requestDate: r.created_at ? new Date(r.created_at).toLocaleDateString("ar-SA") : "-",
        empId: r.emp_id ?? "", empName: r.emp_name ?? "",
        moveType: "إجازة", requestType: r.leave_type ?? "-",
        status: r.status ?? "معلق",
        lastUpdate: r.updated_at ? new Date(r.updated_at).toLocaleDateString("ar-SA") : "-",
      })));
    } catch { setItems([]); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleApprove = async (item: RequestRow) => {
    await supabase.from("leave_requests").update({ status: "موافق" }).eq("id", item.id);
    toast({ title: "تمت الموافقة على الطلب" });
    loadData();
  };

  const handleReject = async (item: RequestRow) => {
    await supabase.from("leave_requests").update({ status: "مرفوض" }).eq("id", item.id);
    toast({ title: "تم رفض الطلب" });
    loadData();
  };

  const filtered = items.filter((i) => !search || i.empName.includes(search) || i.empId.includes(search));

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">الطلبات الواردة</h1>
        </div>

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="بحث بالاسم أو الرقم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
            <span className="text-sm text-gray-500">{filtered.length} طلب</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4 font-medium">تاريخ الطلب</th>
                  <th className="py-3 px-4 font-medium">اسم الموظف</th>
                  <th className="py-3 px-4 font-medium">نوع الحركة</th>
                  <th className="py-3 px-4 font-medium">نوع الطلب</th>
                  <th className="py-3 px-4 font-medium text-center">الحالة</th>
                  <th className="py-3 px-4 font-medium">آخر تحديث</th>
                  <th className="py-3 px-4 font-medium text-center w-28">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">لا توجد طلبات واردة</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">{row.requestDate}</td>
                    <td className="py-3 px-4 font-medium">{row.empName}</td>
                    <td className="py-3 px-4">{row.moveType}</td>
                    <td className="py-3 px-4">{row.requestType}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.status === "موافق" ? "bg-emerald-100 text-emerald-800" : row.status === "مرفوض" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{row.status}</span>
                    </td>
                    <td className="py-3 px-4">{row.lastUpdate}</td>
                    <td className="py-3 px-4">
                      {row.status === "معلق" && (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleApprove(row)} className="text-emerald-500 hover:text-emerald-700" title="موافقة"><CheckCircle className="h-5 w-5" /></button>
                          <button onClick={() => handleReject(row)} className="text-red-500 hover:text-red-700" title="رفض"><XCircle className="h-5 w-5" /></button>
                        </div>
                      )}
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
