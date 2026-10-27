import { MessageSquareReply } from "lucide-react";
import { useI18n } from "@/i18n";
import { formatPenaltyReplyTime } from "@/lib/penaltyReply";

/** رد الموظف على المساءلة أو الإنذار كما أرسله من بوابته (HR-22)، في نافذة العرض للموارد البشرية */
export default function PenaltyReplyBlock({ reply, replyAt }: { reply: string; replyAt: string }) {
  const { t } = useI18n();
  if (!reply) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">{t("لم يرد الموظف بعد")}</div>
    );
  }
  const time = formatPenaltyReplyTime(replyAt);
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1 font-semibold text-emerald-800">
          <MessageSquareReply className="h-4 w-4" />
          {t("رد الموظف")}
        </span>
        {time && <span className="text-emerald-700" dir="ltr">{time}</span>}
      </div>
      <p dir="auto" className="whitespace-pre-wrap break-words leading-7 text-gray-800">{reply}</p>
    </div>
  );
}

/** شارة الرد في جدول السجل */
export function PenaltyReplyBadge({ reply }: { reply: string }) {
  const { t } = useI18n();
  return reply ? (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700" title={reply.length > 200 ? `${reply.slice(0, 200)}…` : reply}>
      {t("تم الرد")}
    </span>
  ) : (
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">{t("لم يرد")}</span>
  );
}
