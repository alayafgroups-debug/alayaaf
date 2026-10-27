import { useEffect, useRef, useState } from "react";
import { ChevronLeft, AlertTriangle, FileText, Loader2, MessageSquareReply, Send } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";
import { hrRequestErrorText } from "@/lib/hrErrors";
import {
  PENALTY_REPLIED_STATUS,
  PENALTY_REPLY_MAX,
  formatPenaltyReplyTime,
  isPenaltySentStatus,
  readPenaltyReply,
  type PenaltyReplyKind,
} from "@/lib/penaltyReply";

type Props = { empId: string; onBack: () => void };

type Item = {
  id: string;
  kind: "مساءلة" | "إنذار";
  date: string;
  subject: string;
  message: string;
  status: string;
  sender_name: string | null;
  // HR-22: رد الموظف (عذره) ووقته
  reply: string;
  replyAt: string;
};

const SOURCES = {
  investigations: { table: "penalty_investigations", dateKey: "investigation_date", kind: "مساءلة" as const },
  warnings: { table: "penalty_warnings", dateKey: "warning_date", kind: "إنذار" as const },
};

const replyKindOf = (item: Item): PenaltyReplyKind => (item.kind === "إنذار" ? "warning" : "investigation");

// «*»: أعمدة الرد تُقرأ إن وُجدت، فلا تتعطل الصفحة قبل تحديث قاعدة البيانات (HR-22)
const toItem = (r: any, source: (typeof SOURCES)[keyof typeof SOURCES]): Item => ({
  id: r.id,
  kind: source.kind,
  date: r[source.dateKey],
  subject: r.subject,
  message: r.message,
  status: r.status,
  sender_name: r.sender_name,
  ...readPenaltyReply(r),
});

export default function PenaltiesPage({ empId, onBack }: Props) {
  const { t, direction } = useI18n();
  const [tab, setTab] = useState<"investigations" | "warnings">("investigations");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Item | null>(null);
  const [replyText, setReplyText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");
  // السجل المفتوح الآن: نتيجة إرسال انتهت بعد الانتقال إلى سجل آخر لا تظهر عليه
  const openKey = useRef("");
  openKey.current = selected ? `${selected.kind}:${selected.id}` : "";

  useEffect(() => {
    async function load() {
      setLoading(true);
      const source = SOURCES[tab];
      const { data } = await supabase
        .from(source.table)
        .select("*")
        .eq("emp_id", empId)
        .order(source.dateKey, { ascending: false });
      setItems((data ?? []).map((r: any) => toItem(r, source)));
      setLoading(false);
    }
    load();
  }, [tab, empId]);

  // كل سجل يُفتح بنموذج رد فارغ
  useEffect(() => {
    setReplyText("");
    setConfirming(false);
    setSending(false);
    setReplyError("");
  }, [selected?.id, selected?.kind]);

  const applyItem = (updated: Item) => {
    setSelected((current) => (current && current.id === updated.id && current.kind === updated.kind ? updated : current));
    setItems((current) => current.map((item) => (item.id === updated.id && item.kind === updated.kind ? updated : item)));
  };

  // يُعاد تحميل السجل (إن أُرسل الرد من جهاز آخر مثلًا)
  const refreshItem = async (item: Item) => {
    const source = item.kind === "إنذار" ? SOURCES.warnings : SOURCES.investigations;
    const { data } = await supabase.from(source.table).select("*").eq("id", item.id).maybeSingle();
    if (data) applyItem(toItem(data, source));
  };

  const sendReply = async () => {
    if (!selected || sending) return;
    const text = replyText.trim();
    if (!text) {
      setReplyError(t("اكتب ردك قبل الإرسال"));
      setConfirming(false);
      return;
    }
    setSending(true);
    setReplyError("");
    const target = selected;
    const targetKey = `${target.kind}:${target.id}`;
    const { data, error } = await supabase.rpc("penalty_submit_reply", {
      p_kind: replyKindOf(target),
      p_id: target.id,
      p_reply: text,
    });
    const stillOpen = openKey.current === targetKey;
    if (stillOpen) {
      setSending(false);
      setConfirming(false);
    }
    if (error) {
      if (stillOpen) setReplyError(hrRequestErrorText(error));
      if (String(error.message ?? "").includes("PENALTY_REPLY_ALREADY_SENT")) void refreshItem(target);
      return;
    }
    const row = (data ?? {}) as { employee_reply?: string; employee_reply_at?: string; status?: string };
    applyItem({
      ...target,
      reply: row.employee_reply || text,
      replyAt: row.employee_reply_at || new Date().toISOString(),
      status: row.status || target.status,
    });
    if (stillOpen) setReplyText("");
  };

  if (selected) {
    const replyTime = formatPenaltyReplyTime(selected.replyAt);
    const tooLong = replyText.trim().length > PENALTY_REPLY_MAX;
    return (
      <div className="flex flex-col h-full" dir={direction}>
        <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
          <button onClick={() => setSelected(null)} className="text-[#004e89]"><ChevronLeft className={`h-6 w-6 ${direction === "rtl" ? "rotate-180" : ""}`} /></button>
          <h2 className="font-bold text-lg text-gray-900">{t(selected.kind)} — {selected.date}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mb-4 ${selected.kind === "إنذار" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{t(selected.kind)}</div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">{selected.subject}</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{selected.message}</p>
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-400">{t("التاريخ")}</span><span className="text-gray-700">{selected.date}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">{t("من")}</span><span className="text-gray-700">{selected.sender_name ?? "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">{t("الحالة")}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${String(selected.status ?? "").trim() === PENALTY_REPLIED_STATUS ? "bg-emerald-100 text-emerald-700" : isPenaltySentStatus(selected.status) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>{t(selected.status)}</span></div>
            </div>
          </div>

          {/* HR-22: رد الموظف وتوضيح عذره */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
              <MessageSquareReply className="h-5 w-5 text-[#004e89]" />
              {selected.reply ? t("ردك") : t("الرد وتوضيح العذر")}
            </h3>
            {selected.reply ? (
              <>
                <p dir="auto" className="whitespace-pre-wrap break-words rounded-lg bg-emerald-50 p-3 text-sm leading-7 text-gray-800">{selected.reply}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {t("أُرسل الرد إلى الموارد البشرية")}
                  {replyTime && <> — <span dir="ltr">{replyTime}</span></>}
                </p>
              </>
            ) : (
              <>
                <textarea
                  value={replyText}
                  onChange={(event) => { setReplyText(event.target.value); setReplyError(""); setConfirming(false); }}
                  disabled={sending}
                  rows={5}
                  dir="auto"
                  maxLength={PENALTY_REPLY_MAX + 200}
                  placeholder={t("اكتب ردك وعذرك هنا")}
                  className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm leading-7 outline-none focus:ring-2 focus:ring-[#004e89] disabled:bg-gray-50"
                />
                <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-500">{t("يُرسل الرد مرة واحدة ولا يمكن تعديله بعد الإرسال")}</span>
                  <span className={`shrink-0 whitespace-nowrap ${tooLong ? "font-semibold text-red-600" : "text-gray-400"}`} dir="ltr">
                    {replyText.trim().length} / {PENALTY_REPLY_MAX}
                  </span>
                </div>
                {replyError && <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{replyError}</p>}
                {confirming ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-800">{t("تأكيد إرسال الرد؟ لا يمكن تعديله بعد الإرسال")}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void sendReply()}
                        disabled={sending}
                        className="flex items-center gap-1 rounded-md bg-[#004e89] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003d6d] disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {sending ? t("جاري الإرسال...") : t("تأكيد الإرسال")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        disabled={sending}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {t("تراجع")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!replyText.trim()) { setReplyError(t("اكتب ردك قبل الإرسال")); return; }
                      if (tooLong) { setReplyError(hrRequestErrorText({ message: "PENALTY_REPLY_TOO_LONG" })); return; }
                      setConfirming(true);
                    }}
                    className="mt-3 flex items-center gap-1 rounded-md bg-[#004e89] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003d6d]"
                  >
                    <Send className="h-4 w-4" />
                    {t("إرسال الرد")}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" dir={direction}>
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <button onClick={onBack} className="text-[#004e89]"><ChevronLeft className={`h-6 w-6 ${direction === "rtl" ? "rotate-180" : ""}`} /></button>
          <h2 className="font-bold text-lg text-gray-900">{t("المساءلات والإنذارات")}</h2>
        </div>
        <div className="flex border-b">
          <button onClick={() => setTab("investigations")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${tab === "investigations" ? "border-[#004e89] text-[#004e89]" : "border-transparent text-gray-500"}`}>{t("المساءلات")}</button>
          <button onClick={() => setTab("warnings")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${tab === "warnings" ? "border-[#004e89] text-[#004e89]" : "border-transparent text-gray-500"}`}>{t("الإنذارات")}</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t("جاري التحميل...")}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />{t("لا توجد سجلات")}</div>
        ) : (
          items.map((item) => (
            <button key={item.id} onClick={() => setSelected(item)} className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 flex items-start gap-3 hover:shadow-md transition text-start">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.kind === "إنذار" ? "bg-red-100" : "bg-orange-100"}`}>
                <AlertTriangle className={`h-5 w-5 ${item.kind === "إنذار" ? "text-red-600" : "text-orange-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{item.subject}</p>
                <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>{item.date}</span>
                  {item.reply
                    ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{t("تم الرد")}</span>
                    : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">{t("لم ترد بعد")}</span>}
                </p>
              </div>
              <ChevronLeft className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
