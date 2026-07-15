import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Printer, FileText, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type PenaltyRow = {
  id: string;
  employee_id: string | null;
  emp_name: string | null;
  penalty_type: string | null;
  amount: number | null;
  reason: string | null;
  date: string | null;
  status: string | null;
  created_at: string | null;
};

export default function HRPenaltiesArchive() {
  const [rows, setRows] = useState<PenaltyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [typeFilter, setTypeFilter] = useState("الكل");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("penalties")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "خطأ في التحميل", description: error.message, variant: "destructive" });
    } else {
      setRows((data as PenaltyRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const penaltyTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.penalty_type).filter(Boolean))) as string[],
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (statusFilter !== "الكل" && (r.status ?? "") !== statusFilter) return false;
        if (typeFilter !== "الكل" && (r.penalty_type ?? "") !== typeFilter) return false;
        return true;
      }),
    [rows, statusFilter, typeFilter],
  );

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الجزاء من الأرشيف؟")) return;
    const { error } = await supabase.from("penalties").delete().eq("id", id);
    if (error) {
      toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "تم الحذف" });
  };

  const handlePrint = () => window.print();

  const handleExport = () => {
    const header = ["رقم المساءلة", "إسم الموظف", "المخالفة", "الجزاء", "المبلغ", "الحالة", "التاريخ"];
    const lines = filtered.map((r) =>
      [r.id, r.emp_name ?? "", r.reason ?? "", r.penalty_type ?? "", r.amount ?? 0, r.status ?? "", r.date ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "penalties-archive.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#004e89] text-white p-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <h2 className="text-lg font-bold whitespace-nowrap hidden sm:block">ارشيف الجزاءات</h2>
              <div className="flex gap-2 text-black w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 rounded px-2 text-sm bg-white border-none outline-none flex-1 sm:w-[120px]"
                >
                  <option>الكل</option>
                  <option>معتمد</option>
                  <option>معلق</option>
                  <option>مرفوض</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-8 rounded px-2 text-sm bg-white border-none outline-none flex-1 sm:w-[180px]"
                >
                  <option>الكل</option>
                  {penaltyTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <h2 className="text-lg font-bold sm:hidden">ارشيف الجزاءات</h2>
              <div className="flex items-center gap-2">
                <button onClick={handleExport} className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="تصدير">
                  <Download className="h-4 w-4" />
                </button>
                <button onClick={load} className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="تحديث">
                  <FileText className="h-4 w-4" />
                </button>
                <button onClick={handlePrint} className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="طباعة">
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-2 font-medium">رقم المساءلة</th>
                  <th className="py-3 px-2 font-medium min-w-[150px]">إسم الموظف</th>
                  <th className="py-3 px-2 font-medium">رقم الموظف</th>
                  <th className="py-3 px-2 font-medium min-w-[160px]">المخالفة</th>
                  <th className="py-3 px-2 font-medium">الجزاء</th>
                  <th className="py-3 px-2 font-medium">المبلغ</th>
                  <th className="py-3 px-2 font-medium">الحالة</th>
                  <th className="py-3 px-2 font-medium">تاريخ الإضافة</th>
                  <th className="py-3 px-2 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#004e89]" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <FileText className="h-10 w-10 text-gray-300" />
                        <p>لا توجد بيانات في الجدول</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-2 text-gray-500">{r.id.slice(0, 8)}</td>
                      <td className="py-2.5 px-2 font-medium text-gray-800">{r.emp_name || "-"}</td>
                      <td className="py-2.5 px-2 text-gray-600">{r.employee_id || "-"}</td>
                      <td className="py-2.5 px-2 text-gray-600">{r.reason || "-"}</td>
                      <td className="py-2.5 px-2 text-gray-600">{r.penalty_type || "-"}</td>
                      <td className="py-2.5 px-2 text-red-600 font-medium">{Number(r.amount ?? 0).toLocaleString()}</td>
                      <td className="py-2.5 px-2">
                        <span
                          className={
                            "px-2 py-0.5 rounded-full text-xs " +
                            ((r.status ?? "") === "معتمد"
                              ? "bg-green-100 text-green-700"
                              : (r.status ?? "") === "مرفوض"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700")
                          }
                        >
                          {r.status || "معلق"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-gray-500">
                        {r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString("ar-EG") : "-")}
                      </td>
                      <td className="py-2.5 px-2">
                        <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700" title="حذف">
                          <Trash2 className="h-4 w-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">يعرض {filtered.length} من أصل {rows.length} سجل</span>
            <div className="flex gap-1 opacity-50 pointer-events-none">
              <Button variant="outline" size="sm" className="h-8 px-3">السابق</Button>
              <Button variant="outline" size="sm" className="h-8 px-3">التالي</Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
