import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Eye, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Request = {
  id: string;
  type: string;
  date: string;
  status: "معلق" | "موافق" | "مرفوض";
  notes: string;
  approver: string;
};

const MOCK: Request[] = [
  { id: "1", type: "إجازة سنوية", date: "2026-03-09", status: "معلق", notes: "طلب إجازة لمدة 3 أيام", approver: "مدير الموارد البشرية" },
  { id: "2", type: "سلفة", date: "2026-03-07", status: "موافق", notes: "سلفة بمبلغ 1500 ريال", approver: "المدير المالي" },
  { id: "3", type: "عمل إضافي", date: "2026-03-05", status: "مرفوض", notes: "عمل إضافي الجمعة", approver: "المدير المباشر" },
  { id: "4", type: "دورة تدريبية", date: "2026-03-03", status: "موافق", notes: "دورة إدارة المشاريع", approver: "مدير الموارد البشرية" },
  { id: "5", type: "نقل", date: "2026-02-28", status: "معلق", notes: "طلب نقل إلى قسم المبيعات", approver: "الإدارة العليا" },
];

const STATUS_STYLE: Record<string, string> = {
  "معلق":   "bg-yellow-100 text-yellow-700 border-yellow-200",
  "موافق":  "bg-green-100 text-green-700 border-green-200",
  "مرفوض": "bg-red-100 text-red-700 border-red-200",
};

export default function HRRequestsSent() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = MOCK.filter((r) => {
    if (filter && r.status !== filter) return false;
    if (search && !r.type.includes(search) && !r.approver.includes(search)) return false;
    return true;
  });

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-5" dir="rtl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-blue-600 font-medium cursor-pointer hover:underline">الطلبات</span>
          <span>/</span>
          <span>الطلبات المرسلة</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "إجمالي المرسلة", value: MOCK.length, color: "from-blue-500 to-indigo-600" },
            { label: "قيد المراجعة", value: MOCK.filter(r => r.status === "معلق").length, color: "from-yellow-500 to-orange-500" },
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
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="عرض"><Eye className="h-4 w-4" /></button>
                        <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="حذف"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border", STATUS_STYLE[r.status])}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.approver}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{r.notes}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{r.type}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">لا توجد طلبات مرسلة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
