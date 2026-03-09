import Layout from "@/components/Layout";
import { purchasesFeatures } from "./Purchases";
import { ArrowRight, Plus, Save, Trash2 } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";

type DebitNoteItem = {
  id: string;
  description: string;
  account: string;
  quantity: number;
  unitPrice: number;
};

type DebitNote = {
  id: string;
  noteNumber: string;
  supplier: string;
  currency: string;
  date: string;
  orderRef: string;
  project: string;
  subtotal: number;
  tax: number;
  total: number;
  items: DebitNoteItem[];
};

type DebitNoteForm = Omit<DebitNote, "id" | "subtotal" | "tax" | "total">;

const STORAGE_KEY = "purchase-debit-notes";
const START_NUMBER = 100;

const emptyItem = (): DebitNoteItem => ({
  id: crypto.randomUUID(),
  description: "",
  account: "",
  quantity: 1,
  unitPrice: 0,
});

const buildNumber = (num: number) => `DN-${String(num).padStart(6, "0")}`;
const extractNumber = (noteNumber: string) => Number(noteNumber.split("-")[1] || START_NUMBER);

const createEmptyForm = (num: number): DebitNoteForm => ({
  noteNumber: buildNumber(num),
  supplier: "",
  currency: "SAR",
  date: new Date().toISOString().split("T")[0],
  orderRef: "",
  project: "",
  items: [emptyItem()],
});

export default function PurchaseDebitNotes() {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [rows, setRows] = useState<DebitNote[]>([]);
  const [nextNumber, setNextNumber] = useState(START_NUMBER);
  const [form, setForm] = useState<DebitNoteForm>(() => createEmptyForm(START_NUMBER));

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as DebitNote[];
      setRows(parsed);
      const max = parsed.reduce((acc, cur) => Math.max(acc, extractNumber(cur.noteNumber)), START_NUMBER - 1);
      const sequence = max + 1;
      setNextNumber(sequence);
      setForm(createEmptyForm(sequence));
    } catch {
      setRows([]);
      setNextNumber(START_NUMBER);
      setForm(createEmptyForm(START_NUMBER));
    }
  }, []);

  const subtotal = useMemo(
    () => form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [form.items]
  );
  const tax = useMemo(() => subtotal * 0.15, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const updateItem = (id: string, key: keyof DebitNoteItem, value: string | number) => {
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

  const createNew = () => {
    setForm(createEmptyForm(nextNumber));
    setMode("create");
  };

  const handleSave = () => {
    if (!form.supplier.trim()) {
      toast({ title: "المورد مطلوب", description: "يرجى إدخال المورد قبل الحفظ" });
      return;
    }

    const payload: DebitNote = {
      id: crypto.randomUUID(),
      ...form,
      subtotal,
      tax,
      total,
    };

    const updated = [payload, ...rows];
    setRows(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    const sequence = extractNumber(form.noteNumber) + 1;
    setNextNumber(sequence);
    setForm(createEmptyForm(sequence));
    setMode("list");

    toast({ title: "تم حفظ إشعار مدين", description: `تم حفظ ${payload.noteNumber}` });
  };

  return (
    <Layout subMenu={{ title: "المشتريات", items: purchasesFeatures }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إشعار مدين</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "list" ? "عرض الإشعارات المدينة" : "إنشاء إشعار مدين جديد"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {mode === "list" ? (
              <button
                onClick={createNew}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                إنشاء إشعار مدين جديد
              </button>
            ) : (
              <>
                <button
                  onClick={() => setMode("list")}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium"
                >
                  <ArrowRight className="h-4 w-4" />
                  الرجوع للإشعارات
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  <Save className="h-4 w-4" />
                  حفظ الإشعار
                </button>
              </>
            )}
          </div>
        </div>

        {mode === "list" ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              عدد الإشعارات المدينة: <span className="font-semibold text-foreground">{rows.length}</span>
            </p>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد إشعارات محفوظة حالياً.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-right text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-3 py-2">رقم الإشعار</th>
                      <th className="px-3 py-2">المورد</th>
                      <th className="px-3 py-2">التاريخ</th>
                      <th className="px-3 py-2">العملة</th>
                      <th className="px-3 py-2">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-3 py-2 font-semibold text-primary">{row.noteNumber}</td>
                        <td className="px-3 py-2">{row.supplier}</td>
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2">{row.currency}</td>
                        <td className="px-3 py-2">{row.total.toFixed(2)} ﷼</td>
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
                  شركة لاكجري العياف
                </div>
                <h2 className="text-xl font-bold text-foreground">شركة لاكجري العياف</h2>
                <p className="text-sm text-muted-foreground">الشيخ محمد بن جبير</p>
                <p className="text-sm text-muted-foreground">مكة المكرمة</p>
                <p className="text-sm text-muted-foreground">المملكة العربية السعودية</p>
                <p className="text-sm text-muted-foreground">رقم التسجيل الضريبي: 314559705300003</p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <Field label="رقم الإشعار">
                  <input value={form.noteNumber} readOnly className="h-10 w-full rounded-md border border-border bg-muted/30 px-3 text-sm" />
                </Field>
                <Field label="المورد*">
                  <input
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    placeholder="مطلوب"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="العملة*">
                    <input
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </Field>
                  <Field label="التاريخ*">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </Field>
                </div>
                <Field label="أمر شراء">
                  <input
                    value={form.orderRef}
                    onChange={(e) => setForm({ ...form, orderRef: e.target.value })}
                    placeholder="اختياري"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </Field>
                <Field label="المشروع">
                  <input
                    value={form.project}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                    placeholder="اختياري"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">السعر شامل من الضريبة</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-right text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-3 py-2">الوصف*</th>
                      <th className="px-3 py-2">حساب*</th>
                      <th className="px-3 py-2">الكمية*</th>
                      <th className="px-3 py-2">السعر*</th>
                      <th className="px-3 py-2">المجموع</th>
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
                              placeholder="مطلوب"
                              className="h-10 w-full rounded-md border border-border bg-background px-3"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={item.account}
                              onChange={(e) => updateItem(item.id, "account", e.target.value)}
                              placeholder="مطلوب"
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
                          <td className="px-3 py-2 font-semibold">{lineTotal.toFixed(2)} ﷼</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeItem(item.id)}
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
                  أضف بند
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
                يتم توليد البيانات لعرض متطلبات ضريبة القيمة المضافة في الإشعار.
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>المجموع الفرعي</span>
                  <span>{subtotal.toFixed(2)} ﷼</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>إجمالي ضريبة القيمة المضافة</span>
                  <span>{tax.toFixed(2)} ﷼</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
                  <span>المجموع</span>
                  <span>{total.toFixed(2)} ﷼</span>
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
