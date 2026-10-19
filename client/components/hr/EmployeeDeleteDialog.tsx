import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { isEmployeeActive } from "@/lib/employeeStatus";
import { setEmployeeLoginState } from "@/components/hr/employeeActions";

export type DeletableEmployee = { id: string; empId: string; name: string; email: string; status: string };

type PlanRow = { id: string; emp_id: string; name: string; reason?: string; shared_email?: boolean };
type Plan = { deleted: PlanRow[]; skipped: PlanRow[] };

const CONFIRM_WORD = "حذف";
// الحذف الفعلي على دفعات صغيرة: كل دفعة طلب مستقل في حدود وقت الخادم
const BATCH_SIZE = 20;

// أسباب استثناء موظف من الحذف (من الدالة hr_delete_employees)
const SKIP_REASONS: Record<string, string> = {
  ADMIN_PROTECTED: "سجل مدير النظام محمي",
  SELF: "لا تحذف ملفك أنت",
  ROLE_ABOVE_CALLER: "دوره فيه صلاحيات أعلى من صلاحياتك",
  DUPLICATE_EMP_ID: "رقمه الوظيفي مكرر مع موظف آخر",
  POSTED_PAYROLL: "له رواتب مرحّلة محاسبيًا أو مدفوعة",
  DECIDED_PAYROLL: "له رواتب معتمدة أو موقوفة (قرار رواتب)؛ لا تُحذف من ملفات الموظفين",
  OPEN_ADVANCE: "عليه سلفة معتمدة لم تُسدَّد بالكامل",
  PAYROLL_PENDING_APPROVAL: "له رواتب في طلب اعتماد معلق؛ ارفض الطلب أولًا",
  NOT_FOUND: "غير موجود (ربما حُذف)",
  LOGIN_NOT_STOPPED: "تعذر إيقاف حساب دخوله أولًا",
  FLEET_DRIVER: "مسجّل سائقًا في الأسطول؛ احذف سجل السائق أو انقله أولًا",
  NOT_STARTED: "توقف الحذف قبل الوصول إليه",
};
const skipReasonText = (reason: string) =>
  SKIP_REASONS[reason] ?? (reason.startsWith("BLOCKED:") ? `مرتبط بسجل لا يُحذف تلقائيًا (${reason.slice(8)})` : reason);

const deleteErrorText = (error: unknown) => {
  const err = error as { message?: string; details?: string; code?: string } | null;
  const text = `${err?.message ?? ""} ${err?.details ?? ""}`;
  if (err?.code === "PGRST202" || err?.code === "42883" || /could not find the function/i.test(text)) {
    return "دالة الحذف غير مثبتة بعد في قاعدة البيانات (ملف HR-10)";
  }
  if (text.includes("EMPLOYEE_DELETE_NOT_ALLOWED")) return "حذف الموظفين لمدير النظام أو من يدير ملفات الموظفين";
  if (text.includes("EMPLOYEE_DELETE_REASON_REQUIRED")) return "اكتب سبب الحذف";
  if (text.includes("EMPLOYEE_DELETE_TOO_MANY")) return "الحد الأقصى 500 موظف في المرة الواحدة";
  if (text.includes("EMPLOYEE_DELETE_UNKNOWN_REFERENCES")) return `في قاعدة البيانات جداول جديدة تذكر الموظف ولم تُضبط للحذف: ${err?.details ?? ""}`;
  return err?.message || "تعذر الحذف";
};

/** حذف موظف أو أكثر نهائيًا مع سجلاتهم، بعد معاينة من سيُحذف ومن سيُستثنى، وسبب، وتأكيد مكتوب */
export default function EmployeeDeleteDialog({
  open,
  employees,
  onClose,
  onDeleted,
}: {
  open: boolean;
  employees: DeletableEmployee[];
  onClose: () => void;
  onDeleted: (deletedIds: string[]) => void;
}) {
  const { t, direction, formatNumber } = useI18n();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planError, setPlanError] = useState("");
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<Plan | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPlan(null);
    setPlanError("");
    setReason("");
    setConfirmText("");
    setResult(null);
    setProgress("");
    setLoadingPlan(true);
    (async () => {
      const { data, error } = await supabase.rpc("hr_delete_employees", {
        p_employee_ids: employees.map((employee) => employee.id),
        p_reason: null,
        p_dry_run: true,
      });
      if (cancelled) return;
      setLoadingPlan(false);
      if (error) {
        setPlanError(deleteErrorText(error));
        return;
      }
      const body = (data ?? {}) as Partial<Plan>;
      setPlan({ deleted: body.deleted ?? [], skipped: body.skipped ?? [] });
    })();
    return () => { cancelled = true; };
  }, [open, employees]);

  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const deletable = plan?.deleted ?? [];
  const canRun = Boolean(plan && deletable.length > 0 && reason.trim() && confirmText.trim() === CONFIRM_WORD && !running && !result);

  const run = async () => {
    if (!plan || !canRun) return;
    setRunning(true);
    const deleted: PlanRow[] = [];
    const skipped: PlanRow[] = [...plan.skipped];
    let failed = false;
    for (let start = 0; start < deletable.length && !failed; start += BATCH_SIZE) {
      const batch = deletable.slice(start, start + BATCH_SIZE);
      setProgress(`${t("جارٍ الحذف وحفظ النسخة في أرشيف المحذوفين...")} ${formatNumber(Math.min(start + batch.length, deletable.length))} / ${formatNumber(deletable.length)}`);
      // حساب الدخول يُوقف قبل الحذف؛ بعد الحذف لا يُعرف الموظف فيبقى الحساب قادرًا على الدخول.
      // البريد المشترك مع موظف باقٍ: الحساب قد يكون له، فلا يُوقف.
      const stopped = new Map<string, { wasActive: boolean; wasBanned: boolean }>();
      const toDelete: string[] = [];
      for (const row of batch) {
        const employee = byId.get(row.id);
        if (employee && employee.email.trim() && !row.shared_email) {
          const stop = await setEmployeeLoginState(row.id, false);
          if (!stop.ok) {
            skipped.push({ ...row, reason: "LOGIN_NOT_STOPPED" });
            continue;
          }
          stopped.set(row.id, { wasActive: isEmployeeActive(employee.status), wasBanned: stop.previouslyBanned === true });
        }
        toDelete.push(row.id);
      }
      let batchDeleted = new Set<string>();
      if (toDelete.length) {
        const { data, error } = await supabase.rpc("hr_delete_employees", {
          p_employee_ids: toDelete,
          p_reason: reason.trim(),
          p_dry_run: false,
        });
        if (error) {
          failed = true;
          toast({ title: t("تعذر الحذف"), description: t(deleteErrorText(error)), variant: "destructive" });
        } else {
          const body = (data ?? {}) as Partial<Plan>;
          deleted.push(...(body.deleted ?? []));
          skipped.push(...(body.skipped ?? []));
          batchDeleted = new Set((body.deleted ?? []).map((row) => row.id));
        }
      }
      // من لم يُحذف في هذه الدفعة يعود دخوله كما كان (ولا يُفك حظر كان موجودًا قبلنا)
      for (const [id, state] of stopped.entries()) {
        if (batchDeleted.has(id) || !state.wasActive || state.wasBanned) continue;
        const restored = await setEmployeeLoginState(id, true);
        if (!restored.ok) {
          toast({ title: t("لم يُعَد حساب دخول موظف"), description: `${byId.get(id)?.name ?? id}: ${t(restored.message)}`, variant: "destructive" });
        }
      }
    }
    if (failed) {
      // الدفعات التي لم تبدأ تُعرض «لم يُحذف» بلا سبب إضافي
      const handled = new Set([...deleted, ...skipped].map((row) => row.id));
      deletable.filter((row) => !handled.has(row.id)).forEach((row) => skipped.push({ ...row, reason: "NOT_STARTED" }));
    }

    setRunning(false);
    setProgress("");
    setResult({ deleted, skipped });
    if (deleted.length) {
      toast({ title: t("تم الحذف"), description: `${t("حُذف")} ${formatNumber(deleted.length)} ${t("موظف")}` });
      onDeleted(deleted.map((row) => row.id));
    }
  };

  const SkippedList = ({ rows }: { rows: PlanRow[] }) => (
    <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
      {rows.map((row) => (
        <li key={`${row.id}-${row.reason}`}>
          <span className="font-semibold">{row.name || byId.get(row.id)?.name || row.id}</span>
          {row.emp_id ? <span className="font-mono"> ({row.emp_id})</span> : null}
          {" — "}{t(skipReasonText(row.reason ?? ""))}
        </li>
      ))}
    </ul>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !running) onClose(); }}>
      <DialogContent className="sm:max-w-[640px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <Trash2 className="h-5 w-5" />
            {employees.length === 1 ? t("حذف الموظف نهائيًا") : `${t("حذف الموظفين المحددين نهائيًا")} (${formatNumber(employees.length)})`}
          </DialogTitle>
        </DialogHeader>

        {loadingPlan && (
          <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t("جارٍ فحص السجلات المرتبطة...")}</p>
        )}
        {planError && <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{t(planError)}</p>}

        {plan && !result && (
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-6">{t("حذف نهائي: يُحذف ملف الموظف وكل سجلاته (الحضور، الرواتب غير المرحّلة، الطلبات، الإجازات، السلف، الجزاءات، الشهادات)، ويُوقف حساب دخوله. تُحفظ نسخة كاملة منها في أرشيف الموظفين المحذوفين.")}</p>
            </div>
            <p>
              {t("سيُحذف")}: <span className="font-bold">{formatNumber(deletable.length)}</span>
              {plan.skipped.length > 0 && <> — {t("لن يُحذف")}: <span className="font-bold">{formatNumber(plan.skipped.length)}</span></>}
            </p>
            {plan.skipped.length > 0 && <SkippedList rows={plan.skipped} />}
            {deletable.length > 0 && (
              <>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">{t("سبب الحذف")} *</span>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-400"
                    placeholder={t("مثال: بيانات استيراد خاطئة بطلب الإدارة")}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">{t("للتأكيد اكتب كلمة")} «{CONFIRM_WORD}»</span>
                  <input
                    value={confirmText}
                    onChange={(event) => setConfirmText(event.target.value)}
                    className="h-9 w-40 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-rose-400"
                  />
                </label>
              </>
            )}
            {progress && <p className="flex items-center gap-2 text-xs text-slate-600"><Loader2 className="h-3.5 w-3.5 animate-spin" />{progress}</p>}
          </div>
        )}

        {result && (
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-emerald-700">{t("حُذف")}: {formatNumber(result.deleted.length)}</p>
            {result.skipped.length > 0 && (
              <>
                <p className="font-semibold text-amber-800">{t("لم يُحذف")}: {formatNumber(result.skipped.length)}</p>
                <SkippedList rows={result.skipped} />
              </>
            )}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {result ? t("إغلاق") : t("إلغاء")}
          </button>
          {!result && (
            <button
              type="button"
              onClick={run}
              disabled={!canRun}
              className="flex items-center gap-2 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
            >
              {running && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("حذف نهائي")}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
