import { useI18n } from "@/i18n";
import { detailCodes, payrollCancelLog, requestCancelInfo } from "@/lib/approvalCancel";

/**
 * HR-24: ما رُفض عند الاعتماد بتحديد الموظفين، وما أُلغي اعتماده بعد الاعتماد (من ومتى والسبب).
 * names: أسماء الموظفين بالرقم الوظيفي إن توفرت (تفاصيل طلب الرواتب).
 */
export default function ApprovalCancelInfo({ details, names }: { details: Record<string, unknown>; names?: Record<string, string> }) {
  const { t, direction, formatDate, formatNumber } = useI18n();
  const rejected = detailCodes(details, "rejected_employee_ids");
  const log = payrollCancelLog(details);
  const requestCancel = requestCancelInfo(details);
  if (rejected.length === 0 && log.length === 0 && !requestCancel) return null;

  const formatDateTime = (value: string) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : `${formatDate(value)} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" })}`;
  };
  const who = (codes: string[]) => codes.map((code) => (names?.[code] ? `${names[code]} (${code})` : code)).join(direction === "rtl" ? "، " : ", ");

  return (
    <div className="space-y-2">
      {rejected.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <p className="font-semibold">
            {t("رُفضوا عند الاعتماد ورجعوا لمسؤول الرواتب للتصحيح")} ({formatNumber(rejected.length)})
          </p>
          <p className="mt-1 text-xs">{who(rejected)}</p>
        </div>
      )}
      {log.map((entry, index) => (
        <div key={`${entry.at}-${index}`} className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">
          <p className="font-semibold">
            {t("إلغاء الاعتماد")} — {formatDateTime(entry.at)}
            {entry.byName && <> — {t("بواسطة")} {entry.byName}</>}
          </p>
          <p className="mt-1">{t("السبب")}: {entry.note || "—"}</p>
          {entry.employeeIds.length > 0 && (
            <p className="mt-1 text-xs">
              {t("الموظفون")} ({formatNumber(entry.employeeIds.length)}): {who(entry.employeeIds)}
            </p>
          )}
        </div>
      ))}
      {requestCancel && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">
          <p className="font-semibold">
            {t("إلغاء الاعتماد")} — {formatDateTime(requestCancel.at)}
            {requestCancel.byName && <> — {t("بواسطة")} {requestCancel.byName}</>}
          </p>
          <p className="mt-1">{t("السبب")}: {requestCancel.note || "—"}</p>
        </div>
      )}
    </div>
  );
}
