import PlaceholderModule from "@/components/PlaceholderModule";
import Layout from "@/components/Layout";
import { Plus, Search, Filter, Eye, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

const customers: PartyRow[] = [];

const vendors: PartyRow[] = [];

export default function CRM() {
  const location = useLocation();
  const [customerRows, setCustomerRows] = useState<PartyRow[]>(customers);
  const [vendorRows, setVendorRows] = useState<PartyRow[]>(vendors);

  useEffect(() => {
    const loadCustomers = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("id", { ascending: false });

      if (!error && data) {
        setCustomerRows(
          data.map((row) => ({
            id: row.id ?? "",
            name: row.name ?? "",
            type: row.type ?? "",
            email: row.email ?? "",
            phone: row.phone ?? "",
            openingBalance: row.opening_balance ?? row.openingBalance ?? "0.00",
            creditLimit: row.credit_limit ?? row.creditLimit ?? "0.00",
            status: row.status ?? "",
          }))
        );
      }
    };

    const loadVendors = async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("id", { ascending: false });

      if (!error && data) {
        setVendorRows(
          data.map((row) => ({
            id: row.id ?? "",
            name: row.name ?? "",
            type: row.type ?? "",
            email: row.email ?? "",
            phone: row.phone ?? "",
            openingBalance: row.opening_balance ?? row.openingBalance ?? "0.00",
            creditLimit: row.credit_limit ?? row.creditLimit ?? "0.00",
            status: row.status ?? "",
          }))
        );
      }
    };

    loadCustomers();
    loadVendors();
  }, []);
  const isVendors = location.pathname.includes("/crm/vendors");
  const isReports = location.pathname.includes("/crm/reports");
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
          <button className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90">
            <Plus className="h-4 w-4" />
            {actionLabel}
          </button>
        </div>

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
                  <option>شركة</option>
                  <option>فرد</option>
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
                          <button className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive">
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
      </div>
    </Layout>
  );
}
