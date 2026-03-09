import PlaceholderModule from "@/components/PlaceholderModule";
import Layout from "@/components/Layout";
import { Plus, Search, Filter, Eye, Pencil, Trash2, Save, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type PartyRow = {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  openingBalance: string;
  creditLimit: string;
  status: string;
};

type PartyForm = {
  id?: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  openingBalance: string;
  creditLimit: string;
  status: string;
};

type ViewModalData = PartyRow | null;

const customers: PartyRow[] = [];
const vendors: PartyRow[] = [];

const mapPartyRow = (row: Record<string, unknown>): PartyRow => ({
  id: String(row.id ?? ""),
  name: String(row.name ?? ""),
  type: String(row.type ?? ""),
  email: String(row.email ?? ""),
  phone: String(row.phone ?? ""),
  openingBalance: String(row.opening_balance ?? row.openingBalance ?? "0.00"),
  creditLimit: String(row.credit_limit ?? row.creditLimit ?? "0.00"),
  status: String(row.status ?? "نشط"),
});

const emptyForm = (isVendor: boolean): PartyForm => ({
  id: undefined,
  name: "",
  type: isVendor ? "مورد محلي" : "شركة",
  email: "",
  phone: "",
  openingBalance: "0",
  creditLimit: "0",
  status: "نشط",
});

export default function CRM() {
  const location = useLocation();
  const isVendors = location.pathname.includes("/crm/vendors");
  const isReports = location.pathname.includes("/crm/reports");

  const [customerRows, setCustomerRows] = useState<PartyRow[]>(customers);
  const [vendorRows, setVendorRows] = useState<PartyRow[]>(vendors);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<PartyForm>(emptyForm(false));
  const [viewModal, setViewModal] = useState<ViewModalData>(null);

  useEffect(() => {
    const loadTable = async (
      tableName: "customers" | "vendors",
      setter: (rows: PartyRow[]) => void
    ) => {
      const result = await supabase
        .from(tableName)
        .select("*")
        .order("id", { ascending: false })
        .then((res) => ({ ...res, failed: false as const }))
        .catch(() => ({ data: null, error: new Error("fetch_failed"), failed: true as const }));

      if (!result.error && result.data) {
        setter(result.data.map((row) => mapPartyRow(row as Record<string, unknown>)));
      } else {
        setter([]);
      }
    };

    void Promise.allSettled([
      loadTable("customers", setCustomerRows),
      loadTable("vendors", setVendorRows),
    ]);
  }, []);

  useEffect(() => {
    if (!isReports) {
      setForm(emptyForm(isVendors));
      setIsFormOpen(false);
    }
  }, [isVendors, isReports]);

  const title = isReports
    ? "التقارير"
    : isVendors
      ? "الموردين"
      : "العملاء";
  const description = isReports
    ? "ملخصات وتقارير العملاء والموردين في مكان واحد."
    : isVendors
      ? "إدارة بيانات الموردين ومتابعة الحالة المالية."
      : "إدارة قاعدة بيانات العملاء ومتابعة الحالة المالية.";
  const actionLabel = isReports
    ? "توليد تقرير جديد"
    : isVendors
      ? "إضافة مورد جديد"
      : "إضافة عميل جديد";
  const tableData = isVendors ? vendorRows : customerRows;
  const idLabel = isVendors ? "رقم المورد" : "رقم العميل";
  const typeLabel = isVendors ? "نوع المورد" : "نوع العميل";
  const searchPlaceholder = isVendors
    ? "ابحث بالاسم أو رقم المورد"
    : "ابحث بالاسم أو رقم العميل";

  const typeOptions = isVendors
    ? ["مورد محلي", "مورد دولي", "مورد خدمات"]
    : ["شركة", "فرد", "جهة حكومية"];

  const openCreateForm = () => {
    if (isReports) return;
    setForm(emptyForm(isVendors));
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "تنبيه", description: "أدخل الاسم", variant: "destructive" });
      return;
    }

    if (!form.phone.trim()) {
      toast({ title: "تنبيه", description: "أدخل رقم الهاتف", variant: "destructive" });
      return;
    }

    const tableName = isVendors ? "vendors" : "customers";
    setSaving(true);

    if (form.id) {
      // Update existing
      const payload = {
        name: form.name.trim(),
        type: form.type,
        email: form.email.trim(),
        phone: form.phone.trim(),
        opening_balance: form.openingBalance || "0",
        credit_limit: form.creditLimit || "0",
        status: form.status,
      };

      const result = await supabase
        .from(tableName)
        .update(payload)
        .eq("id", form.id)
        .then((res) => ({ ...res, failed: false as const }))
        .catch(() => ({ error: new Error("fetch_failed"), failed: true as const }));

      if (!result.error) {
        const updatedRow = mapPartyRow({ id: form.id, ...payload } as Record<string, unknown>);
        if (isVendors) {
          setVendorRows((prev) =>
            prev.map((row) => (row.id === form.id ? updatedRow : row))
          );
        } else {
          setCustomerRows((prev) =>
            prev.map((row) => (row.id === form.id ? updatedRow : row))
          );
        }

        setIsFormOpen(false);
        toast({ title: "تم التحديث", description: isVendors ? "تم تحديث بيانات المورد" : "تم تحديث بيانات العميل" });
      } else {
        toast({
          title: "فشل التحديث",
          description: result.failed
            ? "تعذر الاتصال بقاعدة البيانات"
            : "تعذر تحديث البيانات",
          variant: "destructive",
        });
      }
    } else {
      // Create new
      const payload = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        type: form.type,
        email: form.email.trim(),
        phone: form.phone.trim(),
        opening_balance: form.openingBalance || "0",
        credit_limit: form.creditLimit || "0",
        status: form.status,
      };

      const result = await supabase
        .from(tableName)
        .insert([payload])
        .then((res) => ({ ...res, failed: false as const }))
        .catch(() => ({ error: new Error("fetch_failed"), failed: true as const }));

      if (!result.error) {
        const newRow = mapPartyRow(payload as unknown as Record<string, unknown>);
        if (isVendors) {
          setVendorRows((prev) => [newRow, ...prev]);
        } else {
          setCustomerRows((prev) => [newRow, ...prev]);
        }

        setIsFormOpen(false);
        toast({ title: "تم الحفظ", description: isVendors ? "تمت إضافة المورد" : "تمت إضافة العميل" });
      } else {
        toast({
          title: "فشل الحفظ",
          description: result.failed
            ? "تعذر الاتصال بقاعدة البيانات، تحقق من الاتصال"
            : "تعذر حفظ البيانات",
          variant: "destructive",
        });
      }
    }

    setSaving(false);
  };

  const handleView = (row: PartyRow) => {
    setViewModal(row);
  };

  const handleEdit = (row: PartyRow) => {
    setForm({
      id: row.id,
      name: row.name,
      type: row.type,
      email: row.email,
      phone: row.phone,
      openingBalance: row.openingBalance,
      creditLimit: row.creditLimit,
      status: row.status,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isVendors ? "هل متأكد من حذف المورد؟" : "هل متأكد من حذف العميل؟")) {
      return;
    }

    const tableName = isVendors ? "vendors" : "customers";
    setDeleting(true);

    const result = await supabase
      .from(tableName)
      .delete()
      .eq("id", id)
      .then((res) => ({ ...res, failed: false as const }))
      .catch(() => ({ error: new Error("fetch_failed"), failed: true as const }));

    if (!result.error) {
      if (isVendors) {
        setVendorRows((prev) => prev.filter((row) => row.id !== id));
      } else {
        setCustomerRows((prev) => prev.filter((row) => row.id !== id));
      }
      toast({ title: "تم الحذف", description: isVendors ? "تم حذف المورد" : "تم حذف العميل" });
    } else {
      toast({
        title: "فشل الحذف",
        description: result.failed
          ? "تعذر الاتصال بقاعدة البيانات"
          : "تعذر حذف البيانات",
        variant: "destructive",
      });
    }

    setDeleting(false);
  };

  return (
    <Layout
      subMenu={{
        title: "العملاء والموردين",
        items: [
          { label: "العملاء", href: "/crm/customers" },
          { label: "الموردين", href: "/crm/vendors" },
          { label: "التقارير", href: "/crm/reports" },
        ],
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            onClick={openCreateForm}
            disabled={isReports}
            className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            {actionLabel}
          </button>
        </div>

        {!isReports && isFormOpen ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
            <h3 className="text-2xl font-semibold text-slate-900 text-right">
              {form.id
                ? isVendors
                  ? "تعديل بيانات المورد"
                  : "تعديل بيانات العميل"
                : isVendors
                  ? "إضافة مورد جديد"
                  : "إضافة عميل جديد"}
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700 text-right block">اسم المنشأة *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-right placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                  placeholder={isVendors ? "اسم المورد" : "اسم العميل"}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 text-right block">{typeLabel}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="mt-1 w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-right placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                >
                  {typeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 text-right block">البريد الإلكتروني</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-right placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 text-right block">الهاتف</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-right placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                  placeholder="05xxxxxxxx"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 text-right block">الرصيد الافتتاحي</label>
                <input
                  type="number"
                  value={form.openingBalance}
                  onChange={(e) => setForm((prev) => ({ ...prev, openingBalance: e.target.value }))}
                  className="mt-1 w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-right placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 text-right block">حد الائتمان</label>
                <input
                  type="number"
                  value={form.creditLimit}
                  onChange={(e) => setForm((prev) => ({ ...prev, creditLimit: e.target.value }))}
                  className="mt-1 w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-right placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 text-right block">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="mt-1 w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-right placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                >
                  <option>نشط</option>
                  <option>غير نشط</option>
                  <option>موقوف</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>

              <button
                onClick={() => setIsFormOpen(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                <X className="h-4 w-4" />
                إلغاء
              </button>
            </div>
          </div>
        ) : null}

        {isReports ? (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between bg-rose-600 px-4 py-3 text-sm font-semibold text-white">
                  <span>التدقيق والمتابعة</span>
                  <span className="text-xs">تحكم</span>
                </div>
                <div className="space-y-3 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    إعدادات نُظم الضريبة
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    فواتير المبيعات المستحقة
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    تقارير أعمار المديونية
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    مؤشرات الأداء (KPIs)
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">
                  <span>تقارير الموردين (AP)</span>
                  <span className="text-xs">قيد التطوير</span>
                </div>
                <div className="space-y-3 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    تقرير أعمار الموردين
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    تقرير أرصدة الموردين (AP Aging)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    تقييمات المستحقات المتأخرة
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between bg-sky-600 px-4 py-3 text-sm font-semibold text-white">
                  <span>تقارير العملاء (AR)</span>
                  <span className="text-xs">نشطة</span>
                </div>
                <div className="space-y-3 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    تقرير أعمار العملاء
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    تقرير أرصدة العملاء (AR Aging)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    حالات التحصيل
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    تنبيهات التأخر في الدفع
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="bg-slate-700 px-4 py-3 text-sm font-semibold text-white">
                ملخصات عامة للتقارير
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">إجمالي المديونية</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">﷼ 120,000</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">المدفوعات الأخيرة</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">﷼ 48,000</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">المستحقات المتأخرة</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">﷼ 18,500</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">تنبيهات المتابعة</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">5 تنبيهات</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="erp-card">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-border bg-background px-9 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>{typeLabel}</option>
                  {typeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>المدينة</option>
                  <option>الرياض</option>
                  <option>جدة</option>
                  <option>الدمام</option>
                </select>
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>الحالة</option>
                  <option>نشط</option>
                  <option>غير نشط</option>
                </select>
                <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                  <Filter className="h-4 w-4" />
                  تصفية متقدمة
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-4 py-3 text-right font-semibold">{idLabel}</th>
                    <th className="px-4 py-3 text-right font-semibold">الاسم</th>
                    <th className="px-4 py-3 text-right font-semibold">{typeLabel}</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      البريد الإلكتروني
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">الهاتف</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      الرصيد الافتتاحي
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      حد الائتمان
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                    <th className="px-4 py-3 text-right font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-border hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-medium text-primary">
                        {customer.id}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {customer.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.phone}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.openingBalance} ريال
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.creditLimit} ريال
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(customer)}
                            title="عرض التفاصيل"
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            title="تعديل"
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            disabled={deleting}
                            title="حذف"
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive transition disabled:opacity-50"
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
        )}

        {viewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="rounded-xl border border-border bg-card p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-foreground">
                {isVendors ? "تفاصيل المورد" : "تفاصيل العميل"}
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">الرقم</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.id}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">الاسم</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.name}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{typeLabel}</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.type}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.email || "—"}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">الهاتف</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.phone}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">الرصيد الافتتاحي</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.openingBalance} ريال</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">حد الائتمان</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.creditLimit} ريال</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">الحالة</p>
                  <p className="text-sm">
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                      {viewModal.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    handleEdit(viewModal);
                    setViewModal(null);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                >
                  <Pencil className="h-4 w-4" />
                  تعديل
                </button>

                <button
                  onClick={() => setViewModal(null)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
                >
                  <X className="h-4 w-4" />
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
