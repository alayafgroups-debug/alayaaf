import { useMemo, useState } from "react";
import { Banknote, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";
import { employeeErrorText } from "@/components/hr/employeeErrors";
import { SALARY_PAYMENT_METHODS, UNSPECIFIED_PAYMENT_METHOD } from "@/lib/salaryPaymentMethods";
import { readUserSession } from "@/lib/authSession";

export type PaymentMethodTarget = { id: string; empId: string; name: string; salaryPaymentMethod: string };

type RunResult = { updated: number; unchanged: number; failures: string[] };

// تحديث على دفعات: كل دفعة طلب واحد، وإن رُفضت تُعاد موظفًا موظفًا ليُعرف من فشل
const BATCH_SIZE = 100;
// خيار «بلا طريقة»: يعيد المحددين إلى غير محدد
const CLEAR_METHOD = "__clear__";

/**
 * تغيير طريقة صرف الراتب لعدة موظفين مرة واحدة (HR-17، من قائمة الموظفين).
 * بها يُقسَّم كشف الرواتب كسمارت: نقدي ومدد وتحويل بنكي وشيك، بمجموع لكل قسم.
 * كل تغيير يُسجَّل في سجل العمليات بمشغّل الموظفين كما في التعديل الفردي.
 */
export default function BulkPaymentMethodDialog({ open, employees, onClose, onDone }: {
  open: boolean;
  employees: PaymentMethodTarget[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, direction, formatNumber } = useI18n();
  const [method, setMethod] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);

  const reset = () => { setMethod(""); setResult(null); setProgress(""); };
  // القيمة المحفوظة: الطريقة المختارة، أو فارغ (null) لخيار «بلا طريقة»
  const target = method === CLEAR_METHOD ? "" : method;
  // سجل المستخدم نفسه لا يدخل: لا يغيّر أحد طريقة صرف راتبه (تمنعه قاعدة البيانات، ويُبطئ الدفعة كلها)
  const ownIds = useMemo(() => {
    const session = readUserSession();
    if (!session || session.accountType === "special") return new Set<string>();
    return new Set(employees.filter((employee) => employee.id === session.id || (session.empId !== "" && employee.empId === session.empId)).map((employee) => employee.id));
  }, [employees]);
  const others = useMemo(() => employees.filter((employee) => !ownIds.has(employee.id)), [employees, ownIds]);
  const toChange = useMemo(() => others.filter((employee) => employee.salaryPaymentMethod !== target), [others, target]);
  const unchanged = others.length - toChange.length;
  const unchangedLabel = target ? t("على هذه الطريقة أصلًا") : t("بلا طريقة أصلًا");
  // توزيع المحددين على طرق الصرف الحالية
  const currentBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    employees.forEach((employee) => {
      const key = employee.salaryPaymentMethod || UNSPECIFIED_PAYMENT_METHOD;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [employees]);

  const run = async () => {
    if (!method || running || result) return;
    setRunning(true);
    let updated = 0;
    const failures: string[] = [];
    for (let start = 0; start < toChange.length; start += BATCH_SIZE) {
      const batch = toChange.slice(start, start + BATCH_SIZE);
      setProgress(`${t("جارٍ الحفظ...")} ${formatNumber(Math.min(start + batch.length, toChange.length))} / ${formatNumber(toChange.length)}`);
      const { data, error } = await supabase
        .from("employees")
        .update({ salary_payment_method: target || null })
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
        const single = await supabase.from("employees").update({ salary_payment_method: target || null }).eq("id", employee.id).select("id");
        if (single.error) failures.push(`${employee.name || employee.empId}: ${t(employeeErrorText(single.error))}`);
        else if ((single.data ?? []).length) updated += 1;
        else failures.push(`${employee.name || employee.empId}: ${t("ليست لديك صلاحية تعديل هذا الموظف")}`);
      }
    }
    setRunning(false);
    setProgress("");
    setResult({ updated, unchanged, failures });
    if (updated > 0) onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !running) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[560px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#004e89]">
            <Banknote className="h-5 w-5" />
            {`${t("تغيير طريقة صرف الراتب للمحددين")} (${formatNumber(employees.length)})`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">{t("طريقة الصرف الجديدة")}</span>
            <select
              value={method}
              onChange={(event) => { setMethod(event.target.value); setResult(null); }}
              disabled={running}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="">{t("اختر طريقة الصرف")}</option>
              {SALARY_PAYMENT_METHODS.map((option) => <option key={option} value={option}>{t(option)}</option>)}
              <option value={CLEAR_METHOD}>{t("بلا طريقة (غير محدد)")}</option>
            </select>
          </label>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p className="mb-1 font-semibold">{t("طرق الصرف الحالية للمحددين")}</p>
            <ul className="space-y-0.5">
              {currentBreakdown.map(([name, count]) => <li key={name}>{t(name)}: {formatNumber(count)}</li>)}
            </ul>
            {method && !result && (
              <p className="mt-2 font-semibold text-[#004e89]">
                {t("عدد من ستتغير طريقتهم")}: {formatNumber(toChange.length)}
                {unchanged > 0 && `${direction === "rtl" ? "، " : ", "}${formatNumber(unchanged)} ${unchangedLabel}`}
              </p>
            )}
            {ownIds.size > 0 && <p className="mt-1 text-amber-700">{t("سجلك ليس ضمن التغيير: لا تغيّر طريقة صرف راتبك بنفسك")}</p>}
          </div>

          <p className="rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-sky-800">
            {t("طريقة الصرف تقسّم كشف الرواتب (نقدي، مدد، تحويل بنكي، شيك) بمجموع لكل قسم، ولا تغيّر مبلغ الراتب.")}
          </p>

          {progress && <p className="flex items-center gap-2 text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />{progress}</p>}

          {result && (
            <div className={`rounded-md border p-3 text-xs ${result.failures.length ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
              <p className="font-semibold">{t("عدد من تغيّرت طريقتهم")}: {formatNumber(result.updated)}</p>
              {result.unchanged > 0 && <p>{formatNumber(result.unchanged)} {unchangedLabel}</p>}
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
              onClick={() => { reset(); onClose(); }}
              disabled={running}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {result ? t("إغلاق") : t("إلغاء")}
            </button>
            {!result && (
              <button
                type="button"
                onClick={() => void run()}
                disabled={!method || running || toChange.length === 0}
                className="flex items-center gap-1 rounded-md bg-[#004e89] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003d6b] disabled:opacity-50"
              >
                {running && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("تغيير الطريقة")}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
