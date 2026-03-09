import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Request = {
  id: string;
  sender: string;
  type: string;
  date: string;
  status: "معلق" | "موافق" | "مرفوض";
  notes: string;
};

const MOCK: Request[] = [
  { id: "1", sender: "فاطمة حمدي سلطاني", type: "إجازة سنوية", date: "2026-03-08", status: "معلق", notes: "طلب إجازة لمدة 5 أيام" },
  { id: "2", sender: "أحمد محمد علي", type: "سلفة", date: "2026-03-07", status: "معلق", notes: "سلفة بمبلغ 2000 ريال" },
  { id: "3", sender: "عبدالله الغامدي", type: "نقل", date: "2026-03-06", status: "موافق", notes: "طلب نقل إلى الفرع الرئيسي" },
  { id: "4", sender: "سارة أحمد", type: "دورة تدريبية", date: "2026-03-05", status: "مرفوض", notes: "دورة إكسل متقدم" },
  { id: "5", sender: "محمد الزهراني", type: "عمل إضافي", date: "2026-03-04", status: "موافق", notes: "عمل إضافي نهاية الأسبوع" },
];

const STATUS_STYLE: Record<string, string> = {
  "معلق":   "bg-yellow-100 text-yellow-700 border-yellow-200",
  "موافق":  "bg-green-100 text-green-700 border-green-200",
  "مرفوض": "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICON: Record<string, JSX.Element> = {
  "معلق":   <Clock className="h-3 w-3" />,
  "موافق":  <CheckCircle className="h-3 w-3" />,
  "مرفوض": <XCircle className="h-3 w-3" />,
};

export default function HRRequestsIncoming() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = MOCK.filter((r) => {
    if (filter && r.status !== filter) return false;
    if (search && !r.sender.includes(search) && !r.type.includes(search)) return false;
    return true;
  });

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-5" dir="rtl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-blue-600 font-medium cursor-pointer hover:underline">الطلبات</span>
          <span>/</span>
          <span>الطلبات الواردة</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "إجمالي الطلبات", value: MOCK.length, color: "from-blue-500 to-indigo-600" },
            { label: "بانتظار الموافقة", value: MOCK.filter(r => r.status === "معلق").length, color: "from-yellow-500 to-orange-500" },
            { label: "تمت الموافقة", value: MOCK.filter(r => r.status === "موافق").length, color: "from-emerald-500 to-teal-600" },
          ].map((s) => (
            <div key={s.label} className={cn("bg-gradient-to-br text-white rounded-xl p-4 shadow-sm", s.color)}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm opacity-85 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input type="text" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none">
              <option value="">جميع الحالات</option>
              <option value="معلق">معلق</option>
              <option value="موافق">موافق</option>
              <option value="مرفوض">مرفوض</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">الإجراءات</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">الملاحظات</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">التاريخ</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">نوع الطلب</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">المرسل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="عرض"><Eye className="h-4 w-4" /></button>
                        <button className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="موافقة"><CheckCircle className="h-4 w-4" /></button>
                        <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="رفض"><XCircle className="h-4 w-4" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border", STATUS_STYLE[r.status])}>
                        {STATUS_ICON[r.status]} {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{r.notes}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{r.type}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{r.sender}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">لا توجد طلبات واردة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
