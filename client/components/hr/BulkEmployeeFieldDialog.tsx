import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";
import { employeeErrorText } from "@/components/hr/employeeErrors";

/**
 * موظف محدد: current قيمته الحالية، وcurrentLabel اسمها المعروض.
 * currentPatch (اختياري) قيمه الحالية في أعمدة الخيار: يُعدّ «على حاله» فقط إن طابقت كل أعمدة الخيار، وإلا يُقارن current بقيمة الخيار.
 */
export type BulkFieldTarget = { id: string; empId: string; name: string; current: string; currentLabel: string; currentPatch?: Record<string, unknown> };

/** خيار جديد: value للمقارنة، وpatch الأعمدة التي تُحفظ (كلها في طلب واحد)، وgroupKey يميّز المجموعات المتشابهة الاسم، وwarning تنبيه عند اختياره */
export type BulkFieldOption = { value: string; label: string; group?: string; groupKey?: string; detail?: string; warning?: string; patch: Record<string, unknown> };

const sameValue = (a: unknown, b: unknown) => String(a ?? "") === String(b ?? "");
const isUnchanged = (target: BulkFieldTarget, option: BulkFieldOption) => (target.currentPatch
  ? Object.entries(option.patch).every(([key, value]) => sameValue(target.currentPatch?.[key], value))
  : target.current === option.value);

type RunResult = { updated: number; unchanged: number; failures: string[] };

// تحديث على دفعات: كل دفعة طلب واحد، وإن رُفضت تُعاد موظفًا موظفًا ليُعرف من فشل
const BATCH_SIZE = 100;

/**
 * تغيير حقل لعدة موظفين مرة واحدة من قائمة الموظفين (HR-18): القسم، ونوع التوظيف.
 * النصوص المعطاة مفاتيح ترجمة (تُعرض بـ t)، وأسماء الخيارات والقيم الحالية معروضة جاهزة بلغة الواجهة.
 * كل تغيير يُسجَّل في سجل العمليات بمشغّل الموظفين كما في التعديل الفردي.
 */
export default function BulkEmployeeFieldDialog({
  open, icon, title, selectLabel, choosePlaceholder, currentHeading, willChangeLabel, sameLabel, changedLabel, actionLabel, note,
  targets, options, loading = false, loadError = "", onClose, onDone,
}: {
  open: boolean;
  icon: ReactNode;
  title: string;
  selectLabel: string;
  choosePlaceholder: string;
  currentHeading: string;
  willChangeLabel: string;
  sameLabel: string;
  changedLabel: string;
  actionLabel: string;
  note: string;
  targets: BulkFieldTarget[];
  options: BulkFieldOption[];
  loading?: boolean;
  loadError?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, direction, formatNumber } = useI18n();
  const [value, setValue] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue("");
    setResult(null);
    setProgress("");
  }, [open]);

  const chosen = options.find((option) => option.value === value) ?? null;
  const toChange = useMemo(() => (chosen ? targets.filter((target) => !isUnchanged(target, chosen)) : []), [targets, chosen]);
  const unchanged = chosen ? targets.length - toChange.length : 0;
  // توزيع المحددين على قيمهم الحالية
  const currentBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    targets.forEach((target) => counts.set(target.currentLabel, (counts.get(target.currentLabel) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [targets]);
  // الخيارات في مجموعات (الإدارة مثلًا) بترتيب ورودها
  const groups = useMemo(() => {
    const list: Array<{ key: string; name: string; options: BulkFieldOption[] }> = [];
    options.forEach((option) => {
      const key = option.groupKey ?? option.group ?? "";
      const existing = list.find((group) => group.key === key);
      if (existing) existing.options.push(option);
      else list.push({ key, name: option.group ?? "", options: [option] });
    });
    return list;
  }, [options]);

  const close = () => {
    setValue("");
    setResult(null);
    setProgress("");
    onClose();
  };

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
        .update(chosen.patch)
        .in("id", batch.map((target) => target.id))
        .select("id");
      if (!error) {
        const saved = new Set((data ?? []).map((row: Record<string, unknown>) => String(row.id)));
        updated += saved.size;
        batch.filter((target) => !saved.has(target.id))
          .forEach((target) => failures.push(`${target.name || target.empId}: ${t("ليست لديك صلاحية تعديل هذا الموظف")}`));
        continue;
      }
      // رُفضت الدفعة كلها: موظفًا موظفًا لمعرفة من رُفض ولماذا
      for (const target of batch) {
        const single = await supabase.from("employees").update(chosen.patch).eq("id", target.id).select("id");
        if (single.error) failures.push(`${target.name || target.empId}: ${t(employeeErrorText(single.error))}`);
        else if ((single.data ?? []).length) updated += 1;
        else failures.push(`${target.name || target.empId}: ${t("ليست لديك صلاحية تعديل هذا الموظف")}`);
      }
    }
    setRunning(false);
    setProgress("");
    setResult({ updated, unchanged, failures });
    if (updated > 0) onDone();
  };

  const renderOption = (option: BulkFieldOption) => <option key={option.value} value={option.value}>{option.label}</option>;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !running) close(); }}>
      <DialogContent className="sm:max-w-[600px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#004e89]">
            {icon}
            {`${t(title)} (${formatNumber(targets.length)})`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {loading && <p className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t("جاري التحميل...")}</p>}
          {loadError && <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-700">{t(loadError)}</p>}

          {!loading && !loadError && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">{t(selectLabel)}</span>
              <select
                value={value}
                onChange={(event) => { setValue(event.target.value); setResult(null); }}
                disabled={running}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              >
                <option value="">{t(choosePlaceholder)}</option>
                {groups.map((group) => (group.name
                  ? <optgroup key={group.key} label={group.name}>{group.options.map(renderOption)}</optgroup>
                  : group.options.map(renderOption)))}
              </select>
              {chosen?.detail && <span className="block text-xs text-slate-500">{chosen.detail}</span>}
              {chosen?.warning && <span className="block rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{chosen.warning}</span>}
            </label>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p className="mb-1 font-semibold">{t(currentHeading)}</p>
            <ul className="max-h-32 space-y-0.5 overflow-auto">
              {currentBreakdown.map(([label, count]) => <li key={label}>{label}: {formatNumber(count)}</li>)}
            </ul>
            {chosen && !result && (
              <p className="mt-2 font-semibold text-[#004e89]">
                {t(willChangeLabel)}: {formatNumber(toChange.length)}
                {unchanged > 0 && `${direction === "rtl" ? "، " : ", "}${formatNumber(unchanged)} ${t(sameLabel)}`}
              </p>
            )}
          </div>

          <p className="rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-sky-800">{t(note)}</p>

          {progress && <p className="flex items-center gap-2 text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />{progress}</p>}

          {result && (
            <div className={`rounded-md border p-3 text-xs ${result.failures.length ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
              <p className="font-semibold">{t(changedLabel)}: {formatNumber(result.updated)}</p>
              {result.unchanged > 0 && <p>{formatNumber(result.unchanged)} {t(sameLabel)}</p>}
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
              onClick={close}
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
                {t(actionLabel)}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
