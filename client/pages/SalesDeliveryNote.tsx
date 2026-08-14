import Layout from "@/components/Layout";
import { salesFeatures } from "./Sales";
import { Plus, Save, Trash2, ArrowRight } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

type DeliveryNoteItem = {
  id: string;
  description: string;
  account: string;
  quantity: number;
  unitPrice: number;
};

type SavedDeliveryNote = {
  id: string;
  noteNumber: string;
  customer: string;
  currency: string;
  date: string;
  orderRef: string;
  reference: string;
  project: string;
  warehouse: string;
  subtotal: number;
  tax: number;
  total: number;
  items: DeliveryNoteItem[];
};

type DeliveryNoteForm = {
  noteNumber: string;
  customer: string;
  currency: string;
  date: string;
  orderRef: string;
  reference: string;
  project: string;
  warehouse: string;
  items: DeliveryNoteItem[];
};

const STORAGE_KEY = "sales-delivery-notes";
const START_NUMBER = 100;

const emptyItem = (): DeliveryNoteItem => ({
  id: crypto.randomUUID(),
  description: "",
  account: "",
  quantity: 1,
  unitPrice: 0,
});

const buildNoteNumber = (sequence: number) => `GDN-${String(sequence).padStart(6, "0")}`;

const extractSequence = (noteNumber: string) => {
  const parsed = Number(noteNumber.replace("GDN-", ""));
  return Number.isFinite(parsed) ? parsed : START_NUMBER;
};

const createEmptyForm = (sequence: number): DeliveryNoteForm => ({
  noteNumber: buildNoteNumber(sequence),
  customer: "",
  currency: "SAR",
  date: new Date().toISOString().split("T")[0],
  orderRef: "",
  reference: "",
  project: "",
  warehouse: "",
  items: [emptyItem()],
});

export default function SalesDeliveryNote() {
  const { t, direction, formatDate, formatNumber } = useI18n();
  const [savedNotes, setSavedNotes] = useState<SavedDeliveryNote[]>([]);
  const [nextSequence, setNextSequence] = useState(START_NUMBER);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [form, setForm] = useState<DeliveryNoteForm>(() => createEmptyForm(START_NUMBER));

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SavedDeliveryNote[];
      setSavedNotes(parsed);

      const maxSequence = parsed.reduce(
        (max, note) => Math.max(max, extractSequence(note.noteNumber)),
        START_NUMBER - 1
      );
      const sequence = maxSequence + 1;
      setNextSequence(sequence);
      setForm(createEmptyForm(sequence));
    } catch {
      setSavedNotes([]);
      setNextSequence(START_NUMBER);
      setForm(createEmptyForm(START_NUMBER));
    }
  }, []);

  const subtotal = useMemo(
    () => form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [form.items]
  );
  const tax = useMemo(() => subtotal * 0.15, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);
  const formatAmount = (value: number) =>
    `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ﷼`;

  const updateItem = (id: string, key: keyof DeliveryNoteItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItem = (id: string) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.id !== id) : prev.items,
    }));

  const createNewNote = () => {
    setForm(createEmptyForm(nextSequence));
    setMode("create");
  };

  const handleSave = () => {
    if (!form.customer.trim()) {
      toast({ title: t("العميل مطلوب"), description: t("يرجى إدخال اسم العميل قبل الحفظ") });
      return;
    }

    const cleanedItems = form.items.filter(
      (item) => item.description.trim() || item.account.trim() || item.unitPrice > 0
    );

    const payload: SavedDeliveryNote = {
      id: crypto.randomUUID(),
      noteNumber: form.noteNumber,
      customer: form.customer,
      currency: form.currency,
      date: form.date,
      orderRef: form.orderRef,
      reference: form.reference,
      project: form.project,
      warehouse: form.warehouse,
      subtotal,
      tax,
      total,
      items: cleanedItems.length > 0 ? cleanedItems : [emptyItem()],
    };

    const updated = [payload, ...savedNotes];
    setSavedNotes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    const sequence = extractSequence(form.noteNumber) + 1;
    setNextSequence(sequence);
    setForm(createEmptyForm(sequence));
    setMode("list");

    toast({
      title: t("تم حفظ إشعار تسليم"),
      description: t("تم حفظ الإشعار {noteNumber} بنجاح").replace("{noteNumber}", payload.noteNumber),
    });
  };

  return (
    <Layout subMenu={{ title: t("المبيعات"), items: salesFeatures }}>
      <div dir={direction} className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("إشعار تسليم")}</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "list" ? t("عرض إشعارات التسليم") : t("إنشاء إشعار تسليم جديد")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {mode === "list" ? (
              <button
                onClick={createNewNote}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                {t("إنشاء إشعار تسليم جديد")}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setMode("list")}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium"
                >
                  <ArrowRight className={`h-4 w-4 ${direction === "ltr" ? "rotate-180" : ""}`} />
                  {t("الرجوع للإشعارات")}
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  <Save className="h-4 w-4" />
                  {t("حفظ الإشعار")}
                </button>
              </>
            )}
          </div>
        </div>

        {mode === "list" ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              {t("عدد الإشعارات المحفوظة:")} <span className="font-semibold text-foreground">{formatNumber(savedNotes.length)}</span>
            </p>

            {savedNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("لا يوجد إشعارات محفوظة حالياً.")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-start text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-3 py-2">{t("رقم الإشعار")}</th>
                      <th className="px-3 py-2">{t("العميل")}</th>
                      <th className="px-3 py-2">{t("التاريخ")}</th>
                      <th className="px-3 py-2">{t("العملة")}</th>
                      <th className="px-3 py-2">{t("الإجمالي")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedNotes.map((note) => (
                      <tr key={note.id} className="border-t border-border">
                        <td className="px-3 py-2 font-semibold text-primary">{note.noteNumber}</td>
                        <td className="px-3 py-2">{note.customer}</td>
                        <td className="px-3 py-2">{formatDate(note.date, { dateStyle: "medium" })}</td>
                        <td className="px-3 py-2">{note.currency}</td>
                        <td className="px-3 py-2">{formatAmount(note.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex h-14 w-36 items-center justify-center rounded-md bg-slate-700 text-xs font-semibold text-white">
                  {t("شركة لاكجري العياف")}
                </div>
                <h2 className="text-xl font-bold text-foreground">{t("شركة لاكجري العياف")}</h2>
                <p className="text-sm text-muted-foreground">{t("الشيخ محمد بن جبير")}</p>
                <p className="text-sm text-muted-foreground">{t("مكة المكرمة")}</p>
                <p className="text-sm text-muted-foreground">{t("المملكة العربية السعودية")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("رقم التسجيل الضريبي:")} {formatNumber(314559705300003, { useGrouping: false })}
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <Field label={t("العميل*")}>
                  <input
                    value={form.customer}
                    onChange={(e) => setForm({ ...form, customer: e.target.value })}
                    placeholder={t("مطلوب")}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </Field>

                <Field label={t("رقم إشعار التسليم")}>
                  <input
                    value={form.noteNumber}
                    readOnly
                    className="h-10 w-full rounded-md border border-border bg-muted/30 px-3 text-sm"
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("العملة*")}>
                    <input
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </Field>
                  <Field label={t("التاريخ*")}>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("رقم الطلب")}>
                    <input
                      value={form.orderRef}
                      onChange={(e) => setForm({ ...form, orderRef: e.target.value })}
                      placeholder={t("اختياري")}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </Field>
                  <Field label={t("المرجع")}>
                    <input
                      value={form.reference}
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      placeholder={t("اختياري")}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </Field>
                </div>

                <Field label={t("المشروع")}>
                  <input
                    value={form.project}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                    placeholder={t("تحديد")}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{t("السعر شامل من الضريبة")}</p>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-start text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-3 py-2">{t("الوصف*")}</th>
                      <th className="px-3 py-2">{t("الكمية*")}</th>
                      <th className="px-3 py-2">{t("السعر*")}</th>
                      <th className="px-3 py-2">{t("المجموع")}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item) => {
                      const lineTotal = item.quantity * item.unitPrice;
                      return (
                        <tr key={item.id} className="border-t border-border">
                          <td className="px-3 py-2">
                            <input
                              value={item.description}
                              onChange={(e) => updateItem(item.id, "description", e.target.value)}
                              placeholder={t("مفتاح أو خدمة")}
                              className="h-10 w-full rounded-md border border-border bg-background px-3"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value) || 1)}
                              className="h-10 w-24 rounded-md border border-border bg-background px-3"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value) || 0)}
                              className="h-10 w-32 rounded-md border border-border bg-background px-3"
                            />
                          </td>
                          <td className="px-3 py-2 font-semibold">{formatAmount(lineTotal)}</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeItem(item.id)}
                              aria-label={t("حذف البند")}
                              className="rounded-md border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={addItem}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  {t("أضف بند")}
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
                {t("يتم توليد البيانات لعرض متطلبات ضريبة القيمة المضافة في إشعار التسليم.")}
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>{t("المجموع الفرعي")}</span>
                  <span>{formatAmount(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("إجمالي ضريبة القيمة المضافة")}</span>
                  <span>{formatAmount(tax)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
                  <span>{t("المجموع")}</span>
                  <span>{formatAmount(total)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid items-center gap-2 sm:grid-cols-[140px_1fr]">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
