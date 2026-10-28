// HR-24: اعتماد الرواتب بتحديد الموظفين، وإلغاء الاعتماد بعد الاعتماد النهائي بسبب إلزامي.
// مفاتيح يكتبها الخادم في details (لا تُعرض كمحتوى للطلب) وأدوات قراءتها.

/** مفاتيح الإلغاء والرفض الجزئي في details الطلب */
export const APPROVAL_CANCEL_DETAIL_KEYS = [
  "rejected_employee_ids",
  "cancelled_employee_ids",
  "cancel_log",
  "cancelled_at",
  "cancelled_by_name",
  "cancelled_by_user_id",
  "cancel_note",
];

export const isApprovalCancelDetailKey = (key: string) => APPROVAL_CANCEL_DETAIL_KEYS.includes(key);

/** قائمة أرقام وظيفية من details، أو [] */
export const detailCodes = (details: Record<string, unknown> | null | undefined, key: string): string[] => {
  const list = details?.[key];
  return Array.isArray(list) ? list.map((code) => String(code ?? "").trim()).filter(Boolean) : [];
};

export type ApprovalCancelEntry = { at: string; byName: string; note: string; employeeIds: string[] };

/** سجل إلغاء اعتماد الرواتب (كل إلغاء: متى ومن والسبب ولمن) */
export const payrollCancelLog = (details: Record<string, unknown> | null | undefined): ApprovalCancelEntry[] => {
  const log = details?.cancel_log;
  if (!Array.isArray(log)) return [];
  return log
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      at: String(entry.at ?? ""),
      byName: String(entry.by_name ?? ""),
      note: String(entry.note ?? ""),
      employeeIds: Array.isArray(entry.employee_ids) ? entry.employee_ids.map((code) => String(code ?? "").trim()).filter(Boolean) : [],
    }));
};

/** إلغاء اعتماد إجازة أو طلب (hr_requests فقط تحفظ من ألغى ومتى؛ الإجازة في ملاحظة الإدارة) */
export const requestCancelInfo = (details: Record<string, unknown> | null | undefined): ApprovalCancelEntry | null => {
  const note = String(details?.cancel_note ?? "").trim();
  const at = String(details?.cancelled_at ?? "").trim();
  if (!note && !at) return null;
  return { at, byName: String(details?.cancelled_by_name ?? "").trim(), note, employeeIds: [] };
};

/** دالة الخادم غير موجودة (لم يُطبَّق تحديث قاعدة البيانات HR-24) */
export const isMissingRpcError = (error: unknown) => {
  const code = String((error as { code?: unknown } | null)?.code ?? "");
  return code === "PGRST202" || code === "42883";
};

/** الحالات التي يُلغى اعتمادها في صف الراتب (المرحّل والمدفوع لا) */
export const PAYROLL_CANCELLABLE_STATUSES = ["معتمد", "موقوف"];
const POSTED_PAYROLL_STATUSES = ["مرحّل", "مدفوع", "موقوف الصرف"];

/**
 * موظفو طلب الرواتب الذين يُلغى اعتمادهم: «معتمد» أو «موقوف» لم يُلغَ ولم يُرفض من قبل.
 * الترحيل يرحّل الشهر كله: إن ظهر في صفوف الطلب مرحّل أو مدفوع فالموقوف فيه مرحّل أيضًا (موقوف الصرف بعد الترحيل) فلا يُلغى.
 */
export const cancellablePayrollCodes = (rows: Array<{ empId: string; status: string }>, done: Set<string>): Set<string> => {
  const monthPosted = rows.some((row) => POSTED_PAYROLL_STATUSES.includes(row.status.trim()));
  return new Set(rows
    .filter((row) => !done.has(row.empId))
    .filter((row) => row.status.trim() === "معتمد" || (row.status.trim() === "موقوف" && !monthPosted))
    .map((row) => row.empId));
};
