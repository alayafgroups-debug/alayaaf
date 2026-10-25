import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";
import { splitOwnEmployees } from "@/lib/attendanceManual";
import { fetchIsMainAdmin, isMainAdminSession } from "@/lib/authSession";
import { employeeErrorText } from "@/components/hr/employeeErrors";

export type ScheduleTarget = { id: string; empId: string; name: string; workSchedule: string };

type ScheduleOption = { name: string; workDays: number[]; periods: { start: string; end: string }[] };
type RunResult = { updated: number; unchanged: number; own: number; failures: string[] };

// تحديث على دفعات: كل دفعة طلب واحد، وإن رُفضت (موظف محمي مثلًا) تُعاد موظفًا موظفًا ليُعرف من فشل
const BATCH_SIZE = 100;
const DAY_LABELS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const scheduleSummary = (schedule: ScheduleOption, t: (text: string) => string) => {
  const days = schedule.workDays.length === 7
    ? t("كل أيام الأسبوع")
    : schedule.workDays.map((day) => t(DAY_LABELS[day] ?? String(day))).join("، ");
  const periods = schedule.periods.map((period) => `${period.start}-${period.end}`).join("، ");
  return [periods, days].filter(Boolean).join(" — ");
};

/**
 * تغيير جدول الدوام لعدة موظفين مرة واحدة (من قائمة الموظفين).
 * يُستثنى سجل المستخدم نفسه: قاعدة البيانات ترفض أن يغيّر أحد جدول دوامه (EMPLOYEE_OWN_ATTENDANCE_SETTINGS)،
 * إلا مدير النظام فتستثنيه القاعدة، فيدخل سجله مع المحددين.
 * كل تغيير يُسجَّل في سجل العمليات بمشغّل الموظفين كما في التعديل الفردي.
 */
export default function BulkScheduleDialog({ open, employees, onClose, onDone }: {
  open: boolean;
  employees: ScheduleTarget[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, direction, formatNumber } = useI18n();
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [scheduleName, setScheduleName] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  // مدير النظام يدخل سجله مع المحددين (حكم قاعدة البيانات الحي، ومبدئيًا الدور المحفوظ)
  const [ownAllowed, setOwnAllowed] = useState(() => isMainAdminSession());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchIsMainAdmin().then((value) => { if (!cancelled) setOwnAllowed(value); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setScheduleName("");
    setResult(null);
    setProgress("");
    setLoadError("");
    setLoadingSchedules(true);
    void (async () => {
      const { data, error } = await supabase
        .from("attendance_schedules")
        .select("name, work_days, periods, status")
        .eq("status", "فعال")
        .order("name");
      if (cancelled) return;
      if (error) {
        setLoadError(employeeErrorText(error, "تعذر تحميل جداول الدوام"));
        setSchedules([]);
      } else {
        setSchedules((data ?? []).map((row: Record<string, unknown>) => ({
          name: String(row.name ?? "").trim(),
          workDays: Array.isArray(row.work_days) ? (row.work_days as unknown[]).map(Number).filter((day) => Number.isInteger(day)).sort() : [],
          periods: Array.isArray(row.periods)
            ? (row.periods as Record<string, unknown>[]).map((period) => ({ start: String(period?.start ?? "").slice(0, 5), end: String(period?.end ?? "").slice(0, 5) })).filter((period) => period.start && period.end)
            : [],
        })).filter((row) => row.name));
      }
      setLoadingSchedules(false);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const { own, others } = useMemo(
    () => (ownAllowed ? { own: [] as ScheduleTarget[], others: employees } : splitOwnEmployees(employees)),
    [employees, ownAllowed],
  );
  const chosen = schedules.find((schedule) => schedule.name === scheduleName) ?? null;
  const toChange = useMemo(() => others.filter((employee) => employee.workSchedule.trim() !== scheduleName), [others, scheduleName]);
  const unchanged = others.length - toChange.length;
  // توزيع المحددين على جداولهم الحالية (ليُعرف ما سيتغير)
  const currentBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    others.forEach((employee) => {
      const key = employee.workSchedule.trim() || t("بلا جدول");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [others, t]);

  const run = async () => {
    if (!chosen || running || result) return;
    setRunning(true);
    let updated = 0;
    const failures: string[] = [];
    for (let start = 0; start < toChange.length; start += BATCH_SIZE) {
      const batch = toChange.slice(start, start + BATCH_SIZE);
      setProgress(`${t("جارٍ الحفظ...")} ${formatNumber(Math.min(start + batch.length, toChange.length))} / ${formatNumber(toChange.length)}`);
      const { data, error } = await supabase
        .from("employees")
        .update({ work_schedule: chosen.name })
        .in("id", batch.map((employee) => employee.id))
        .select("id");
      if (!error) {
        const saved = new Set((data ?? []).map((row: Record<string, unknown>) => String(row.id)));
        updated += saved.size;
        batch.filter((employee) => !saved.has(employee.id))
          .forEach((employee) => failures.push(`${employee.name || employee.empId}: ${t("ليست لديك صلاحية تعديل هذا الموظف")}`));
        continue;
      }
      // رُفضت الدفعة كلها: موظفًا موظفًا لمعرفة من رُفض ولماذا
      for (const employee of batch) {
        const single = await supabase.from("employees").update({ work_schedule: chosen.name }).eq("id", employee.id).select("id");
        if (single.error) failures.push(`${employee.name || employee.empId}: ${t(employeeErrorText(single.error))}`);
        else if ((single.data ?? []).length) updated += 1;
        else failures.push(`${employee.name || employee.empId}: ${t("ليست لديك صلاحية تعديل هذا الموظف")}`);
      }
    }
    setRunning(false);
    setProgress("");
    setResult({ updated, unchanged, own: own.length, failures });
    if (updated > 0) onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !running) onClose(); }}>
      <DialogContent className="sm:max-w-[620px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#004e89]">
            <CalendarClock className="h-5 w-5" />
            {`${t("تغيير جدول الدوام للمحددين")} (${formatNumber(employees.length)})`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {loadingSchedules && <p className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t("جاري التحميل...")}</p>}
          {loadError && <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-700">{t(loadError)}</p>}

          {!loadingSchedules && !loadError && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">{t("الجدول الجديد")}</span>
              <select
                value={scheduleName}
                onChange={(event) => { setScheduleName(event.target.value); setResult(null); }}
                disabled={running}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              >
                <option value="">{t("اختر جدول الدوام")}</option>
                {schedules.map((schedule) => <option key={schedule.name} value={schedule.name}>{t(schedule.name)}</option>)}
              </select>
              {chosen && <span className="block text-xs text-slate-500">{scheduleSummary(chosen, t)}</span>}
              {!schedules.length && <span className="block text-xs text-amber-700">{t("لا توجد جداول دوام فعالة؛ أضفها من «إعداد فترات الدوام»")}</span>}
            </label>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p className="mb-1 font-semibold">{t("جداول المحددين الحالية")}</p>
            <ul className="space-y-0.5">
              {currentBreakdown.map(([name, count]) => <li key={name}>{t(name)}: {formatNumber(count)}</li>)}
            </ul>
            {chosen && (
              <p className="mt-2 font-semibold text-[#004e89]">
                {t("سيتغير جدول")} {formatNumber(toChange.length)} {t("موظف")}
                {unchanged > 0 && `، ${formatNumber(unchanged)} ${t("على هذا الجدول أصلًا")}`}
              </p>
            )}
            {own.length > 0 && (
              <p className="mt-1 text-amber-700">
                {t("سجلك أنت مستثنى: جدول دوامك يغيّره مسؤول آخر")} ({own.map((employee) => employee.name || employee.empId).join("، ")})
              </p>
            )}
          </div>

          <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {t("الجدول يحدد أيام العمل وساعاتها، وعليه يُحسب الغياب والتأخير والراتب. يُطبَّق الجدول الجديد على كل الأيام التي لم تُعتمد رواتبها، ومنها أيام هذا الشهر الماضية؛ الأشهر المعتمدة أو المرحّلة رواتبها لا تتغير. الرواتب المحسوبة ولم تُعتمد بعد: أعد حسابها.")}
          </p>

          {progress && <p className="flex items-center gap-2 text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />{progress}</p>}

          {result && (
            <div className={`rounded-md border p-3 text-xs ${result.failures.length ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
              <p className="font-semibold">{t("تم تغيير جدول الدوام لـ")} {formatNumber(result.updated)} {t("موظف")}</p>
              {result.unchanged > 0 && <p>{formatNumber(result.unchanged)} {t("على هذا الجدول أصلًا")}</p>}
              {result.own > 0 && <p>{t("سجلك أنت مستثنى: جدول دوامك يغيّره مسؤول آخر")}</p>}
              {result.failures.length > 0 && (
                <>
                  <p className="mt-1 font-semibold">{t("لم يتغير")} ({formatNumber(result.failures.length)}):</p>
                  <ul className="max-h-32 list-disc overflow-auto ps-5">{result.failures.map((line, index) => <li key={index}>{line}</li>)}</ul>
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={running}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {result ? t("إغلاق") : t("إلغاء")}
            </button>
            {!result && (
              <button
                type="button"
                onClick={() => void run()}
                disabled={!chosen || running || toChange.length === 0}
                className="flex items-center gap-1 rounded-md bg-[#004e89] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003d6b] disabled:opacity-50"
              >
                {running && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("تغيير الجدول")}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
