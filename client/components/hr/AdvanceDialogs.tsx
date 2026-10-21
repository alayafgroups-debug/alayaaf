import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { hrRequestErrorText } from "@/lib/hrErrors";
import { riyadhMonth } from "@/lib/hrDates";
import { useI18n } from "@/i18n";

/**
 * إجراءات السلفة المعتمدة (HR-13، كما في سمارت): تعديلها، وتأجيل قسط شهر، وحذفها.
 * قاعدة البيانات تفرض الشروط: لا تعديل لشهر البداية ولا حذف بعد أن يُخصم من الموظف قسط سلفة منذ بدايتها،
 * والتأجيل لشهر من بداية السلفة فما بعد وشهر رواتبه غير مقفل، ولا أحد يعدّل سلفته.
 */
export type AdvanceActionTarget = {
  id: string;
  name: string;
  amount: number;
  installment: number;
  startMonth: string;
  notes: string;
  repaid: number;
};

const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const fieldClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none";

/** حذف سلفة (معلقة، أو معتمدة لم يُخصم منها شيء). يعيد نص النتيجة أو يرمي الخطأ */
export async function deleteAdvance(id: string, t: (text: string) => string) {
  const { data, error } = await supabase.from("hr_advances").delete().eq("id", id).select("id");
  if (error) throw error;
  return (data ?? []).length ? t("حُذفت السلفة") : t("لم يُحذف شيء: لا تملك صلاحية الحذف");
}

export function AdvanceEditDialog({ advance, onClose, onSaved }: {
  advance: AdvanceActionTarget | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t, direction, formatNumber } = useI18n();
  const [amount, setAmount] = useState("");
  const [installment, setInstallment] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!advance) return;
    setAmount(String(advance.amount));
    setInstallment(String(advance.installment));
    setStartMonth(advance.startMonth);
    setNotes(advance.notes);
    setError("");
  }, [advance]);

  const money = (value: number) => `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t("ر.س")}`;
  const newAmount = round2(Number(amount));
  const newInstallment = round2(Number(installment));
  const remainingAfter = advance ? round2(Math.max(0, newAmount - advance.repaid)) : 0;
  const startChanged = Boolean(advance && startMonth !== advance.startMonth);

  const save = async () => {
    if (!advance || busy) return;
    if (!(newAmount > 0)) { setError(t("أدخل مبلغ السلفة")); return; }
    if (!(newInstallment > 0) || newInstallment > newAmount) { setError(t("القسط الشهري يجب أن يكون أكبر من صفر ولا يتجاوز مبلغ السلفة")); return; }
    // المبلغ لا يقل عما خُصم فعلًا (وإلا انتقل الفائض إلى سلفة أخرى للموظف أو صار خصمًا زائدًا عليه)
    if (newAmount < advance.repaid - 0.004) { setError(`${t("مبلغ السلفة لا يقل عما خُصم منها فعلًا من الرواتب")}: ${money(advance.repaid)}`); return; }
    if (startChanged && (!/^\d{4}-\d{2}$/.test(startMonth) || startMonth < riyadhMonth())) { setError(t("شهر بداية الخصم يجب ألا يسبق الشهر الحالي")); return; }
    setBusy(true); setError("");
    try {
      const changes: Record<string, unknown> = {
        amount: newAmount,
        monthly_installment: newInstallment,
        installments: Math.max(1, Math.ceil(round2(newAmount / newInstallment))),
        notes: notes.trim() || null,
      };
      if (startChanged) changes.start_month = startMonth;
      const { data, error: updateError } = await supabase.from("hr_advances").update(changes).eq("id", advance.id).select("id");
      if (updateError) throw updateError;
      if (!(data ?? []).length) throw new Error(t("لم يُحفظ شيء: لا تملك صلاحية تعديل السلف"));
      onSaved(t("حُفظ تعديل السلفة؛ يُحسب المتبقي مما خُصم فعلًا من الرواتب"));
    } catch (saveError) {
      setError(hrRequestErrorText(saveError, t("تعذر حفظ التعديل")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(advance)} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-[560px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#004e89]"><Pencil className="h-5 w-5" />{t("تعديل معلومات السلفة")}</DialogTitle>
        </DialogHeader>
        {advance && (
          <div className="space-y-3 text-sm">
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              {t("التعديل لا يعكس ما خُصم سابقًا من الرواتب؛ يُحسب المتبقي من الأقساط المخصومة فعلًا. إن صار المبلغ مساويًا للمخصوم تُعد السلفة مسددة. شهر البداية لا يتغير بعد خصم أي قسط؛ استعمل «تأجيل قسط شهر» بدلًا منه")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-2"><span className="block text-xs text-slate-500">{t("الموظف")}</span><span className="font-semibold">{advance.name}</span></div>
              <div className="rounded-md bg-slate-50 p-2"><span className="block text-xs text-slate-500">{t("المخصوم فعلًا من الرواتب")}</span><span className="font-semibold">{money(advance.repaid)}</span></div>
              <label className="space-y-1"><span className="block text-xs font-semibold text-slate-600">{t("مبلغ السلفة")}</span>
                <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={fieldClass} /></label>
              <label className="space-y-1"><span className="block text-xs font-semibold text-slate-600">{t("القسط الشهري")}</span>
                <input type="number" min="0" step="0.01" value={installment} onChange={(event) => setInstallment(event.target.value)} className={fieldClass} /></label>
              <label className="space-y-1"><span className="block text-xs font-semibold text-slate-600">{t("شهر بداية الخصم")}</span>
                <input type="month" value={startMonth} min={startChanged ? riyadhMonth() : undefined} onChange={(event) => setStartMonth(event.target.value)} className={fieldClass} /></label>
              <label className="space-y-1"><span className="block text-xs font-semibold text-slate-600">{t("ملاحظات")}</span>
                <input value={notes} onChange={(event) => setNotes(event.target.value)} className={fieldClass} /></label>
            </div>
            <p className="text-xs text-slate-600">{t("المتبقي المتوقع بعد الحفظ")}: <span className="font-semibold text-[#004e89]">{money(remainingAfter)}</span></p>
            {newAmount > 0 && newAmount < advance.repaid - 0.004 && (
              <p className="text-xs font-semibold text-rose-700">{t("مبلغ السلفة لا يقل عما خُصم منها فعلًا من الرواتب")}: {money(advance.repaid)}</p>
            )}
            {error && <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" data-readonly-exempt disabled={busy} onClick={onClose} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm">{t("إلغاء")}</button>
              <button type="button" data-readonly-exempt disabled={busy} onClick={() => void save()} className="flex items-center gap-1 rounded-md bg-[#004e89] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}{t("حفظ")}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type SkipRow = { id: string; month: string; note: string; createdBy: string; createdAt: string };

export function AdvanceSkipsDialog({ advance, onClose, onChanged }: {
  advance: AdvanceActionTarget | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t, direction, formatDate } = useI18n();
  const [rows, setRows] = useState<SkipRow[]>([]);
  const [month, setMonth] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // من شهر بداية السلفة فما بعد (الشهر الماضي مقبول ما دام رواتبه غير مقفلة؛ قاعدة البيانات تتحقق)
  const minMonth = advance?.startMonth || undefined;

  const load = async (id: string) => {
    setLoading(true); setError("");
    const { data, error: loadError } = await supabase.from("hr_advance_skips").select("id, month, note, created_by_name, created_at").eq("advance_id", id).order("month");
    setLoading(false);
    if (loadError) { setRows([]); setError(hrRequestErrorText(loadError, t("تعذر تحميل الأشهر المؤجلة"))); return; }
    setRows((data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ""),
      month: String(row.month ?? ""),
      note: String(row.note ?? ""),
      createdBy: String(row.created_by_name ?? ""),
      createdAt: String(row.created_at ?? "").slice(0, 10),
    })));
  };

  useEffect(() => {
    if (!advance) return;
    setMonth(advance.startMonth && advance.startMonth > riyadhMonth() ? advance.startMonth : riyadhMonth());
    setNote(""); setMessage("");
    void load(advance.id);
  }, [advance]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!advance || busy) return;
    if (!/^\d{4}-\d{2}$/.test(month)) { setError(t("اختر الشهر")); return; }
    if (advance.startMonth && month < advance.startMonth) { setError(t("لا يُؤجَّل قسط قبل شهر بداية السلفة")); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: insertError } = await supabase.from("hr_advance_skips").insert({ advance_id: advance.id, month, note: note.trim() || null });
      if (insertError) {
        if ((insertError as { code?: string }).code === "23505") throw new Error(t("هذا الشهر مؤجَّل مسبقًا"));
        throw insertError;
      }
      setMessage(`${t("أُجّل قسط شهر")} ${month}؛ ${t("لا يُخصم فيه ويمتد السداد شهرًا")}`);
      setNote("");
      await load(advance.id);
      onChanged();
    } catch (addError) {
      setError(hrRequestErrorText(addError, t("تعذر تأجيل القسط")));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: SkipRow) => {
    if (!advance || busy) return;
    if (!window.confirm(`${t("إلغاء تأجيل قسط شهر")} ${row.month}؟`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: deleteError } = await supabase.from("hr_advance_skips").delete().eq("id", row.id).select("id");
      if (deleteError) throw deleteError;
      setMessage((data ?? []).length ? t("أُلغي التأجيل؛ يُخصم قسط ذلك الشهر") : t("لم يُحذف شيء: لا تملك الصلاحية"));
      await load(advance.id);
      onChanged();
    } catch (deleteError) {
      setError(hrRequestErrorText(deleteError, t("تعذر إلغاء التأجيل")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(advance)} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-[560px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#004e89]"><CalendarClock className="h-5 w-5" />{t("تأجيل قسط شهري")}{advance ? ` — ${advance.name}` : ""}</DialogTitle>
        </DialogHeader>
        {advance && (
          <div className="space-y-3 text-sm">
            <p className="text-xs text-slate-600">{t("الشهر المؤجَّل لا يُخصم فيه قسط هذه السلفة، ويمتد سدادها شهرًا. لا يُؤجَّل شهر رواتبه معتمدة أو مرحّلة")}</p>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">{t("الشهر المؤجَّل")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("ملاحظة")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("بواسطة")}</th>
                    <th className="w-10 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-400">{t("جاري التحميل...")}</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-400">{t("لا توجد أشهر مؤجلة")}</td></tr>
                  ) : rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 font-semibold">{row.month}</td>
                      <td className="px-3 py-2 text-gray-600">{row.note || "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{row.createdBy || "—"}{row.createdAt ? ` — ${formatDate(row.createdAt)}` : ""}</td>
                      <td className="px-3 py-2">
                        <button type="button" data-readonly-exempt disabled={busy} onClick={() => void remove(row)} className="text-gray-500 hover:text-rose-700 disabled:opacity-50" title={t("إلغاء التأجيل")}><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-end">
              <label className="space-y-1"><span className="block text-xs font-semibold text-slate-600">{t("استبعاد قسط شهر")}</span>
                <input type="month" value={month} min={minMonth} onChange={(event) => setMonth(event.target.value)} className={fieldClass} /></label>
              <label className="space-y-1"><span className="block text-xs font-semibold text-slate-600">{t("ملاحظة")}</span>
                <input value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} className={fieldClass} /></label>
              <button type="button" data-readonly-exempt disabled={busy} onClick={() => void add()} className="flex items-center justify-center gap-1 rounded-md bg-[#004e89] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}{t("تأجيل")}
              </button>
            </div>
            {error && <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-700">{error}</p>}
            {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">{message}</p>}
            <div className="flex justify-end">
              <button type="button" data-readonly-exempt disabled={busy} onClick={onClose} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm">{t("إغلاق")}</button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
