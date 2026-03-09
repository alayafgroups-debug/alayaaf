import Layout from "@/components/Layout";
import { purchasesFeatures } from "./Purchases";
import { ArrowRight, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";

type VendorVoucher = {
  id: string;
  voucherNumber: string;
  vendor: string;
  paidVia: string;
  paymentCurrency: string;
  paidAmount: string;
  date: string;
  description: string;
  paymentType: "دفعة مقدمة" | "دفعات فواتير مشتريات";
};

type VoucherForm = Omit<VendorVoucher, "id">;

const STORAGE_KEY = "purchase-vendor-vouchers";
const START_NUMBER = 1;

const buildVoucherNumber = (num: number) => `SVV-${String(num).padStart(4, "0")}`;
const extractNumber = (voucherNumber: string) => Number(voucherNumber.split("-")[1] || START_NUMBER);

const getEmptyForm = (num: number): VoucherForm => ({
  voucherNumber: buildVoucherNumber(num),
  vendor: "",
  paidVia: "",
  paymentCurrency: "SAR",
  paidAmount: "",
  date: new Date().toISOString().split("T")[0],
  description: "",
  paymentType: "دفعة مقدمة",
});

export default function PurchaseVendorVouchers() {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [items, setItems] = useState<VendorVoucher[]>([]);
  const [nextNumber, setNextNumber] = useState(START_NUMBER);
  const [form, setForm] = useState<VoucherForm>(() => getEmptyForm(START_NUMBER));

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as VendorVoucher[];
      setItems(parsed);
      const max = parsed.reduce((acc, cur) => Math.max(acc, extractNumber(cur.voucherNumber)), 0);
      const sequence = max + 1;
      setNextNumber(sequence);
      setForm(getEmptyForm(sequence));
    } catch {
      setItems([]);
      setNextNumber(START_NUMBER);
      setForm(getEmptyForm(START_NUMBER));
    }
  }, []);

  const paidAmount = useMemo(() => Number.parseFloat(form.paidAmount || "0") || 0, [form.paidAmount]);

  const handleCreateNew = () => {
    setForm(getEmptyForm(nextNumber));
    setMode("create");
  };

  const handleSave = () => {
    if (!form.vendor.trim()) {
      toast({ title: "المورد مطلوب", description: "يرجى اختيار أو إدخال المورد" });
      return;
    }

    const payload: VendorVoucher = {
      id: crypto.randomUUID(),
      ...form,
    };

    const updated = [payload, ...items];
    setItems(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    const sequence = extractNumber(form.voucherNumber) + 1;
    setNextNumber(sequence);
    setForm(getEmptyForm(sequence));
    setMode("list");

    toast({
      title: "تم حفظ سند المورد",
      description: `تم حفظ السند ${payload.voucherNumber}`,
    });
  };

  return (
    <Layout subMenu={{ title: "المشتريات", items: purchasesFeatures }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">سند صرف لمورد</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "list" ? "عرض سندات الموردين" : "إنشاء سند مورد جديد"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {mode === "list" ? (
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                إنشاء سند مورد جديد
              </button>
            ) : (
              <>
                <button
                  onClick={() => setMode("list")}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium"
                >
                  <ArrowRight className="h-4 w-4" />
                  الرجوع للسندات
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  <Save className="h-4 w-4" />
                  حفظ السند
                </button>
              </>
            )}
          </div>
        </div>

        {mode === "list" ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              عدد سندات الموردين: <span className="font-semibold text-foreground">{items.length}</span>
            </p>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد سندات محفوظة حالياً.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-right text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-3 py-2">رقم السند</th>
                      <th className="px-3 py-2">المورد</th>
                      <th className="px-3 py-2">التاريخ</th>
                      <th className="px-3 py-2">عملة الدفع</th>
                      <th className="px-3 py-2">المبلغ المدفوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((voucher) => (
                      <tr key={voucher.id} className="border-t border-border">
                        <td className="px-3 py-2 font-semibold text-primary">{voucher.voucherNumber}</td>
                        <td className="px-3 py-2">{voucher.vendor}</td>
                        <td className="px-3 py-2">{voucher.date}</td>
                        <td className="px-3 py-2">{voucher.paymentCurrency}</td>
                        <td className="px-3 py-2">{voucher.paidAmount || "0.00"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 rounded-xl border border-border bg-card p-6">
            <h3 className="text-2xl font-semibold text-foreground text-right">سند صرف لمورد</h3>

            <section className="space-y-4">
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-2">
                <h4 className="text-sm font-semibold text-foreground">معلومات أساسية</h4>
                <span className="text-xs text-muted-foreground">مطلوب</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">مورد*</label>
                  <input
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="مطلوب"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">تم الدفع من خلال*</label>
                  <input
                    value={form.paidVia}
                    onChange={(e) => setForm({ ...form, paidVia: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="مطلوب"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">عملة الدفع*</label>
                  <input
                    value={form.paymentCurrency}
                    onChange={(e) => setForm({ ...form, paymentCurrency: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="مطلوب"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">المبلغ المدفوع*</label>
                  <input
                    type="number"
                    value={form.paidAmount}
                    onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="مطلوب"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">التاريخ</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">الوصف</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="غير محدد"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-2">
                <h4 className="text-sm font-semibold text-foreground">معلومات إضافية (اختياري)</h4>
                <span className="text-xs text-muted-foreground">⌄</span>
              </div>

              <div>
                <p className="mb-2 text-xs text-muted-foreground">نوع الدفعة</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentType: "دفعة مقدمة" })}
                    className={`rounded-md border px-3 py-1.5 text-xs ${
                      form.paymentType === "دفعة مقدمة" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                    }`}
                  >
                    دفعة مقدمة
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentType: "دفعات فواتير مشتريات" })}
                    className={`rounded-md border px-3 py-1.5 text-xs ${
                      form.paymentType === "دفعات فواتير مشتريات" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                    }`}
                  >
                    دفعات فواتير مشتريات
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">تخفيض من رصيد المورد</span>
                <span className="font-medium">{paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">المبلغ المدفوع</span>
                <span className="font-medium">{paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground font-semibold">المتبقي</span>
                <span className="font-semibold">0.00</span>
              </div>
            </section>

            <div className="flex justify-end">
              <input
                value={form.voucherNumber}
                readOnly
                className="w-40 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
                placeholder="رقم السند"
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
