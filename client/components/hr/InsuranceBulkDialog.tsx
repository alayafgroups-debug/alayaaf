import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";
import { employeeErrorText } from "@/components/hr/employeeErrors";
import { isSaudiNationality } from "@/lib/hrStatus";
import { GOSI_SAUDI_TYPES, GOSI_TYPE_DEDUCTIBLE, GOSI_TYPE_NON_SAUDI } from "@/lib/gosi";

/** موظف محدد بقيم ملفه الحالية (لا القيم الفعلية مع التسجيل الشامل) */
export type InsuranceBulkTarget = { id: string; empId: string; name: string; nationality: string; fileInsurance: string; fileType: string; fileStart: string };

type Action = "register" | "unregister";
type Patch = { social_insurance: string; social_insurance_type: string; social_insurance_start_date: string | null };
type RunResult = { updated: number; unchanged: number; failures: string[] };

const BATCH_SIZE = 100;
const fileFlag = (value: string) => (["نعم", "مشمول"].includes(value.trim()) ? "نعم" : value.trim() === "" ? "" : "لا");

/**
 * HR-24: تسجيل عدة موظفين في التأمينات الاجتماعية (أو إلغاء شمولهم) من صفحة التأمينات بدل تعديل كل ملف.
 * الحقول نفسها التي يحفظها ملف الموظف: الشمول، ونوع التأمين (السعودي بالنوع المختار، والمقيم «غير سعودي»)، وتاريخ الاشتراك.
 * لا يُغيَّر تاريخ اشتراك مسجّل. التحديث على دفعات، وإن رُفضت دفعة يُعاد موظفًا موظفًا ليُعرف من رُفض ولماذا.
 * يتطلب صلاحية الموظفين والرواتب (قاعدة البيانات: تعديل التأمينات من البيانات المالية، ولا يعدّلها أحد في سجله).
 */
export default function InsuranceBulkDialog({
  open,
  targets,
  autoCoverage,
  onClose,
  onDone,
}: {
  open: boolean;
  targets: InsuranceBulkTarget[];
  autoCoverage: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, direction, formatNumber } = useI18n();
  const [action, setAction] = useState<Action>("register");
  const [saudiType, setSaudiType] = useState(GOSI_TYPE_DEDUCTIBLE);
  const [keepType, setKeepType] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setAction("register");
    setSaudiType(GOSI_TYPE_DEDUCTIBLE);
    setKeepType(true);
    setStartDate("");
    setProgress("");
    setResult(null);
  }, [open]);

  const patchFor = (target: InsuranceBulkTarget): Patch => {
    if (action === "unregister") return { social_insurance: "لا", social_insurance_type: "", social_insurance_start_date: null };
    const saudi = isSaudiNationality(target.nationality);
    const type = saudi ? (keepType && GOSI_SAUDI_TYPES.includes(target.fileType.trim()) ? target.fileType.trim() : saudiType) : GOSI_TYPE_NON_SAUDI;
    return { social_insurance: "نعم", social_insurance_type: type, social_insurance_start_date: target.fileStart || startDate || null };
  };
  const isUnchanged = (target: InsuranceBulkTarget, patch: Patch) =>
    fileFlag(target.fileInsurance) === patch.social_insurance
    && target.fileType.trim() === patch.social_insurance_type
    && (target.fileStart || null) === patch.social_insurance_start_date;

  const plan = useMemo(() => targets.map((target) => ({ target, patch: patchFor(target) })), [targets, action, saudiType, keepType, startDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const toChange = plan.filter((item) => !isUnchanged(item.target, item.patch));
  const unchanged = plan.length - toChange.length;
  const saudis = targets.filter((target) => isSaudiNationality(target.nationality)).length;
  const residents = targets.length - saudis;
  const keptTypes = action === "register" && keepType
    ? targets.filter((target) => isSaudiNationality(target.nationality) && GOSI_SAUDI_TYPES.includes(target.fileType.trim()) && target.fileType.trim() !== saudiType).length
    : 0;

  const close = () => {
    if (running) return;
    onClose();
  };

  const run = async () => {
    if (running || result || toChange.length === 0) return;
    setRunning(true);
    let updated = 0;
    const failures: string[] = [];
    // مجموعات بنفس القيم الجديدة: كل دفعة طلب واحد
    const groups = new Map<string, { patch: Patch; items: InsuranceBulkTarget[] }>();
    toChange.forEach(({ target, patch }) => {
      const key = JSON.stringify(patch);
      const group = groups.get(key) ?? { patch, items: [] };
      group.items.push(target);
      groups.set(key, group);
    });
    let done = 0;
    for (const { patch, items } of groups.values()) {
      for (let start = 0; start < items.length; start += BATCH_SIZE) {
        const batch = items.slice(start, start + BATCH_SIZE);
        done += batch.length;
        setProgress(`${t("جارٍ الحفظ...")} ${formatNumber(done)} / ${formatNumber(toChange.length)}`);
        const { data, error } = await supabase.from("employees").update(patch).in("id", batch.map((target) => target.id)).select("id");
        if (!error) {
          const saved = new Set((data ?? []).map((row: Record<string, unknown>) => String(row.id)));
          updated += saved.size;
          batch.filter((target) => !saved.has(target.id))
            .forEach((target) => failures.push(`${target.name || target.empId}: ${t("ليست لديك صلاحية تعديل هذا الموظف")}`));
          continue;
        }
        for (const target of batch) {
          const single = await supabase.from("employees").update(patch).eq("id", target.id).select("id");
          if (single.error) failures.push(`${target.name || target.empId}: ${t(employeeErrorText(single.error))}`);
          else if ((single.data ?? []).length) updated += 1;
          else failures.push(`${target.name || target.empId}: ${t("ليست لديك صلاحية تعديل هذا الموظف")}`);
        }
      }
    }
    setRunning(false);
    setProgress("");
    setResult({ updated, unchanged, failures });
    if (updated > 0) onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="sm:max-w-[620px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#004e89]">
            <ShieldCheck className="h-5 w-5" />
            {`${t("التسجيل في التأمينات الاجتماعية")} (${formatNumber(targets.length)})`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-xs text-slate-600">
            {t("السعوديون")}: {formatNumber(saudis)}{direction === "rtl" ? "، " : ", "}{t("المقيمون الأساسيون")}: {formatNumber(residents)}
          </p>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="insurance-bulk-action" checked={action === "register"} disabled={running || Boolean(result)} onChange={() => setAction("register")} className="accent-blue-600" />
              {t("مشمول (تسجيل في التأمينات)")}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="insurance-bulk-action" checked={action === "unregister"} disabled={running || Boolean(result)} onChange={() => setAction("unregister")} className="accent-blue-600" />
              {t("غير مشمول (إلغاء الشمول)")}
            </label>
          </div>

          {action === "register" && (
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              {saudis > 0 && (
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">{t("نوع التأمين للسعوديين")}</span>
                  <select value={saudiType} disabled={running || Boolean(result)} onChange={(event) => setSaudiType(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                    {GOSI_SAUDI_TYPES.map((type) => <option key={type} value={type}>{t(type)}</option>)}
                  </select>
                  <span className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={keepType} disabled={running || Boolean(result)} onChange={(event) => setKeepType(event.target.checked)} />
                    {t("إبقاء نوع التأمين السعودي المسجّل في الملف (مثل «النظام الجديد»)")}
                    {keptTypes > 0 && <> ({formatNumber(keptTypes)})</>}
                  </span>
                </label>
              )}
              {residents > 0 && <p className="text-xs text-slate-600">{t("المقيمون الأساسيون")}: {t(GOSI_TYPE_NON_SAUDI)} — {t("2% على المنشأة فقط")}</p>}
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">{t("تاريخ الاشتراك لمن ليس له تاريخ (اختياري)")}</span>
                <input type="date" value={startDate} disabled={running || Boolean(result)} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" />
              </label>
            </div>
          )}
          {action === "unregister" && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              {t("يصير المحددون «غير مشمولين» ويُمسح نوع التأمين وتاريخ الاشتراك من ملفاتهم؛ لا تُخصم منهم حصة التأمينات إن كان إعداد «اتباع حقل التأمينات» مفعّلًا.")}
            </p>
          )}

          {autoCoverage && (
            <p className="rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-sky-800">
              {t("التسجيل الشامل مفعّل: مسير الرواتب يحسب الشمول والنوع من الجنسية ونوع التوظيف لا من الملف؛ هذا التحديث يجعل الملفات مطابقة فقط.")}
            </p>
          )}

          {!result && (
            <p className="font-semibold text-[#004e89]">
              {t("سيتغير")}: {formatNumber(toChange.length)}
              {unchanged > 0 && `${direction === "rtl" ? "، " : ", "}${formatNumber(unchanged)} ${t("على حاله")}`}
            </p>
          )}

          <p className="rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-600">{t("التغيير يُسجَّل في سجل العمليات لكل موظف كما في تعديل الملف، ولا يغيّر رواتب معتمدة أو مرحّلة.")}</p>

          {progress && <p className="flex items-center gap-2 text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />{progress}</p>}

          {result && (
            <div className={`rounded-md border p-3 text-xs ${result.failures.length ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
              <p className="font-semibold">{t("تغيّر")}: {formatNumber(result.updated)}</p>
              {result.unchanged > 0 && <p>{formatNumber(result.unchanged)} {t("على حاله")}</p>}
              {result.failures.length > 0 && (
                <>
                  <p className="mt-1 font-semibold">{t("لم يتغير")} ({formatNumber(result.failures.length)}):</p>
                  <ul className="max-h-32 list-disc overflow-auto ps-5">{result.failures.map((line, index) => <li key={index}>{line}</li>)}</ul>
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={close} disabled={running} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {result ? t("إغلاق") : t("إلغاء")}
            </button>
            {!result && (
              <button type="button" onClick={() => void run()} disabled={running || toChange.length === 0} className="flex items-center gap-1 rounded-md bg-[#004e89] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003d6b] disabled:opacity-50">
                {running && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("حفظ")}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
