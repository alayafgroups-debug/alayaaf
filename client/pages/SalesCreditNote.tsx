import Layout from "@/components/Layout";
import { salesFeatures } from "./Sales";
import { Plus, Trash2 } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";

type CreditNoteItem = {
  id: string;
  description: string;
  account: string;
  quantity: number;
  unitPrice: number;
};

const emptyItem = (): CreditNoteItem => ({
  id: crypto.randomUUID(),
  description: "",
  account: "",
  quantity: 1,
  unitPrice: 0,
});

export default function SalesCreditNote() {
  const [noteNumber] = useState("CN-000100");
  const [customer, setCustomer] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [orderRef, setOrderRef] = useState("");
  const [reference, setReference] = useState("");
  const [project, setProject] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [items, setItems] = useState<CreditNoteItem[]>([emptyItem()]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );
  const tax = useMemo(() => subtotal * 0.15, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const updateItem = (id: string, key: keyof CreditNoteItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  return (
    <Layout subMenu={{ title: "المبيعات", items: salesFeatures }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إشعار دائن</h1>
            <p className="text-sm text-muted-foreground">Credit note / إشعار دائن</p>
          </div>
        </div>

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
              <input value={noteNumber} readOnly className="h-10 w-full rounded-md border border-border bg-muted/30 px-3 text-sm" />
            </Field>

            <Field label="العميل*">
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="مطلوب"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="العملة*">
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
              <Field label="التاريخ*">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="أمر الشراء">
                <input
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  placeholder="اختياري"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
              <Field label="المرجع">
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="اختياري"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="المشروع">
                <input
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="اختياري"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
              <Field label="المستودع">
                <input
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  placeholder="اختياري"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">السعر شامل من الضريبة</p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-3 py-2">الوصف</th>
                  <th className="px-3 py-2">حساب*</th>
                  <th className="px-3 py-2">الكمية*</th>
                  <th className="px-3 py-2">السعر*</th>
                  <th className="px-3 py-2">المجموع</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="مفتاح أو خدمة"
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
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          className="h-10 w-24 rounded-md border border-border bg-background px-3"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))}
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
            رمز الاستجابة السريعة يظهر لعرض متطلبات هيئة الزكاة والضريبة والجمارك بالفاتورة الإلكترونية.
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
