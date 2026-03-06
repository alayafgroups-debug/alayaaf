import PlaceholderModule from "@/components/PlaceholderModule";
import Layout from "@/components/Layout";
import { Plus, Search, Filter, Eye, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";

const customers = [
  {
    id: "CUST-0005",
    name: "ahmed",
    type: "شركة",
    email: "ahmed@demo.com",
    phone: "0556656562",
    openingBalance: "0.00",
    creditLimit: "100,000.00",
    status: "نشط",
  },
  {
    id: "CUST-0004",
    name: "great",
    type: "شركة",
    email: "great@demo.com",
    phone: "0555544",
    openingBalance: "0.00",
    creditLimit: "100,000.00",
    status: "نشط",
  },
  {
    id: "CUST-0003",
    name: "mood",
    type: "فرد",
    email: "mood@demo.com",
    phone: "0588888",
    openingBalance: "0.00",
    creditLimit: "100,000.00",
    status: "نشط",
  },
  {
    id: "CUST-0002",
    name: "sori",
    type: "شركة",
    email: "sori@demo.com",
    phone: "052645555",
    openingBalance: "0.00",
    creditLimit: "100,000.00",
    status: "نشط",
  },
  {
    id: "CUST-0001",
    name: "tyan",
    type: "شركة",
    email: "tyan@demo.com",
    phone: "0556656562",
    openingBalance: "0.00",
    creditLimit: "100,000.00",
    status: "نشط",
  },
];

const vendors = [
  {
    id: "VEND-0005",
    name: "B28",
    type: "شركة",
    email: "vendor@demo.com",
    phone: "0556656562",
    openingBalance: "0.00",
    creditLimit: "100,000.00",
    status: "نشط",
  },
  {
    id: "VEND-0004",
    name: "Gra",
    type: "شركة",
    email: "gra@demo.com",
    phone: "0555544",
    openingBalance: "0.00",
    creditLimit: "100,000.00",
    status: "نشط",
  },
  {
    id: "VEND-0003",
    name: "odo",
    type: "فرد",
    email: "odo@demo.com",
    phone: "0588888",
    openingBalance: "0.00",
    creditLimit: "100,000.00",
    status: "نشط",
  },
  {
    id: "VEND-0002",
    name: "smi",
    type: "شركة",
    email: "smi@demo.com",
    phone: "052645555",
    openingBalance: "0.00",
    creditLimit: "100,000.00",
    status: "نشط",
  },
  {
    id: "VEND-0001",
    name: "tyan",
    type: "شركة",
    email: "tyan@demo.com",
    phone: "0556656562",
    openingBalance: "0.00",
    creditLimit: "100,000.00",
    status: "نشط",
  },
];

export default function CRM() {
  const location = useLocation();
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
  const tableData = isVendors ? vendors : customers;
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
          <div className="erp-card">
            <h3 className="text-lg font-semibold text-foreground">تقارير مخصصة</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              يمكنك إنشاء تقارير تفصيلية حول أرصدة العملاء والموردين،
              وأداء الحسابات، والمستحقات المفتوحة.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">
                  تقرير أرصدة العملاء
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  يعرض الأرصدة الحالية والفواتير غير المسددة.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">
                  تقرير أرصدة الموردين
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  ملخص للمستحقات وفترات الاستحقاق للموردين.
                </p>
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
