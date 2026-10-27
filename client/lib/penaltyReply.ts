// HR-22: رد الموظف على المساءلة والإنذار من بوابته (يوضح عذره).
// يُرسل بالدالة penalty_submit_reply في قاعدة البيانات: ردًا واحدًا لا يُعدَّل، على ما وُجّه إليه هو فقط،
// وتصير الحالة «تم الرد». قبل تطبيق تحديث قاعدة البيانات لا توجد أعمدة الرد، فتُقرأ فارغة ولا تتعطل الصفحات.

export type PenaltyReplyKind = "investigation" | "warning";

/** أقصى طول للرد، كقيد قاعدة البيانات */
export const PENALTY_REPLY_MAX = 2000;

/** الحالة بعد رد الموظف */
export const PENALTY_REPLIED_STATUS = "تم الرد";

/** الحالة قبل الرد: «مرسلة» للمساءلة و«مرسل» للإنذار */
export const isPenaltySentStatus = (status: unknown) => ["مرسلة", "مرسل"].includes(String(status ?? "").trim());

/** الرد ووقته من صف المساءلة أو الإنذار (فارغان إن لم يرد الموظف أو لم تُطبَّق HR-22) */
export const readPenaltyReply = (row: Record<string, unknown> | null | undefined) => {
  const reply = typeof row?.employee_reply === "string" && row.employee_reply.trim() ? row.employee_reply : "";
  return { reply, replyAt: reply ? String(row?.employee_reply_at ?? "") : "" };
};

/** وقت الرد بتوقيت الرياض بصيغة 2026-10-27 13:15 (أرقام إنجليزية، كالتواريخ في الصفحات). الوقت غير الصالح يُعرض فارغًا */
export const formatPenaltyReplyTime = (value: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(date)
        .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  } catch {
    return "";
  }
};
