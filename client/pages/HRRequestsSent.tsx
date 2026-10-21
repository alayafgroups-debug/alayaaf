import { useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Search, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { readUserSession } from "@/lib/authSession";
import { hrRequestErrorText } from "@/lib/hrErrors";
import RequestDetailsDialog, { loadRecipientNames, type RequestDetailsView } from "@/components/hr/RequestDetailsDialog";

type Request = { id: string; type: string; date: string; status: string; rawStatus: string; notes: string; approver: string; senderDepartment: string; senderName: string; source: "leave" | "request"; view: Omit<RequestDetailsView, "recipientName" | "recipientLoading"> };

const recipientKey = (source: "leave" | "request", id: string) => `${source}:${id}`;

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
  const { t, direction, formatDate, formatNumber } = useI18n();
  const [items, setItems] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  // من استلم كل طلب (اسم صاحب حساب المستلم من قاعدة البيانات)، يُحمَّل مرة لكل طلب
  const [recipients, setRecipients] = useState<Record<string, string>>({});
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsError, setRecipientsError] = useState(false);
  const knownRecipients = useRef(new Set<string>());
  const [detail, setDetail] = useState<Request | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const session = readUserSession();
      if (!session?.id) {
        setItems([]);
        return;
      }

      const [leaveRes, reqRes] = await Promise.all([
        supabase.from("leave_requests").select("*").eq("sender_auth_user_id", session.id).order("created_at", { ascending: false }),
        supabase.from("hr_requests").select("*").eq("sender_auth_user_id", session.id).order("created_at", { ascending: false }),
      ]);

      const leaveRows: Request[] = (leaveRes.data ?? []).map((r: any) => ({
        id: String(r.id), type: r.leave_type ?? "إجازة",
        date: r.created_at ?? "",
        status: normalizeStatus(String(r.status ?? "").trim()), rawStatus: String(r.status ?? ""), notes: r.admin_note ?? r.notes ?? "-",
        approver: r.approver_name ?? "-", senderDepartment: "", senderName: r.emp_name ?? "", source: "leave",
        view: {
          source: "leave", requestType: String(r.leave_type ?? "إجازة"), status: String(r.status ?? ""), requestDate: String(r.created_at ?? ""),
          empId: String(r.emp_id ?? ""), empName: String(r.emp_name ?? ""), senderDepartment: "", senderName: String(r.emp_name ?? ""),
          startDate: String(r.start_date ?? ""), endDate: String(r.end_date ?? ""), days: r.days === null || r.days === undefined ? null : Number(r.days),
          notes: String(r.notes ?? ""), adminNote: String(r.admin_note ?? ""), signatureData: String(r.signature_data ?? ""), signedAt: String(r.signed_at ?? ""),
          details: {},
        },
      }));

      const reqRows: Request[] = (reqRes.data ?? []).map((r: any) => {
        const details = r.details && typeof r.details === "object" ? r.details as Record<string, unknown> : {};
        return {
          id: String(r.id), type: r.request_type ?? "طلب",
          date: r.created_at ?? "",
          status: normalizeStatus(String(r.status ?? "").trim()),
          rawStatus: String(r.status ?? ""),
          notes: r.admin_note ?? "-",
          approver: String(details.reviewed_by_name ?? "-"),
          senderDepartment: String(details.sender_department ?? ""),
          senderName: String(details.sender_name ?? r.emp_name ?? ""),
          source: "request" as const,
          view: {
            source: "request" as const, requestType: String(r.request_type ?? "طلب"), status: String(r.status ?? ""), requestDate: String(r.created_at ?? ""),
            empId: String(r.emp_id ?? ""), empName: String(r.emp_name ?? ""), senderDepartment: String(details.sender_department ?? ""),
            senderName: String(details.sender_name ?? r.emp_name ?? ""), startDate: String(r.start_date ?? ""), endDate: String(r.end_date ?? ""), days: null,
            notes: "", adminNote: String(r.admin_note ?? ""), signatureData: String(r.signature_data ?? ""), signedAt: String(r.signed_at ?? ""),
            details,
          },
        };
      });

      setItems([...leaveRows, ...reqRows].sort((a, b) => b.date.localeCompare(a.date)));
      void loadRecipients(leaveRows, reqRows);
    } catch { setItems([]); } finally { setLoading(false); }
  };

  const loadRecipients = async (leaveRows: Request[], reqRows: Request[]) => {
    const newLeaves = leaveRows.filter((row) => !knownRecipients.current.has(recipientKey("leave", row.id))).map((row) => row.id);
    const newRequests = reqRows.filter((row) => !knownRecipients.current.has(recipientKey("request", row.id))).map((row) => row.id);
    if (!newLeaves.length && !newRequests.length) return;
    setRecipientsLoading(true);
    try {
      const empty = { names: {} as Record<string, string>, ok: true };
      const [leaveNames, requestNames] = await Promise.all([
        newLeaves.length ? loadRecipientNames(supabase, "leave_requests", newLeaves) : Promise.resolve(empty),
        newRequests.length ? loadRecipientNames(supabase, "hr_requests", newRequests) : Promise.resolve(empty),
      ]);
      // ما تعذر جلبه يُعاد طلبه في التحديث التالي
      if (leaveNames.ok) newLeaves.forEach((id) => knownRecipients.current.add(recipientKey("leave", id)));
      if (requestNames.ok) newRequests.forEach((id) => knownRecipients.current.add(recipientKey("request", id)));
      setRecipientsError(!leaveNames.ok || !requestNames.ok);
      setRecipients((current) => {
        const next = { ...current };
        Object.entries(leaveNames.names).forEach(([id, name]) => { next[recipientKey("leave", id)] = name; });
        Object.entries(requestNames.names).forEach(([id, name]) => { next[recipientKey("request", id)] = name; });
        return next;
      });
    } finally {
      setRecipientsLoading(false);
    }
  };

  // المعتمد: بعد القرار من راجع الطلب، وقبله من استلمه (بانتظار)
  const approverText = (r: Request) => {
    const recipient = recipients[recipientKey(r.source, r.id)] ?? "";
    if (r.status === "معلق") return recipient ? `${t("بانتظار")}: ${recipient}` : "-";
    return r.approver !== "-" ? r.approver : recipient || "-";
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, []);

  // الحذف للطلب المعلق فقط (سياسة الخادم)؛ نتحقق من أن الصف حُذف فعلًا
  const handleDelete = async (item: Request) => {
    if (!confirm(t("حذف هذا الطلب؟"))) return;
    const { error } = await supabase.from(item.source === "leave" ? "leave_requests" : "hr_requests").delete().eq("id", item.id).select("id").single();
    if (error) {
      toast({
        title: t("تعذر الحذف"),
        description: error.code === "PGRST116" ? t("يُحذف الطلب المعلق فقط") : t(hrRequestErrorText(error)),
        variant: "destructive",
      });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast({ title: t("تم الحذف") });
  };

  const filtered = items.filter((r) => {
    if (filter && r.status !== filter) return false;
    if (search && !r.type.includes(search) && !approverText(r).includes(search) && !r.senderDepartment.includes(search) && !r.senderName.includes(search)) return false;
    return true;
  });

  const stats = [
    { label: t("إجمالي المرسلة"), value: items.length, color: "from-blue-500 to-indigo-600" },
    { label: t("قيد المراجعة"), value: items.filter((r) => r.status === "معلق").length, color: "from-yellow-500 to-orange-500" },
    { label: t("تمت الموافقة"), value: items.filter((r) => r.status === "موافق").length, color: "from-emerald-500 to-teal-600" },
  ];

  return (
    <Layout>
      <div className="space-y-5 w-full" dir={direction}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-blue-600 font-medium">{t("الطلبات")}</span>
          <span>/</span>
          <span>{t("الطلبات المرسلة")}</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={cn("bg-gradient-to-br text-white rounded-xl p-4 shadow-sm", s.color)}>
              <p className="text-3xl font-bold">{formatNumber(s.value)}</p>
              <p className="text-sm opacity-85 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input type="text" placeholder={t("بحث...")} value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none">
              <option value="">{t("جميع الحالات")}</option>
              <option value="معلق">{t("معلق")}</option>
              <option value="موافق">{t("موافق")}</option>
              <option value="مرفوض">{t("مرفوض")}</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={direction}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-start font-semibold text-gray-700">{t("إجراءات")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-700">{t("الحالة")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-700">{t("المرسل (القسم أو الموظف)")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-700">{t("المعتمد")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-700">{t("الملاحظات")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-700">{t("تاريخ الإرسال")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-700">{t("نوع الطلب")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">{t("جاري التحميل...")}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">{t("لا توجد طلبات مرسلة")}</td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetail(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title={t("معاينة الإجراءات")}><Eye className="h-4 w-4" /></button>
                        {["معلق", "معلقة", "pending", ""].includes(String(r.rawStatus ?? "").trim()) && (
                          <button onClick={() => handleDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title={t("حذف")}><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border", STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-600")}>{t(r.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600"><div>{r.senderDepartment || r.senderName}</div>{r.senderDepartment && r.senderName && <div className="mt-1 text-xs text-gray-400">{r.senderName}</div>}</td>
                    <td className="px-4 py-3 text-gray-600">{approverText(r)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{r.notes}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.date ? formatDate(r.date) : "-"}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{t(r.type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <RequestDetailsDialog
        request={detail ? {
          ...detail.view,
          recipientName: recipients[recipientKey(detail.source, detail.id)] ?? "",
          recipientLoading: recipientsLoading && !knownRecipients.current.has(recipientKey(detail.source, detail.id)),
          recipientError: recipientsError && !knownRecipients.current.has(recipientKey(detail.source, detail.id)),
        } : null}
        onClose={() => setDetail(null)}
      />
    </Layout>
  );
}
