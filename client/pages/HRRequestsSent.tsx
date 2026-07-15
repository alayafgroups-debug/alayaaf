import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type Request = { id: string; type: string; date: string; status: string; notes: string; approver: string; source: "leave" | "request" };

const normalizeStatus = (raw: string) =>
  ["معلق", "معلقة", "pending"].includes(raw)
    ? "معلق"
    : ["موافق", "معتمدة", "approved"].includes(raw)
    ? "موافق"
    : ["مرفوض", "مرفوضة", "rejected"].includes(raw)
    ? "مرفوض"
    : (raw || "معلق");

const STATUS_STYLE: Record<string, string> = {
  "معلق": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "موافق": "bg-green-100 text-green-700 border-green-200",
  "مرفوض": "bg-red-100 text-red-700 border-red-200",
};

export default function HRRequestsSent() {
  const [items, setItems] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [leaveRes, reqRes] = await Promise.all([
        supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("hr_requests").select("*").order("created_at", { ascending: false }),
      ]);

      const leaveRows: Request[] = (leaveRes.data ?? []).map((r: any) => ({
        id: String(r.id), type: r.leave_type ?? "إجازة",
        date: r.created_at ? new Date(r.created_at).toLocaleDateString("ar-SA") : "-",
        status: normalizeStatus(String(r.status ?? "").trim()), notes: r.notes ?? "-",
        approver: "مدير الموارد البشرية", source: "leave",
      }));

      const reqRows: Request[] = (reqRes.data ?? []).map((r: any) => ({
        id: String(r.id), type: r.request_type ?? "طلب",
        date: r.created_at ? new Date(r.created_at).toLocaleDateString("ar-SA") : "-",
        status: normalizeStatus(String(r.status ?? "").trim()),
        notes: r.details ? JSON.stringify(r.details) : "-",
        approver: "مدير الموارد البشرية", source: "request",
      }));

      setItems([...leaveRows, ...reqRows].sort((a, b) => b.date.localeCompare(a.date)));
    } catch { setItems([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleDelete = async (item: Request) => {
    if (!confirm("حذف هذا الطلب؟")) return;
    await supabase.from(item.source === "leave" ? "leave_requests" : "hr_requests").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast({ title: "تم الحذف" });
  };

  const filtered = items.filter((r) => {
    if (filter && r.status !== filter) return false;
    if (search && !r.type.includes(search) && !r.approver.includes(search)) return false;
    return true;
  });

  const stats = [
    { label: "إجمالي المرسلة", value: items.length, color: "from-blue-500 to-indigo-600" },
    { label: "قيد المراجعة", value: items.filter((r) => r.status === "معلق").length, color: "from-yellow-500 to-orange-500" },
    { label: "تمت الموافقة", value: items.filter((r) => r.status === "موافق").length, color: "from-emerald-500 to-teal-600" },
  ];

  return (
    <Layout>
      <div className="space-y-5 w-full" dir="rtl">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-blue-600 font-medium">الطلبات</span>
          <span>/</span>
          <span>الطلبات المرسلة</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={cn("bg-gradient-to-br text-white rounded-xl p-4 shadow-sm", s.color)}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm opacity-85 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none">
              <option value="">جميع الحالات</option>
              <option value="معلق">معلق</option>
              <option value="موافق">موافق</option>
              <option value="مرفوض">مرفوض</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">الإجراءات</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">جهة الموافقة</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">الملاحظات</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">تاريخ الإرسال</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">نوع الطلب</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">لا توجد طلبات مرسلة</td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="عرض"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="حذف"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border", STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-600")}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.approver}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{r.notes}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{r.type}</td>
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
