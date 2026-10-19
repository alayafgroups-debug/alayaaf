import { X } from "lucide-react";
import { useI18n } from "@/i18n";
import { requestFormSchemas } from "@/components/hr/formSchemas";
import { daysInclusive } from "@/lib/hrDates";

/** طلب للعرض فقط (الطلبات المرسلة وطلبات الإجازات): نفس محتوى نافذة الطلبات الواردة بلا أزرار قرار */
export type RequestDetailsView = {
  source: "leave" | "request";
  requestType: string;
  status: string;
  requestDate: string;
  empId: string;
  empName: string;
  senderDepartment: string;
  senderName: string;
  startDate: string;
  endDate: string;
  days: number | null;
  notes: string;
  adminNote: string;
  signatureData: string;
  signedAt: string;
  details: Record<string, unknown>;
  /** صاحب حساب المستلم (من قاعدة البيانات)، أو "" إن لم يصل الطلب لأحد */
  recipientName: string;
  recipientLoading?: boolean;
  /** تعذر جلب اسم المستلم (الدالة غير مثبتة أو خطأ اتصال) */
  recipientError?: boolean;
};

// مفاتيح داخلية في details لا تُعرض كمحتوى للطلب (نفس قائمة الطلبات الواردة)
const INTERNAL_DETAIL_KEYS = new Set([
  "workflow", "review_decision", "payroll_period", "employee_ids", "active_employee_ids", "stopped_employee_ids", "active_amounts", "stopped_amounts",
  "employee_count", "active_employee_count", "stopped_employee_count", "stop_reason", "computed_on",
]);
const isInternalDetailKey = (key: string) =>
  key.startsWith("reviewed_") || key.startsWith("sender_") || INTERNAL_DETAIL_KEYS.has(key);

const detailValueText = (value: unknown): string => {
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value)) return value.map((item) => detailValueText(item)).join("، ") || "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const requestDetailEntries = (requestType: string, details: Record<string, unknown>) => {
  const schema = Object.values(requestFormSchemas).find((item) => item.title === requestType);
  return Object.entries(details)
    .filter(([key]) => !isInternalDetailKey(key))
    .map(([key, value]) => {
      const field = schema?.fields.find((item) => item.name === key);
      const optionLabel = field?.options?.find((option) => option.value === String(value))?.label;
      return { key, label: field?.label ?? key, value: optionLabel ?? detailValueText(value), isOption: Boolean(optionLabel) };
    });
};

const PENDING = new Set(["", "معلق", "معلقة", "pending"]);

export default function RequestDetailsDialog({ request, onClose }: { request: RequestDetailsView | null; onClose: () => void }) {
  const { t, direction, formatDate, formatNumber } = useI18n();
  if (!request) return null;

  const formatDateTime = (value: string) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : `${formatDate(value)} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" })}`;
  };
  const pending = PENDING.has(request.status.trim());
  const reviewedBy = String(request.details.reviewed_by_name ?? "").trim();
  const reviewedAt = String(request.details.reviewed_at ?? "").trim();
  const isPayroll = request.details.workflow === "payroll_approval";
  const days = request.days !== null && request.days > 0
    ? request.days
    : request.startDate && request.endDate ? daysInclusive(request.startDate, request.endDate) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white shadow-2xl" dir={direction} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t("تفاصيل الطلب")}</h2>
            <p className="mt-1 text-sm text-gray-500">{t(request.requestType)} — {request.empName || request.senderName || "—"}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" title={t("إغلاق")}><X className="h-5 w-5" /></button>
        </div>

        {/* مسار الاعتماد: لمن أُرسل الطلب، ومن قرّر */}
        <div className={`border-b px-5 py-3 text-sm ${pending ? "bg-amber-50" : "bg-emerald-50"}`}>
          <h3 className="mb-1 font-semibold text-gray-800">{t("مسار الاعتماد")}</h3>
          <p className="text-gray-700">
            {t("أُرسل إلى")}:{" "}
            <strong>
              {request.recipientLoading
                ? t("جارٍ التحميل...")
                : request.recipientName || (request.recipientError ? t("تعذر تحميل اسم المستلم") : t("لم يُحدَّد مستلم (لا مدير مباشر بحساب دخول)"))}
            </strong>
          </p>
          {pending ? (
            <p className="mt-1 text-amber-800">{t("الحالة")}: {t("بانتظار قرار المستلم")}</p>
          ) : (
            <p className="mt-1 text-emerald-800">
              {t("القرار")}: {t(request.status)}
              {reviewedBy && <> — {t("بواسطة")} <strong>{reviewedBy}</strong></>}
              {reviewedAt && <> — {formatDateTime(reviewedAt)}</>}
            </p>
          )}
        </div>

        <div className="grid gap-3 border-b bg-gray-50 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><span className="block text-xs text-gray-500">{t("نوع الطلب")}</span><strong>{t(request.requestType)}</strong></div>
          <div><span className="block text-xs text-gray-500">{t("تاريخ الطلب")}</span><strong>{formatDateTime(request.requestDate)}</strong></div>
          <div><span className="block text-xs text-gray-500">{t("الحالة")}</span><strong>{t(request.status || "معلق")}</strong></div>
          {request.senderDepartment && <div><span className="block text-xs text-gray-500">{t("القسم المرسل")}</span><strong>{request.senderDepartment}</strong></div>}
          {!isPayroll && <>
            <div><span className="block text-xs text-gray-500">{t("الموظف")}</span><strong>{request.empName || "—"}{request.empId ? ` (${request.empId})` : ""}</strong></div>
            <div><span className="block text-xs text-gray-500">{t("تاريخ البداية")}</span><strong>{request.startDate || "—"}</strong></div>
            <div><span className="block text-xs text-gray-500">{t("تاريخ النهاية")}</span><strong>{request.endDate || "—"}</strong></div>
            {(request.source === "leave" || days !== null) && (
              <div><span className="block text-xs text-gray-500">{t("عدد الأيام")}</span><strong>{days !== null ? formatNumber(days) : "—"}</strong></div>
            )}
          </>}
          {isPayroll && <>
            <div><span className="block text-xs text-gray-500">{t("فترة الرواتب")}</span><strong>{String(request.details.payroll_period ?? "—")}</strong></div>
            <div><span className="block text-xs text-gray-500">{t("عدد الموظفين")}</span><strong>{formatNumber(Number(request.details.employee_count ?? 0))}</strong></div>
          </>}
        </div>

        <div className="space-y-4 p-5 text-sm">
          {request.source === "leave" ? (
            <div>
              <h3 className="mb-2 font-semibold text-gray-800">{t("تفاصيل الإجازة")}</h3>
              <p className="whitespace-pre-line rounded-lg border bg-white p-3 text-gray-700">{request.notes ? request.notes.split(" | ").join("\n") : "—"}</p>
            </div>
          ) : (() => {
            const entries = requestDetailEntries(request.requestType, request.details);
            if (entries.length === 0) return isPayroll ? null : <p className="text-gray-400">{t("لا توجد بيانات إضافية في الطلب")}</p>;
            return (
              <div>
                <h3 className="mb-2 font-semibold text-gray-800">{t("بيانات الطلب")}</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {entries.map((entry) => (
                    <div key={entry.key} className="rounded-lg border bg-white p-3">
                      <dt className="text-xs text-gray-500">{t(entry.label)}</dt>
                      <dd className="mt-1 whitespace-pre-line font-medium text-gray-900">{entry.isOption ? t(entry.value) : entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })()}
          <div>
            <h3 className="mb-2 font-semibold text-gray-800">{t("ملاحظة الإدارة")}</h3>
            <p className="whitespace-pre-line text-gray-700">{request.adminNote || t("لا توجد ملاحظة")}</p>
          </div>
          {!isPayroll && (
            <div>
              <h3 className="mb-2 font-semibold text-gray-800">{t("توقيع الموظف")}</h3>
              {request.signatureData ? (
                <div className="inline-flex flex-col items-start gap-1">
                  <img src={request.signatureData} alt={`${t("توقيع الموظف")} ${request.empName}`} className="h-20 w-48 rounded border bg-white object-contain" />
                  {request.signedAt && <span className="text-xs text-gray-400">{t("وقت التوقيع")}: {formatDateTime(request.signedAt)}</span>}
                </div>
              ) : (
                <span className="text-xs text-gray-400">{t("طلب قديم بلا توقيع إلكتروني")}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** أسماء مستلمي الطلبات من قاعدة البيانات: { معرّف الطلب: الاسم }. ok = false إن تعذر الجلب (الدالة غير مثبتة أو خطأ) */
export async function loadRecipientNames(
  supabaseClient: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> },
  source: "hr_requests" | "leave_requests",
  ids: string[],
): Promise<{ names: Record<string, string>; ok: boolean }> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const names: Record<string, string> = {};
  for (let index = 0; index < unique.length; index += 500) {
    const { data, error } = await supabaseClient.rpc("request_recipient_names", { p_source: source, p_ids: unique.slice(index, index + 500) });
    if (error || !data || typeof data !== "object") return { names, ok: false };
    Object.entries(data as Record<string, unknown>).forEach(([id, name]) => {
      if (typeof name === "string" && name.trim()) names[id] = name.trim();
    });
  }
  return { names, ok: true };
}
