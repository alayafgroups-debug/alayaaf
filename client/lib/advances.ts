import { isApprovedStatus } from "@/lib/hrStatus";

// سلف الموظفين: مصدر واحد لمسير الرواتب وصفحة السلف.
// كل سلفة معتمدة يُخصم قسطها من شهر بدايتها: القسط = الأقل من قسطها ومتبقيها.
// المسدَّد يُعاد توزيعه شهرًا بشهر كما خُصم فعلًا: أقساط كل شهر تُوزَّع على السلف السارية فيه
// (الأقدم أولًا، ولكل سلفة حتى قسطها)، ثم الزائد إن وُجد على الأقدم حتى متبقيها.
// فإن خُفّض قسط شهر (حد نصف الأجر مثلًا) تأخر سداد الأحدث ولم يتغير قسط الأقدم.
// «تأجيل قسط شهر» (HR-13، جدول hr_advance_skips): لا يُخصم قسط السلفة في الشهر المؤجَّل، فيمتد سدادها شهرًا.
// «إجمالي استقطاع السلف» في إنهاء الخدمة (HR-13): مبلغ سُدد من المستحقات، يُحتسب بعد كل أشهر الرواتب
// (مفتاح TERMINATION_CREDIT_MONTH)، فيقل المتبقي وقسط الراتب بقدره فقط.

export type AdvanceRecord = {
  id: string;
  employeeId: string;
  start: string;
  amount: number;
  installment: number;
  order: string;
  /** الأشهر المؤجَّل قسطها (YYYY-MM) */
  skips?: Set<string>;
};

const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** شهر بداية الخصم: start_month، وإلا شهر تاريخ الطلب، وإلا شهر الإنشاء (السجلات القديمة) */
export const advanceStartMonth = (row: Record<string, unknown>) =>
  String(row.start_month ?? "").slice(0, 7) || String(row.request_date ?? "").slice(0, 7) || String(row.created_at ?? "").slice(0, 7);

/** السلفة المعتمدة الصالحة للخصم، وإلا null (المعلقة والمرفوضة وبلا مبلغ أو قسط أو شهر بداية) */
export const parseApprovedAdvance = (row: Record<string, unknown>, skips?: Set<string>): AdvanceRecord | null => {
  if (!isApprovedStatus(row.status)) return null;
  const start = advanceStartMonth(row);
  const amount = round2(Number(row.amount ?? row.remaining_amount) || 0);
  const installment = round2(Number(row.monthly_installment) || 0);
  if (!MONTH.test(start) || amount <= 0 || installment <= 0) return null;
  return {
    id: String(row.id ?? ""),
    employeeId: String(row.employee_id ?? ""),
    start,
    amount,
    installment: Math.min(installment, amount),
    order: `${start}|${String(row.created_at ?? "")}|${String(row.id ?? "")}`,
    ...(skips && skips.size ? { skips } : {}),
  };
};

/** السلفة يُستحق قسطها في الشهر: بدأت فيه أو قبله، ولم يُؤجَّل قسطها فيه */
export const advanceActiveIn = (advance: AdvanceRecord, month: string) =>
  advance.start <= month && !(advance.skips?.has(month) ?? false);

/** الأشهر المؤجَّلة لكل سلفة من صفوف hr_advance_skips (advance_id، month) */
export const advanceSkipsById = (rows: Array<Record<string, unknown>>) => {
  const map = new Map<string, Set<string>>();
  rows.forEach((row) => {
    const id = String(row.advance_id ?? "");
    const month = String(row.month ?? "").slice(0, 7);
    if (!id || !MONTH.test(month)) return;
    const set = map.get(id) ?? new Set<string>();
    set.add(month);
    map.set(id, set);
  });
  return map;
};

/**
 * المسدَّد من كل سلفة لموظف واحد، من أقساط كشوف الرواتب (الشهر ← مبلغ عمود advance_deduction).
 * الأشهر تُعاد بترتيبها؛ لا يُحتسب لسلفة قسط شهر قبل بدايتها.
 */
export const allocateAdvanceRepayments = (advances: AdvanceRecord[], deductionsByMonth: Map<string, number>): Map<string, number> => {
  const ordered = [...advances].sort((a, b) => a.order.localeCompare(b.order));
  const repaid = new Map<string, number>(ordered.map((advance) => [advance.id, 0]));
  const remaining = (advance: AdvanceRecord) => round2(advance.amount - (repaid.get(advance.id) ?? 0));
  [...deductionsByMonth.keys()].sort().forEach((month) => {
    let left = round2(Math.max(0, deductionsByMonth.get(month) ?? 0));
    if (left <= 0) return;
    // ما خُصم فعلًا يُحسب للسلفة السارية حتى في شهر أُجّل قسطه (صف حُفظ قبل التأجيل): لا يدفع الموظف مرتين
    const active = ordered.filter((advance) => advance.start <= month);
    // القسط المتفق عليه لكل سلفة سارية، الأقدم أولًا: المستحقة في الشهر قبل المؤجَّل قسطها فيه
    // (كشف الشهر لم يحسب قسط المؤجَّلة، فما خُصم هو أقساط غيرها)
    const isPostponed = (advance: AdvanceRecord) => advance.skips?.has(month) ?? false;
    [...active.filter((advance) => !isPostponed(advance)), ...active.filter(isPostponed)].forEach((advance) => {
      const share = Math.min(advance.installment, remaining(advance), left);
      if (share <= 0) return;
      repaid.set(advance.id, round2((repaid.get(advance.id) ?? 0) + share));
      left = round2(left - share);
    });
    // زيادة على مجموع الأقساط (سداد معجّل): على الأقدم حتى متبقيها
    active.forEach((advance) => {
      const share = Math.min(remaining(advance), left);
      if (share <= 0) return;
      repaid.set(advance.id, round2((repaid.get(advance.id) ?? 0) + share));
      left = round2(left - share);
    });
  });
  return repaid;
};

/** القسط المستحق في شهر لموظف: مجموع الأقل من القسط والمتبقي لكل سلفة بدأت في الشهر أو قبله ولم يُؤجَّل قسطها فيه */
export const advanceInstallmentDue = (advances: AdvanceRecord[], repaid: Map<string, number>, period: string): number =>
  round2(advances.reduce((sum, advance) => {
    if (!advanceActiveIn(advance, period)) return sum;
    const left = round2(advance.amount - (repaid.get(advance.id) ?? 0));
    return left > 0 ? sum + Math.min(advance.installment, left) : sum;
  }, 0));

/** حالات صف الرواتب التي لا تُعد خصمًا فعليًا (لا شيء غير الملغى: المعلق والمرفوض قد يُعاد إرسالهما بنفس المبلغ) */
export const isCancelledPayrollStatus = (status: unknown) => ["ملغي", "ملغى", "cancelled"].includes(String(status ?? "").trim());

/** مفتاح سداد السلف من مستحقات نهاية الخدمة في خريطة الأشهر: بعد كل شهر حقيقي، ولكل سلفة */
export const TERMINATION_CREDIT_MONTH = "9999-12";

/** خريطة الأشهر مع مبلغ السداد من مستحقات نهاية الخدمة (نسخة جديدة؛ الأصل لا يتغير) */
export const withTerminationCredit = (deductionsByMonth: Map<string, number> | undefined, credit: number): Map<string, number> => {
  const map = new Map(deductionsByMonth ?? []);
  const value = round2(Math.max(0, Number(credit) || 0));
  if (value > 0) map.set(TERMINATION_CREDIT_MONTH, round2((map.get(TERMINATION_CREDIT_MONTH) ?? 0) + value));
  return map;
};

/** الجدول غير موجود (قبل تطبيق HR-13): يُتجاهل؛ وأي خطأ آخر يُظهر للمستخدم */
export const isMissingTableError = (error: unknown) => ["42P01", "PGRST205"].includes(String((error as { code?: unknown } | null)?.code ?? ""));

/** إنهاء خدمة غير مرفوض ولا ملغى خُصم فيه «إجمالي استقطاع السلف» (HR-13): مبلغه سداد لسلف الموظف */
export const isSettlingTermination = (row: Record<string, unknown>) =>
  (Number(row.advances_deduction) || 0) > 0
  && !["مرفوض", "مرفوضة", "ملغي", "ملغى", "rejected", "cancelled"].includes(String(row.status ?? "").trim());

/** مبلغ السداد من مستحقات نهاية الخدمة لكل موظف (emp_id في hr_terminations = معرّف الموظف) */
export const terminationAdvanceCredits = (rows: Array<Record<string, unknown>>) => {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    if (!isSettlingTermination(row)) return;
    const id = String(row.emp_id ?? "");
    if (!id) return;
    map.set(id, round2((map.get(id) ?? 0) + (Number(row.advances_deduction) || 0)));
  });
  return map;
};

/** قبل HR-13 لا يوجد عمود advances_deduction (أو الجدول): لا سداد من نهاية الخدمة */
export const isMissingColumnError = (error: unknown) => ["42703", "PGRST204", "42P01", "PGRST205"].includes(String((error as { code?: unknown } | null)?.code ?? ""));
