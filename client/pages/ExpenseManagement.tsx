import Layout from "@/components/Layout";
import { Plus, Search, Filter, Eye, Pencil, Trash2, Save, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type VoucherRow = {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  description: string;
  department: string;
  approvedBy: string;
  totalAmount: string;
  status: string;
};

type PettyCashRow = {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  beneficiaryName: string;
  purpose: string;
  amount: string;
  paidBy: string;
  receivedBy: string;
  status: string;
};

type VoucherForm = {
  id?: string;
  voucherNumber: string;
  voucherDate: string;
  description: string;
  department: string;
  approvedBy: string;
  items: Array<{
    id?: string;
    description: string;
    accountCode: string;
    amount: string;
  }>;
};

type PettyCashForm = {
  id?: string;
  voucherNumber: string;
  voucherDate: string;
  beneficiaryName: string;
  purpose: string;
  amount: string;
  paidBy: string;
  receivedBy: string;
};

const mapVoucherRow = (row: Record<string, unknown>): VoucherRow => ({
  id: String(row.id ?? ""),
  voucherNumber: String(row.voucher_number ?? ""),
  voucherDate: String(row.voucher_date ?? ""),
  description: String(row.description ?? ""),
  department: String(row.department ?? ""),
  approvedBy: String(row.approved_by ?? ""),
  totalAmount: String(row.total_amount ?? "0.00"),
  status: String(row.status ?? "مسودة"),
});

const mapPettyCashRow = (row: Record<string, unknown>): PettyCashRow => ({
  id: String(row.id ?? ""),
  voucherNumber: String(row.voucher_number ?? ""),
  voucherDate: String(row.voucher_date ?? ""),
  beneficiaryName: String(row.beneficiary_name ?? ""),
  purpose: String(row.purpose ?? ""),
  amount: String(row.amount ?? "0.00"),
  paidBy: String(row.paid_by ?? ""),
  receivedBy: String(row.received_by ?? ""),
  status: String(row.status ?? "قيد المراجعة"),
});

export default function ExpenseManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const isVouchers = location.pathname.includes("/expenses/vouchers");
  const isPettyCash = location.pathname.includes("/expenses/petty-cash");
  const isReports = location.pathname.includes("/expenses/reports");

  const [voucherRows, setVoucherRows] = useState<VoucherRow[]>([]);
  const [pettyCashRows, setPettyCashRows] = useState<PettyCashRow[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [voucherForm, setVoucherForm] = useState<VoucherForm>({
    voucherNumber: "",
    voucherDate: new Date().toISOString().split("T")[0],
    description: "",
    department: "",
    approvedBy: "",
    items: [{ description: "", accountCode: "", amount: "" }],
  });
  const [pettyCashForm, setPettyCashForm] = useState<PettyCashForm>({
    voucherNumber: "",
    voucherDate: new Date().toISOString().split("T")[0],
    beneficiaryName: "",
    purpose: "",
    amount: "",
    paidBy: "",
    receivedBy: "",
  });

  useEffect(() => {
    if (!isReports) {
      if (isVouchers) loadVouchers();
      if (isPettyCash) loadPettyCash();
    }
  }, [isVouchers, isPettyCash, isReports]);

  const loadVouchers = async () => {
    const result = await supabase
      .from("expense_vouchers")
      .select("*")
      .order("voucher_date", { ascending: false })
      .then((res) => ({ ...res, failed: false as const }))
      .catch(() => ({ data: null, error: new Error("fetch_failed"), failed: true as const }));

    if (!result.error && result.data) {
      setVoucherRows(result.data.map((row) => mapVoucherRow(row as Record<string, unknown>)));
    } else {
      setVoucherRows([]);
    }
  };

  const loadPettyCash = async () => {
    const result = await supabase
      .from("petty_cash_vouchers")
      .select("*")
      .order("voucher_date", { ascending: false })
      .then((res) => ({ ...res, failed: false as const }))
      .catch(() => ({ data: null, error: new Error("fetch_failed"), failed: true as const }));

    if (!result.error && result.data) {
      setPettyCashRows(result.data.map((row) => mapPettyCashRow(row as Record<string, unknown>)));
    } else {
      setPettyCashRows([]);
    }
  };

  const title = isReports
    ? "تقرير المصروفات"
    : isPettyCash
      ? "سندات القيض"
      : isVouchers
        ? "سندات الصرف"
        : "المصرفات";

  const description = isReports
    ? "ملخصات وتقارير المصروفات والسندات."
    : isPettyCash
      ? "إدارة سندات القيض وتتبع النقد الصغير."
      : isVouchers
        ? "إنشاء وإدارة سندات الصرف والمصروفات."
        : "إدارة المصرفات والسندات والتقارير.";

  if (!isVouchers && !isPettyCash && !isReports) {
    return (
      <Layout
        subMenu={{
          title: "المصرفات",
          items: [
            { label: "سندات الصرف", href: "/expenses/vouchers" },
            { label: "سندات القيض", href: "/expenses/petty-cash" },
            { label: "التقارير", href: "/expenses/reports" },
          ],
        }}
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">المصرفات</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              إدارة المصرفات والسندات والتقارير المالية.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <button
              onClick={() => navigate("/expenses/vouchers")}
              className="overflow-hidden rounded-xl border border-border bg-card p-6 transition hover:shadow-md hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">سندات الصرف</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    إنشاء وإدارة سندات الصرف والمصروفات
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/expenses/petty-cash")}
              className="overflow-hidden rounded-xl border border-border bg-card p-6 transition hover:shadow-md hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">سندات القيض</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    إدارة سندات القيض وتتبع النقد الصغير
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-sky-600" />
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/expenses/reports")}
              className="overflow-hidden rounded-xl border border-border bg-card p-6 transition hover:shadow-md hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">التقارير</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    عرض تقارير المصروفات والإحصائيات
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-rose-600" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      subMenu={{
        title: "المصرفات",
        items: [
          { label: "سندات الصرف", href: "/expenses/vouchers" },
          { label: "سندات القيض", href: "/expenses/petty-cash" },
          { label: "التقارير", href: "/expenses/reports" },
        ],
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          {!isReports && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90"
            >
              <Plus className="h-4 w-4" />
              {isVouchers ? "إنشاء سند صرف جديد" : "إنشاء سند قيض جديد"}
            </button>
          )}
        </div>

        {!isReports && isFormOpen && isVouchers ? (
          <VoucherForm
            form={voucherForm}
            setForm={setVoucherForm}
            onSave={async () => {
              setSaving(true);
              const payload = {
                id: voucherForm.id ?? crypto.randomUUID(),
                voucher_number: voucherForm.voucherNumber,
                voucher_date: voucherForm.voucherDate,
                description: voucherForm.description,
                department: voucherForm.department,
                approved_by: voucherForm.approvedBy,
                total_amount: voucherForm.items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0),
                status: "مسودة",
              };

              const result = voucherForm.id
                ? await supabase
                    .from("expense_vouchers")
                    .update(payload)
                    .eq("id", voucherForm.id)
                : await supabase.from("expense_vouchers").insert([payload]);

              if (!result.error) {
                await loadVouchers();
                setIsFormOpen(false);
                setVoucherForm({
                  voucherNumber: "",
                  voucherDate: new Date().toISOString().split("T")[0],
                  description: "",
                  department: "",
                  approvedBy: "",
                  items: [{ description: "", accountCode: "", amount: "" }],
                });
                toast({ title: "تم الحفظ", description: "تم حفظ السند بنجاح" });
              } else {
                toast({ title: "فشل الحفظ", description: "تعذر حفظ السند", variant: "destructive" });
              }
              setSaving(false);
            }}
            onCancel={() => setIsFormOpen(false)}
            saving={saving}
          />
        ) : !isReports && isFormOpen && isPettyCash ? (
          <PettyCashForm
            form={pettyCashForm}
            setForm={setPettyCashForm}
            onSave={async () => {
              setSaving(true);
              const payload = {
                id: pettyCashForm.id ?? crypto.randomUUID(),
                voucher_number: pettyCashForm.voucherNumber,
                voucher_date: pettyCashForm.voucherDate,
                beneficiary_name: pettyCashForm.beneficiaryName,
                purpose: pettyCashForm.purpose,
                amount: pettyCashForm.amount,
                paid_by: pettyCashForm.paidBy,
                received_by: pettyCashForm.receivedBy,
                status: "قيد المراجعة",
              };

              const result = pettyCashForm.id
                ? await supabase
                    .from("petty_cash_vouchers")
                    .update(payload)
                    .eq("id", pettyCashForm.id)
                : await supabase.from("petty_cash_vouchers").insert([payload]);

              if (!result.error) {
                await loadPettyCash();
                setIsFormOpen(false);
                setPettyCashForm({
                  voucherNumber: "",
                  voucherDate: new Date().toISOString().split("T")[0],
                  beneficiaryName: "",
                  purpose: "",
                  amount: "",
                  paidBy: "",
                  receivedBy: "",
                });
                toast({ title: "تم الحفظ", description: "تم حفظ السند بنجاح" });
              } else {
                toast({ title: "فشل الحفظ", description: "تعذر حفظ السند", variant: "destructive" });
              }
              setSaving(false);
            }}
            onCancel={() => setIsFormOpen(false)}
            saving={saving}
          />
        ) : null}

        {isVouchers && !isFormOpen && (
          <VouchersList rows={voucherRows} onDelete={async (id) => {
            if (!confirm("هل متأكد من حذف السند؟")) return;
            setDeleting(true);
            const result = await supabase.from("expense_vouchers").delete().eq("id", id);
            if (!result.error) {
              await loadVouchers();
              toast({ title: "تم الحذف", description: "تم حذف السند بنجاح" });
            } else {
              toast({ title: "فشل الحذف", variant: "destructive" });
            }
            setDeleting(false);
          }} />
        )}

        {isPettyCash && !isFormOpen && (
          <PettyCashList rows={pettyCashRows} onDelete={async (id) => {
            if (!confirm("هل متأكد من حذف السند؟")) return;
            setDeleting(true);
            const result = await supabase.from("petty_cash_vouchers").delete().eq("id", id);
            if (!result.error) {
              await loadPettyCash();
              toast({ title: "تم الحذف", description: "تم حذف السند بنجاح" });
            } else {
              toast({ title: "فشل الحذف", variant: "destructive" });
            }
            setDeleting(false);
          }} />
        )}

        {isReports && <ExpenseReportsList />}
      </div>
    </Layout>
  );
}

function VoucherForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  form: VoucherForm;
  setForm: (form: VoucherForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">إنشاء سند صرف جديد</h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground">رقم السند</label>
          <input
            value={form.voucherNumber}
            onChange={(e) => setForm({ ...form, voucherNumber: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="مثلاً: SVN-001"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">التاريخ</label>
          <input
            type="date"
            value={form.voucherDate}
            onChange={(e) => setForm({ ...form, voucherDate: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">القسم</label>
          <input
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="القسم"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">موافق من قبل</label>
          <input
            value={form.approvedBy}
            onChange={(e) => setForm({ ...form, approvedBy: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="الاسم"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">الوصف</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="وصف السند"
          rows={2}
        />
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm">بنود السند</h4>
          <button
            onClick={() =>
              setForm({
                ...form,
                items: [...form.items, { description: "", accountCode: "", amount: "" }],
              })
            }
            className="text-xs text-primary hover:underline"
          >
            + إضافة بند
          </button>
        </div>

        <div className="space-y-2">
          {form.items.map((item, idx) => (
            <div key={idx} className="grid gap-2 grid-cols-3">
              <input
                value={item.description}
                onChange={(e) => {
                  const newItems = [...form.items];
                  newItems[idx].description = e.target.value;
                  setForm({ ...form, items: newItems });
                }}
                placeholder="البند"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                value={item.accountCode}
                onChange={(e) => {
                  const newItems = [...form.items];
                  newItems[idx].accountCode = e.target.value;
                  setForm({ ...form, items: newItems });
                }}
                placeholder="كود الحساب"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={item.amount}
                  onChange={(e) => {
                    const newItems = [...form.items];
                    newItems[idx].amount = e.target.value;
                    setForm({ ...form, items: newItems });
                  }}
                  placeholder="المبلغ"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      items: form.items.filter((_, i) => i !== idx),
                    })
                  }
                  className="p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>

        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
        >
          <X className="h-4 w-4" />
          إلغاء
        </button>
      </div>
    </div>
  );
}

function PettyCashForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  form: PettyCashForm;
  setForm: (form: PettyCashForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">إنشاء سند قيض جديد</h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground">رقم السند</label>
          <input
            value={form.voucherNumber}
            onChange={(e) => setForm({ ...form, voucherNumber: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="مثلاً: PCN-001"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">التاريخ</label>
          <input
            type="date"
            value={form.voucherDate}
            onChange={(e) => setForm({ ...form, voucherDate: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">المستفيد</label>
          <input
            value={form.beneficiaryName}
            onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="اسم المستفيد"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">المبلغ (ريال)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs text-muted-foreground">الغرض</label>
          <textarea
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="غرض الصرف"
            rows={3}
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">صرفه</label>
            <input
              value={form.paidBy}
              onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="اسم الموظف"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">استلمه</label>
            <input
              value={form.receivedBy}
              onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="اسم المستلم"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>

        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
        >
          <X className="h-4 w-4" />
          إلغاء
        </button>
      </div>
    </div>
  );
}

function VouchersList({ rows, onDelete }: { rows: VoucherRow[]; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="ابحث برقم السند..."
            className="w-full rounded-lg border border-border bg-background px-9 py-2 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-emerald-600 text-white">
              <th className="px-4 py-3 text-right font-semibold">رقم السند</th>
              <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
              <th className="px-4 py-3 text-right font-semibold">الوصف</th>
              <th className="px-4 py-3 text-right font-semibold">القسم</th>
              <th className="px-4 py-3 text-right font-semibold">المبلغ</th>
              <th className="px-4 py-3 text-right font-semibold">الحالة</th>
              <th className="px-4 py-3 text-right font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                <td className="px-4 py-3 font-medium text-primary">{row.voucherNumber}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.voucherDate}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.description}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.department}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{row.totalAmount} ريال</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-600">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDelete(row.id)}
                      title="حذف"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PettyCashList({ rows, onDelete }: { rows: PettyCashRow[]; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="ابحث برقم السند..."
            className="w-full rounded-lg border border-border bg-background px-9 py-2 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-sky-600 text-white">
              <th className="px-4 py-3 text-right font-semibold">رقم السند</th>
              <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
              <th className="px-4 py-3 text-right font-semibold">المستفيد</th>
              <th className="px-4 py-3 text-right font-semibold">المبلغ</th>
              <th className="px-4 py-3 text-right font-semibold">الغرض</th>
              <th className="px-4 py-3 text-right font-semibold">الحالة</th>
              <th className="px-4 py-3 text-right font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                <td className="px-4 py-3 font-medium text-primary">{row.voucherNumber}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.voucherDate}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.beneficiaryName}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{row.amount} ريال</td>
                <td className="px-4 py-3 text-muted-foreground">{row.purpose}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDelete(row.id)}
                      title="حذف"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpenseReportsList() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="bg-emerald-600 px-4 py-3 text-sm font-semibold text-white rounded-lg mb-3">
            إجمالي سندات الصرف
          </div>
          <p className="text-2xl font-bold text-foreground">﷼ 0.00</p>
          <p className="text-xs text-muted-foreground mt-1">0 سند</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="bg-sky-600 px-4 py-3 text-sm font-semibold text-white rounded-lg mb-3">
            إجمالي سندات القيض
          </div>
          <p className="text-2xl font-bold text-foreground">﷼ 0.00</p>
          <p className="text-xs text-muted-foreground mt-1">0 سند</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="bg-rose-600 px-4 py-3 text-sm font-semibold text-white rounded-lg mb-3">
            إجمالي المصروفات
          </div>
          <p className="text-2xl font-bold text-foreground">﷼ 0.00</p>
          <p className="text-xs text-muted-foreground mt-1">من جميع السندات</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">تقرير تفصيلي</h3>
        <div className="text-sm text-muted-foreground">
          <p>لا توجد بيانات للعرض حالياً.</p>
        </div>
      </div>
    </div>
  );
}
