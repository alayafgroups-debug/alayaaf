import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

type RequestRow = {
  id: string; requestDate: string; empId: string; empName: string;
  moveType: string; requestType: string; status: string; lastUpdate: string;
  adminNote: string; signatureData: string; signedAt: string; source: "leave" | "request";
};

const normalizeStatus = (raw: string) =>
  ["معلق", "معلقة", "pending"].includes(raw)
    ? "معلق"
    : ["موافق", "معتمدة", "approved"].includes(raw)
    ? "موافق"
    : ["مرفوض", "مرفوضة", "rejected"].includes(raw)
    ? "مرفوض"
    : (raw || "معلق");

export default function HRRequestsIncoming() {
  const { t, direction, formatDate, formatNumber } = useI18n();
  const [items, setItems] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leaveRes, reqRes] = await Promise.all([
        supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("hr_requests").select("*").order("created_at", { ascending: false }),
      ]);

      const leaveRows: RequestRow[] = (leaveRes.data ?? []).map((r: any) => ({
        id: String(r.id), requestDate: r.created_at ?? "",
        empId: r.emp_id ?? "", empName: r.emp_name ?? "",
        moveType: "طلب إجازة", requestType: r.leave_type ?? "",
        status: normalizeStatus(String(r.status ?? "").trim()),
        lastUpdate: r.updated_at ?? "",
        adminNote: r.admin_note ?? "", signatureData: r.signature_data ?? "", signedAt: r.signed_at ?? "", source: "leave",
      }));

      const reqRows: RequestRow[] = (reqRes.data ?? []).map((r: any) => ({
        id: String(r.id), requestDate: r.created_at ?? "",
        empId: r.emp_id ?? "", empName: r.emp_name ?? "",
        moveType: "طلب", requestType: r.request_type ?? "",
        status: normalizeStatus(String(r.status ?? "").trim()),
        lastUpdate: r.updated_at ?? "",
        adminNote: r.admin_note ?? "", signatureData: r.signature_data ?? "", signedAt: r.signed_at ?? "", source: "request",
      }));

      setItems([...leaveRows, ...reqRows].sort((a, b) => b.requestDate.localeCompare(a.requestDate)));
    } catch { setItems([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, []);

  const updateRequestStatus = async (item: RequestRow, status: "موافق" | "مرفوض") => {
    setUpdatingId(item.id);
    const { error } = await supabase
      .from(item.source === "leave" ? "leave_requests" : "hr_requests")
      .update({
        status,
        admin_note: reviewNotes[item.id]?.trim() || item.adminNote || null,
      })
      .eq("id", item.id);

    setUpdatingId(null);
    if (error) {
      toast({ title: t("تعذر تحديث الطلب"), description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: t(status === "موافق" ? "تمت الموافقة على الطلب" : "تم رفض الطلب") });
    loadData();
  };

  const filtered = items.filter((i) => !search || i.empName.includes(search) || i.empId.includes(search));
  const formatRequestDate = (value: string) => value ? formatDate(value, { dateStyle: "medium" }) : "—";
  const searchIconPosition = direction === "rtl" ? "right-3" : "left-3";
  const searchInputPadding = direction === "rtl" ? "pr-9" : "pl-9";

  return (
    <Layout>
      <div className="space-y-6 w-full" dir={direction}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t("الطلبات الواردة")}</h1>
        </div>

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="relative w-72">
              <Search className={`absolute ${searchIconPosition} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
              <Input placeholder={t("بحث بالاسم أو الرقم...")} value={search} onChange={(e) => setSearch(e.target.value)} className={searchInputPadding} />
            </div>
            <span className="text-sm text-gray-500">{formatNumber(filtered.length)} {t("طلب")}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start" dir={direction}>
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4 font-medium">{t("تاريخ الطلب")}</th>
                  <th className="py-3 px-4 font-medium">{t("اسم الموظف")}</th>
                  <th className="py-3 px-4 font-medium">{t("نوع الحركة")}</th>
                  <th className="py-3 px-4 font-medium">{t("نوع الطلب")}</th>
                  <th className="py-3 px-4 font-medium text-center">{t("الحالة")}</th>
                  <th className="py-3 px-4 font-medium text-center">{t("توقيع الموظف")}</th>
                  <th className="py-3 px-4 font-medium">{t("آخر تحديث")}</th>
                  <th className="py-3 px-4 font-medium text-center min-w-64">{t("ملاحظة الإدارة والإجراءات")}</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">{t("جاري التحميل...")}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">{t("لا توجد طلبات واردة")}</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">{formatRequestDate(row.requestDate)}</td>
                    <td className="py-3 px-4 font-medium">{row.empName}</td>
                    <td className="py-3 px-4">{t(row.moveType)}</td>
                    <td className="py-3 px-4">{row.requestType ? t(row.requestType) : "—"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.status === "موافق" ? "bg-emerald-100 text-emerald-800" : row.status === "مرفوض" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{t(row.status)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.signatureData ? (
                        <div className="inline-flex flex-col items-center gap-1">
                          <img src={row.signatureData} alt={`${t("توقيع الموظف")} ${row.empName}`} className="h-12 w-28 rounded border bg-white object-contain" />
                          <span className="text-[10px] text-gray-400">{t("موقّع إلكترونيًا")}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{t("طلب قديم بلا توقيع إلكتروني")}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{formatRequestDate(row.lastUpdate)}</td>
                    <td className="py-3 px-4">
                      {row.status === "معلق" ? (
                        <div className="space-y-2">
                          <textarea
                            value={reviewNotes[row.id] ?? row.adminNote}
                            onChange={(e) => setReviewNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            placeholder={t("اكتب ملاحظة للموظف (اختياري)")}
                            rows={2}
                            className="w-full resize-none rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                          />
                          <div className="flex justify-center gap-3">
                            <button disabled={updatingId === row.id} onClick={() => updateRequestStatus(row, "موافق")} className="text-emerald-500 hover:text-emerald-700 disabled:opacity-40" title={t("موافقة")}><CheckCircle className="h-5 w-5" /></button>
                            <button disabled={updatingId === row.id} onClick={() => updateRequestStatus(row, "مرفوض")} className="text-red-500 hover:text-red-700 disabled:opacity-40" title={t("رفض")}><XCircle className="h-5 w-5" /></button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">{row.adminNote || t("لا توجد ملاحظة")}</span>
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
