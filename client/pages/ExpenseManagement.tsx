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

type VoucherItemForm = {
  id?: string;
  description: string;
  accountCode: string;
  amount: string;
};

type VoucherForm = {
  id?: string;
  voucherNumber: string;
  voucherDate: string;
  description: string;
  department: string;
  approvedBy: string;
  items: VoucherItemForm[];
};

type VoucherViewData = VoucherRow & { items: VoucherItemForm[] };
type PettyCashViewData = PettyCashRow;

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

type AccountTreeRow = {
  code: string;
  name: string;
  parent: string;
  category: string;
  nature: string;
  postable: string;
  level: number;
  isMain?: boolean;
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

const getEmptyVoucherForm = (): VoucherForm => ({
  id: undefined,
  voucherNumber: "",
  voucherDate: new Date().toISOString().split("T")[0],
  description: "",
  department: "",
  approvedBy: "",
  items: [{ description: "", accountCode: "", amount: "" }],
});

const getEmptyPettyCashForm = (): PettyCashForm => ({
  id: undefined,
  voucherNumber: "",
  voucherDate: new Date().toISOString().split("T")[0],
  beneficiaryName: "",
  purpose: "",
  amount: "",
  paidBy: "",
  receivedBy: "",
});

const chartOfAccountsRows: AccountTreeRow[] = [
  { code: "1", name: "الأصول", parent: "-", category: "رئيسي", nature: "مدين", postable: "لا", level: 0, isMain: true },
  { code: "1.1", name: "الأصول المتداولة", parent: "الأصول", category: "تجميعي", nature: "مدين", postable: "لا", level: 1 },
  { code: "1.1.1", name: "الصندوق", parent: "الأصول المتداولة", category: "تفصيلي", nature: "مدين", postable: "نعم", level: 2 },
  { code: "1.1.2", name: "البنك", parent: "الأصول المتداولة", category: "تفصيلي", nature: "مدين", postable: "نعم", level: 2 },
  { code: "1.1.3", name: "العملاء", parent: "الأصول المتداولة", category: "تجميعي", nature: "مدين", postable: "لا", level: 2 },
  { code: "1.1.3.1", name: "عملاء محليون", parent: "العملاء", category: "تفصيلي", nature: "مدين", postable: "نعم", level: 3 },
  { code: "1.2", name: "الأصول الثابتة", parent: "الأصول", category: "تجميعي", nature: "مدين", postable: "لا", level: 1 },
  { code: "1.2.1", name: "المعدات", parent: "الأصول الثابتة", category: "تفصيلي", nature: "مدين", postable: "نعم", level: 2 },
  { code: "1.2.2", name: "الأثاث", parent: "الأصول الثابتة", category: "تفصيلي", nature: "مدين", postable: "نعم", level: 2 },

  { code: "2", name: "الالتزامات", parent: "-", category: "رئيسي", nature: "دائن", postable: "لا", level: 0, isMain: true },
  { code: "2.1", name: "الخصوم المتداولة", parent: "الالتزامات", category: "تجميعي", nature: "دائن", postable: "لا", level: 1 },
  { code: "2.1.1", name: "الموردون", parent: "الخصوم المتداولة", category: "تفصيلي", nature: "دائن", postable: "نعم", level: 2 },
  { code: "2.1.2", name: "ضريبة القيمة المضافة", parent: "الخصوم المتداولة", category: "تفصيلي", nature: "دائن", postable: "نعم", level: 2 },

  { code: "3", name: "حقوق الملكية", parent: "-", category: "رئيسي", nature: "دائن", postable: "لا", level: 0, isMain: true },
  { code: "3.1", name: "رأس المال", parent: "حقوق الملكية", category: "تفصيلي", nature: "دائن", postable: "نعم", level: 1 },
  { code: "3.2", name: "الأرباح المبقاة", parent: "حقوق الملكية", category: "تفصيلي", nature: "دائن", postable: "نعم", level: 1 },

  { code: "4", name: "الإيرادات", parent: "-", category: "رئيسي", nature: "دائن", postable: "لا", level: 0, isMain: true },
  { code: "4.1", name: "إيرادات المبيعات", parent: "الإيرادات", category: "تفصيلي", nature: "دائن", postable: "نعم", level: 1 },
  { code: "4.2", name: "إيرادات الخدمات", parent: "الإيرادات", category: "تفصيلي", nature: "دائن", postable: "نعم", level: 1 },

  { code: "5", name: "المصروفات", parent: "-", category: "رئيسي", nature: "مدين", postable: "لا", level: 0, isMain: true },
  { code: "5.1", name: "مصروفات التشغيل", parent: "المصروفات", category: "تجميعي", nature: "مدين", postable: "لا", level: 1 },
  { code: "5.1.1", name: "الرواتب والأجور", parent: "مصروفات التشغيل", category: "تفصيلي", nature: "مدين", postable: "نعم", level: 2 },
  { code: "5.1.2", name: "الإيجارات", parent: "مصروفات التشغيل", category: "تفصيلي", nature: "مدين", postable: "نعم", level: 2 },
  { code: "5.1.3", name: "الكهرباء والمياه", parent: "مصروفات التشغيل", category: "تفصيلي", nature: "مدين", postable: "نعم", level: 2 },
  { code: "5.1.4", name: "الاتصالات والإنترنت", parent: "مصروفات التشغيل", category: "تفصيلي", nature: "مدين", postable: "نعم", level: 2 },
  { code: "5.2", name: "مصروفات إدارية", parent: "المصروفات", category: "تجميعي", nature: "مدين", postable: "لا", level: 1 },
  { code: "5.2.1", name: "مستلزمات مكتبية", parent: "مصروفات إدارية", category: "تفصيلي", nature: "مدين", postable: "نعم", level: 2 },
  { code: "5.2.2", name: "رسوم حكومية", parent: "مصروفات إدارية", category: "تفصيلي", nature: "مدين", postable: "نعم", level: 2 },
];

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
  const [voucherView, setVoucherView] = useState<VoucherViewData | null>(null);
  const [pettyCashView, setPettyCashView] = useState<PettyCashViewData | null>(null);
  const [voucherForm, setVoucherForm] = useState<VoucherForm>(getEmptyVoucherForm());
  const [pettyCashForm, setPettyCashForm] = useState<PettyCashForm>(getEmptyPettyCashForm());

  useEffect(() => {
    if (isReports) {
      void Promise.allSettled([loadVouchers(), loadPettyCash()]);
      return;
    }

    if (isVouchers) {
      void loadVouchers();
    }

    if (isPettyCash) {
      void loadPettyCash();
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

  const loadVoucherItems = async (voucherId: string): Promise<VoucherItemForm[]> => {
    const { data, error } = await supabase
      .from("expense_voucher_items")
      .select("id, item_description, account_code, amount")
      .eq("voucher_id", voucherId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((item) => ({
      id: String(item.id ?? ""),
      description: String(item.item_description ?? ""),
      accountCode: String(item.account_code ?? ""),
      amount: String(item.amount ?? "0"),
    }));
  };

  const handleViewVoucher = async (row: VoucherRow) => {
    const items = await loadVoucherItems(row.id);
    setVoucherView({ ...row, items });
  };

  const handleEditVoucher = async (row: VoucherRow) => {
    const items = await loadVoucherItems(row.id);
    setVoucherForm({
      id: row.id,
      voucherNumber: row.voucherNumber,
      voucherDate: row.voucherDate,
      description: row.description,
      department: row.department,
      approvedBy: row.approvedBy,
      items: items.length > 0 ? items : [{ description: "", accountCode: "", amount: "" }],
    });
    setVoucherView(null);
    setIsFormOpen(true);
  };

  const generateVoucherNumber = async (
    tableName: "expense_vouchers" | "petty_cash_vouchers",
    prefix: "SRF" | "QBD"
  ) => {
    const { data } = await supabase
      .from(tableName)
      .select("voucher_number")
      .like("voucher_number", `${prefix}-%`)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastVoucherNumber = String(data?.[0]?.voucher_number ?? "");
    const lastNumber = Number(lastVoucherNumber.split("-")[1] ?? "0");
    const nextNumber = String(lastNumber + 1).padStart(4, "0");
    return `${prefix}-${nextNumber}`;
  };

  const handleViewPettyCash = (row: PettyCashRow) => {
    setPettyCashView(row);
  };

  const handleEditPettyCash = (row: PettyCashRow) => {
    setPettyCashForm({
      id: row.id,
      voucherNumber: row.voucherNumber,
      voucherDate: row.voucherDate,
      beneficiaryName: row.beneficiaryName,
      purpose: row.purpose,
      amount: row.amount,
      paidBy: row.paidBy,
      receivedBy: row.receivedBy,
    });
    setPettyCashView(null);
    setIsFormOpen(true);
  };

  const title = isReports
    ? "تقرير المصروفات"
    : isPettyCash
      ? "سندات القبض"
      : isVouchers
        ? "سندات الصرف"
        : "المصرفات";

  const description = isReports
    ? "ملخصات وتقارير المصروفات والسندات."
    : isPettyCash
      ? "إدارة سندات القبض وتتبع النقد الصغير."
      : isVouchers
        ? "إنشاء وإدارة سندات الصرف والمصروفات."
        : "إدارة المصرفات والسندات والتقارير.";

  if (!isVouchers && !isPettyCash && !isReports) {
    return (
      <Layout
        subMenu={{
          title: "المحاسبة والمالية",
          items: [
            { label: "شجرة الحسابات", href: "/expenses" },
          ],
        }}
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">المحاسبة والمالية</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              إدارة الحسابات المالية عبر شجرة الحسابات.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-lg font-semibold text-foreground text-right">شجرة الحسابات</h3>
            <p className="mt-1 text-sm text-muted-foreground text-right">هيكل الحسابات المحاسبي كما في دليل الحسابات.</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 border border-slate-200 text-right">كود الحساب</th>
                    <th className="px-3 py-2 border border-slate-200 text-right">اسم الحساب</th>
                    <th className="px-3 py-2 border border-slate-200 text-right">الحساب الأب</th>
                    <th className="px-3 py-2 border border-slate-200 text-right">تصنيف الحساب</th>
                    <th className="px-3 py-2 border border-slate-200 text-right">طبيعة الحساب</th>
                    <th className="px-3 py-2 border border-slate-200 text-right">يقبل الترحيل</th>
                    <th className="px-3 py-2 border border-slate-200 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {chartOfAccountsRows.map((row) => (
                    <tr key={row.code} className={row.isMain ? "bg-slate-50 font-semibold" : "bg-white"}>
                      <td className="px-3 py-2 border border-slate-200">{row.code}</td>
                      <td className="px-3 py-2 border border-slate-200 text-right" style={{ paddingRight: `${row.level * 16 + 12}px` }}>
                        {row.name}
                      </td>
                      <td className="px-3 py-2 border border-slate-200 text-right">{row.parent}</td>
                      <td className="px-3 py-2 border border-slate-200 text-right">{row.category}</td>
                      <td className="px-3 py-2 border border-slate-200 text-right">{row.nature}</td>
                      <td className="px-3 py-2 border border-slate-200 text-right">{row.postable}</td>
                      <td className="px-3 py-2 border border-slate-200 text-right">نشط</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      subMenu={{
        title: "المحاسبة والمالية",
        items: [
          { label: "شجرة الحسابات", href: "/expenses" },
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
              onClick={async () => {
                if (isVouchers) {
                  const voucherNumber = await generateVoucherNumber("expense_vouchers", "SRF");
                  setVoucherForm({ ...getEmptyVoucherForm(), voucherNumber });
                }
                if (isPettyCash) {
                  const voucherNumber = await generateVoucherNumber("petty_cash_vouchers", "QBD");
                  setPettyCashForm({ ...getEmptyPettyCashForm(), voucherNumber });
                }
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90"
            >
              <Plus className="h-4 w-4" />
              {isVouchers ? "إنشاء سند صرف جديد" : "إنشاء سند قبض من عميل"}
            </button>
          )}
        </div>

        {!isReports && isFormOpen && isVouchers ? (
          <VoucherForm
            form={voucherForm}
            setForm={setVoucherForm}
            onSave={async () => {
              setSaving(true);

              const voucherId = voucherForm.id ?? crypto.randomUUID();
              const cleanedItems = voucherForm.items.filter(
                (item) => item.description.trim() || item.accountCode.trim() || item.amount
              );

              const voucherNumber = voucherForm.id
                ? voucherForm.voucherNumber
                : voucherForm.voucherNumber || (await generateVoucherNumber("expense_vouchers", "SRF"));

              const payload = {
                id: voucherId,
                voucher_number: voucherNumber,
                voucher_date: voucherForm.voucherDate,
                description: voucherForm.description,
                department: voucherForm.department,
                approved_by: voucherForm.approvedBy,
                total_amount: cleanedItems.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0),
                status: "مسودة",
              };

              const result = voucherForm.id
                ? await supabase.from("expense_vouchers").update(payload).eq("id", voucherForm.id)
                : await supabase.from("expense_vouchers").insert([payload]);

              if (!result.error) {
                await supabase.from("expense_voucher_items").delete().eq("voucher_id", voucherId);

                if (cleanedItems.length > 0) {
                  await supabase.from("expense_voucher_items").insert(
                    cleanedItems.map((item) => ({
                      voucher_id: voucherId,
                      item_description: item.description,
                      account_code: item.accountCode,
                      amount: item.amount || "0",
                    }))
                  );
                }

                await loadVouchers();
                setIsFormOpen(false);
                setVoucherForm(getEmptyVoucherForm());
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
              const voucherId = pettyCashForm.id ?? crypto.randomUUID();
              const voucherNumber = pettyCashForm.id
                ? pettyCashForm.voucherNumber
                : pettyCashForm.voucherNumber || (await generateVoucherNumber("petty_cash_vouchers", "QBD"));

              const payload = {
                id: voucherId,
                voucher_number: voucherNumber,
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
                setPettyCashForm(getEmptyPettyCashForm());
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
          <VouchersList
            rows={voucherRows}
            onView={handleViewVoucher}
            onEdit={handleEditVoucher}
            onDelete={async (id) => {
              if (!confirm("هل متأكد من حذف السند؟")) return;
              setDeleting(true);
              await supabase.from("expense_voucher_items").delete().eq("voucher_id", id);
              const result = await supabase.from("expense_vouchers").delete().eq("id", id);
              if (!result.error) {
                await loadVouchers();
                toast({ title: "تم الحذف", description: "تم حذف السند بنجاح" });
              } else {
                toast({ title: "فشل الحذف", variant: "destructive" });
              }
              setDeleting(false);
            }}
          />
        )}

        {isPettyCash && !isFormOpen && (
          <PettyCashList
            rows={pettyCashRows}
            onView={handleViewPettyCash}
            onEdit={handleEditPettyCash}
            onDelete={async (id) => {
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
            }}
          />
        )}

        {isReports && <ExpenseReportsList voucherRows={voucherRows} pettyCashRows={pettyCashRows} />}

        {voucherView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">تفاصيل سند الصرف</h3>
                <button
                  onClick={() => setVoucherView(null)}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">رقم السند</p>
                  <p className="font-medium text-foreground">{voucherView.voucherNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">التاريخ</p>
                  <p className="font-medium text-foreground">{voucherView.voucherDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">القسم</p>
                  <p className="font-medium text-foreground">{voucherView.department || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الموافق</p>
                  <p className="font-medium text-foreground">{voucherView.approvedBy || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">الوصف</p>
                <p className="font-medium text-foreground">{voucherView.description || "—"}</p>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-right font-semibold">البند</th>
                      <th className="px-3 py-2 text-right font-semibold">الحساب</th>
                      <th className="px-3 py-2 text-right font-semibold">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucherView.items.length > 0 ? (
                      voucherView.items.map((item, index) => (
                        <tr key={item.id ?? index} className="border-t border-border">
                          <td className="px-3 py-2">{item.description || "—"}</td>
                          <td className="px-3 py-2">{item.accountCode || "—"}</td>
                          <td className="px-3 py-2">{item.amount || "0"} ريال</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-border">
                        <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                          لا توجد بنود لهذا السند
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-semibold text-foreground">الإجمالي: {voucherView.totalAmount} ريال</p>
                <button
                  onClick={() => void handleEditVoucher(voucherView)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  <Pencil className="h-4 w-4" />
                  تعديل السند
                </button>
              </div>
            </div>
          </div>
        )}

        {pettyCashView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">تفاصيل سند القبض</h3>
                <button
                  onClick={() => setPettyCashView(null)}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">رقم السند</p>
                  <p className="font-medium text-foreground">{pettyCashView.voucherNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">التاريخ</p>
                  <p className="font-medium text-foreground">{pettyCashView.voucherDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المستفيد</p>
                  <p className="font-medium text-foreground">{pettyCashView.beneficiaryName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المبلغ</p>
                  <p className="font-medium text-foreground">{pettyCashView.amount || "0"} ريال</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">صرفه</p>
                  <p className="font-medium text-foreground">{pettyCashView.paidBy || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">استلمه</p>
                  <p className="font-medium text-foreground">{pettyCashView.receivedBy || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">الغرض</p>
                <p className="font-medium text-foreground">{pettyCashView.purpose || "—"}</p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => handleEditPettyCash(pettyCashView)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  <Pencil className="h-4 w-4" />
                  تعديل السند
                </button>
              </div>
            </div>
          </div>
        )}
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
      <h3 className="text-lg font-semibold text-foreground">
        {form.id ? "تعديل سند الصرف" : "إنشاء سند صرف جديد"}
      </h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground">رقم السند</label>
          <input
            value={form.voucherNumber}
            readOnly
            className="mt-1 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            placeholder="يتولد تلقائياً"
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
  const amountValue = Number.parseFloat(form.amount || "0") || 0;

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-6 space-y-6">
      <h3 className="text-2xl font-semibold text-foreground text-right">
        {form.id ? "تعديل سند قبض من عميل" : "سند قبض من عميل"}
      </h3>

      <section className="space-y-4">
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-2">
          <h4 className="text-sm font-semibold text-foreground">معلومات أساسية</h4>
          <span className="text-xs text-muted-foreground">مطلوب</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">العميل</label>
            <input
              value={form.beneficiaryName}
              onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="مطلوب"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">تم الدفع من خلال</label>
            <input
              value={form.paidBy}
              onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="مطلوب"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">عملة الدفع</label>
            <input
              value={form.receivedBy}
              onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="مطلوب"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">المبلغ المستلم</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="مطلوب"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">التاريخ</label>
            <input
              type="date"
              value={form.voucherDate}
              onChange={(e) => setForm({ ...form, voucherDate: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">الوصف</label>
            <input
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
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
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground"
            >
              دفعة مقدمة
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-foreground"
            >
              دفعة فواتير
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">إضافة لرصيد العميل</span>
          <span className="font-medium">{amountValue.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">المبلغ المدفوع</span>
          <span className="font-medium">{amountValue.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-semibold">المتبقي</span>
          <span className="font-semibold">0.00</span>
        </div>
      </section>

      <div className="flex items-center gap-2 pt-2">
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

        <input
          value={form.voucherNumber}
          readOnly
          className="mr-auto w-36 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
          placeholder="رقم السند"
        />
      </div>
    </div>
  );
}

function VouchersList({
  rows,
  onView,
  onEdit,
  onDelete,
}: {
  rows: VoucherRow[];
  onView: (row: VoucherRow) => void;
  onEdit: (row: VoucherRow) => void;
  onDelete: (id: string) => void;
}) {
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
                      onClick={() => onView(row)}
                      title="عرض"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(row)}
                      title="تعديل"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
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

function PettyCashList({
  rows,
  onView,
  onEdit,
  onDelete,
}: {
  rows: PettyCashRow[];
  onView: (row: PettyCashRow) => void;
  onEdit: (row: PettyCashRow) => void;
  onDelete: (id: string) => void;
}) {
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
                      onClick={() => onView(row)}
                      title="عرض"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(row)}
                      title="تعديل"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
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

function ExpenseReportsList({
  voucherRows,
  pettyCashRows,
}: {
  voucherRows: VoucherRow[];
  pettyCashRows: PettyCashRow[];
}) {
  const formatMoney = (value: number) =>
    new Intl.NumberFormat("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const vouchersTotal = voucherRows.reduce(
    (sum, row) => sum + Number.parseFloat(row.totalAmount || "0"),
    0
  );

  const pettyCashTotal = pettyCashRows.reduce(
    (sum, row) => sum + Number.parseFloat(row.amount || "0"),
    0
  );

  const overallTotal = vouchersTotal + pettyCashTotal;

  const transactions = [
    ...voucherRows.map((row) => ({
      id: row.id,
      number: row.voucherNumber,
      date: row.voucherDate,
      type: "سند صرف",
      description: row.description || row.department || "—",
      amount: Number.parseFloat(row.totalAmount || "0"),
      status: row.status,
    })),
    ...pettyCashRows.map((row) => ({
      id: row.id,
      number: row.voucherNumber,
      date: row.voucherDate,
      type: "سند قبض",
      description: row.purpose || row.beneficiaryName || "—",
      amount: Number.parseFloat(row.amount || "0"),
      status: row.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="bg-emerald-600 px-4 py-3 text-sm font-semibold text-white rounded-lg mb-3">
            إجمالي سندات الصرف
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMoney(vouchersTotal)} ريال</p>
          <p className="text-xs text-muted-foreground mt-1">{voucherRows.length} سند</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="bg-sky-600 px-4 py-3 text-sm font-semibold text-white rounded-lg mb-3">
            إجمالي سندات القبض
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMoney(pettyCashTotal)} ريال</p>
          <p className="text-xs text-muted-foreground mt-1">{pettyCashRows.length} سند</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="bg-rose-600 px-4 py-3 text-sm font-semibold text-white rounded-lg mb-3">
            إجمالي المصروفات
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMoney(overallTotal)} ريال</p>
          <p className="text-xs text-muted-foreground mt-1">من جميع السندات</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">تقرير تفصيلي</h3>

        {transactions.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            <p>لا توجد بيانات للعرض حالياً.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm text-right">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 font-semibold">رقم السند</th>
                  <th className="px-4 py-3 font-semibold">النوع</th>
                  <th className="px-4 py-3 font-semibold">التاريخ</th>
                  <th className="px-4 py-3 font-semibold">الوصف</th>
                  <th className="px-4 py-3 font-semibold">المبلغ</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-primary">{row.number}</td>
                    <td className="px-4 py-3">{row.type}</td>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3">{row.description}</td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(row.amount)} ريال</td>
                    <td className="px-4 py-3">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
