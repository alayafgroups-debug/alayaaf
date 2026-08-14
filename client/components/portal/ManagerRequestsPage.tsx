import { useEffect, useState } from "react";
import { Search, ChevronLeft, CheckCircle, XCircle, Eye, Loader2, Filter } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

type Props = { onBack: () => void };

type Request = {
  id: string;
  rawTable: "leave_requests" | "payroll";
  reqNumber: number;
  empName: string;
  type: string;
  status: string;
  date: string;
  details: string;
  signatureData: string;
};

export default function ManagerRequestsPage({ onBack }: Props) {
  const { t, direction, formatDate, formatNumber } = useI18n();
  const [tab, setTab] = useState<"pending" | "incoming" | "sent">("pending");
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Request | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    load();
  }, [tab]);

  async function load() {
    setLoading(true);
    try {
      const [leavesResult, payrollResult] = await Promise.all([
        supabase
          .from("leave_requests")
          .select("id, emp_name, leave_type, start_date, end_date, days, status, notes, signature_data, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("payroll")
          .select("id, emp_name, month, basic_salary, net_salary, status, created_at")
          .order("created_at", { ascending: false }),
      ]);

      const leaveRows: Request[] = (leavesResult.data ?? []).map((r: any, idx: number) => ({
        id: `leave-${r.id}`,
        rawTable: "leave_requests",
        reqNumber: 1000 + idx,
        empName: r.emp_name ?? "—",
        type: `إجازة — ${r.leave_type ?? ""}`,
        status: normalizeStatus(r.status),
        date: r.created_at ?? "",
        details: `${r.days ?? 0} يوم من ${r.start_date ?? ""} إلى ${r.end_date ?? ""}${r.notes ? ` — ${r.notes}` : ""}`,
        signatureData: r.signature_data ?? "",
      }));

      const payrollRows: Request[] = (payrollResult.data ?? []).map((r: any, idx: number) => ({
        id: `payroll-${r.id}`,
        rawTable: "payroll",
        reqNumber: 2000 + idx,
        empName: r.emp_name ?? "—",
        type: `صرف رواتب الموظفين`,
        status: r.status === "مدفوع" ? "موافق" : normalizeStatus(r.status),
        date: r.created_at ?? "",
        details: `${t("شهر")} ${r.month} — ${t("صافي")} ${formatNumber(+r.net_salary)} ${t("ر.س")}`,
        signatureData: "",
      }));

      const all = [...leaveRows, ...payrollRows].sort((a, b) => b.date.localeCompare(a.date));

      if (tab === "pending") setRequests(all.filter((r) => r.status === "معلق"));
      else if (tab === "incoming") setRequests(all.filter((r) => r.status === "موافق"));
      else setRequests(all);
    } finally {
      setLoading(false);
    }
  }

  function normalizeStatus(s: string) {
    if (!s) return "معلق";
    if (["معتمدة", "مقبول", "approved", "موافق", "مدفوع"].includes(s)) return "موافق";
    if (["مرفوض", "مرفوضة", "rejected"].includes(s)) return "مرفوض";
    return "معلق";
  }

  async function handleApprove(req: Request) {
    setProcessing(true);
    try {
      if (req.rawTable === "leave_requests") {
        await supabase.from("leave_requests").update({ status: "معتمدة" }).eq("id", req.id.replace("leave-", ""));
      } else {
        await supabase.from("payroll").update({ status: "مدفوع", paid_date: new Date().toISOString().split("T")[0] }).eq("id", req.id.replace("payroll-", ""));
      }
      toast.success(t("تمت الموافقة على الطلب"));
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(t("تعذرت الموافقة"));
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject(req: Request) {
    setProcessing(true);
    try {
      if (req.rawTable === "leave_requests") {
        await supabase.from("leave_requests").update({ status: "مرفوضة" }).eq("id", req.id.replace("leave-", ""));
      } else {
        await supabase.from("payroll").update({ status: "مرفوض" }).eq("id", req.id.replace("payroll-", ""));
      }
      toast.success(t("تم رفض الطلب"));
      setSelected(null);
      await load();
    } catch {
      toast.error(t("تعذر رفض الطلب"));
    } finally {
      setProcessing(false);
    }
  }

  const filtered = requests.filter(
    (r) => !search || r.empName.includes(search) || r.type.includes(search),
  );

  const statusColor = (s: string) =>
    s === "موافق" ? "bg-green-100 text-green-700" : s === "مرفوض" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";

  if (selected) {
    const isPending = selected.status === "معلق";
    return (
      <div className="flex flex-col h-full" dir={direction}>
        <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
          <button onClick={() => setSelected(null)} className="text-[#004e89]"><ChevronLeft className={`h-6 w-6 ${direction === "rtl" ? "rotate-180" : ""}`} /></button>
          <h2 className="font-bold text-lg text-gray-900">{t("تفاصيل الطلب")}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50">
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(selected.status)}`}>{t(selected.status)}</span>
              <p className="text-gray-400 text-xs">#{selected.reqNumber}</p>
            </div>
            {[
              { label: "الاسم", value: selected.empName },
              { label: "نوع الطلب", value: selected.type },
              { label: "التاريخ", value: selected.date ? formatDate(selected.date, { dateStyle: "medium" }) : "" },
              { label: "التفاصيل", value: selected.details },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0 gap-3">
                <span className="text-gray-500 text-sm flex-shrink-0">{t(label)}</span>
                <span className="text-gray-800 text-sm text-start">{value}</span>
              </div>
            ))}
            {selected.rawTable === "leave_requests" && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="mb-2 text-sm text-gray-500">{t("توقيع الموظف")}</p>
                {selected.signatureData ? (
                  <img src={selected.signatureData} alt={`توقيع ${selected.empName}`} className="h-24 w-full rounded-lg border bg-white object-contain" />
                ) : (
                  <p className="rounded-lg bg-gray-50 p-3 text-center text-xs text-gray-400">{t("طلب قديم بلا توقيع إلكتروني")}</p>
                )}
              </div>
            )}
          </div>

          {isPending && (
            <div className="flex gap-3">
              <button onClick={() => handleReject(selected)} disabled={processing} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-500 text-red-500 font-bold text-sm">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-5 w-5" />} {t("رفض")}
              </button>
              <button onClick={() => handleApprove(selected)} disabled={processing} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#004e89] text-white font-bold text-sm">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-5 w-5" />} {t("موافقة")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" dir={direction}>
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <button onClick={onBack} className="text-[#004e89]"><ChevronLeft className={`h-6 w-6 ${direction === "rtl" ? "rotate-180" : ""}`} /></button>
          <h2 className="font-bold text-lg text-gray-900">{t("الطلبات")}</h2>
        </div>
        <div className="flex border-b">
          {[{ key: "pending", label: "معلقة" }, { key: "incoming", label: "الواردة" }, { key: "sent", label: "المرسلة" }].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key as any)} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${tab === key ? "border-[#004e89] text-[#004e89]" : "border-transparent text-gray-500"}`}>{t(label)}</button>
          ))}
        </div>
        <div className="px-3 pb-3 pt-2 flex gap-2">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("بحث...")} className="w-full ps-9 pe-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004e89]" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 pb-24 bg-gray-50">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t("جاري التحميل...")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">{t("لا توجد طلبات")}</div>
        ) : (
          filtered.map((req, i) => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-400 text-xs">{req.date ? formatDate(req.date, { dateStyle: "medium" }) : ""}</p>
                <p className="text-gray-500 text-xs">#{1180 + i}</p>
              </div>
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-sm"><span className="text-gray-500">{t("الاسم")}</span><span className="font-semibold">{req.empName}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">{t("نوع الطلب")}</span><span>{req.type}</span></div>
                <div className="flex justify-center"><span className={`px-3 py-0.5 rounded-full text-xs font-medium ${statusColor(req.status)}`}>{t(req.status)}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(req)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
                  <Eye className="h-4 w-4" /> {t("عرض")}
                </button>
                {req.status === "معلق" && (
                  <button onClick={() => setSelected(req)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-[#004e89] text-[#004e89] text-sm font-medium hover:bg-blue-50">
                    {t("معالجة")}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
