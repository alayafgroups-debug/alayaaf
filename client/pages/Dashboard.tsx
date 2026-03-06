import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Users,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

export default function Dashboard() {
  const kpis = [
    {
      label: "إجمالي المبيعات",
      value: "1,250,000",
      currency: true,
      change: 12,
      trend: "up",
    },
    {
      label: "إجمالي المشتريات",
      value: "750,000",
      currency: true,
      change: 8,
      trend: "up",
    },
    {
      label: "عدد الفواتير",
      value: "342",
      currency: false,
      change: 5,
      trend: "up",
    },
    {
      label: "العملاء النشطين",
      value: "145",
      currency: false,
      change: 3,
      trend: "down",
    },
  ];

  const recentInvoices = [
    {
      id: "INV-001",
      customer: "شركة الزهراء للتجارة",
      amount: 45000,
      status: "مقبولة",
      date: "2024-01-15",
    },
    {
      id: "INV-002",
      customer: "مؤسسة النور",
      amount: 32500,
      status: "قيد المعالجة",
      date: "2024-01-14",
    },
    {
      id: "INV-003",
      customer: "شركة الإمارات للتوزيع",
      amount: 67000,
      status: "مقبولة",
      date: "2024-01-13",
    },
    {
      id: "INV-004",
      customer: "مصنع النجاح",
      amount: 28000,
      status: "مرفوضة",
      date: "2024-01-12",
    },
  ];

  const modules = [
    {
      title: "المبيعات",
      description: "إدارة عروض الأسعار والفواتير والمردودات",
      href: "/sales",
      icon: FileText,
      color: "primary",
    },
    {
      title: "المشتريات",
      description: "طلبات الشراء والفواتير والتقارير",
      href: "/purchases",
      icon: Users,
      color: "accent",
    },
    {
      title: "الموارد البشرية",
      description: "إدارة الموظفين والرواتب والحضور",
      href: "/hr",
      icon: Users,
      color: "success",
    },
    {
      title: "إدارة العملاء",
      description: "قاعدة بيانات العملاء والتفاعلات",
      href: "/crm",
      icon: Users,
      color: "warning",
    },
  ];

  return (
    <Layout subMenu={null}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">
          أهلاً وسهلاً بك
        </h1>
        <p className="mt-2 text-muted-foreground">
          إليك ملخص أداء عملك اليوم
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const TrendIcon = kpi.trend === "up" ? TrendingUp : TrendingDown;
          return (
            <div
              key={kpi.label}
              className="erp-card relative flex flex-col justify-between overflow-hidden border border-primary/10 bg-gradient-to-br from-white via-white to-primary/5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="pointer-events-none absolute -left-6 -top-6 h-16 w-16 rounded-full bg-primary/10" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {kpi.currency && "﷼"}
                    {kpi.value}
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "mt-4 flex items-center gap-1 text-sm font-medium",
                  kpi.trend === "up"
                    ? "text-success"
                    : "text-destructive"
                )}
              >
                <TrendIcon className="h-4 w-4" />
                <span>{Math.abs(kpi.change)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Invoices */}
        <div className="lg:col-span-2">
          <div className="erp-card">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                آخر الفواتير
              </h2>
              <Link
                to="/sales"
                className="flex items-center gap-1 text-sm text-primary hover:text-primary-700"
              >
                عرض الكل
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      رقم الفاتورة
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      العميل
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      المبلغ
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      الحالة
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      التاريخ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-border hover:bg-secondary/50"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {invoice.id}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {invoice.customer}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        ﷼{invoice.amount.toLocaleString("ar-SA")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            invoice.status === "مقبولة"
                              ? "bg-success/10 text-success"
                              : invoice.status === "قيد المعالجة"
                                ? "bg-warning/10 text-warning"
                                : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(invoice.date).toLocaleDateString("ar-SA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Alerts and Pending Tasks */}
        <div className="flex flex-col gap-6">
          <div className="erp-card">
            <h3 className="mb-4 font-semibold text-foreground">
              التنبيهات المهمة
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    فواتير قيد المعالجة
                  </p>
                  <p className="text-xs text-muted-foreground">
                    هناك 5 فواتير بانتظار التأكيد
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    فواتير مرفوضة
                  </p>
                  <p className="text-xs text-muted-foreground">
                    فاتورة واحدة تم رفضها من ZATCA
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="erp-card">
            <h3 className="mb-4 font-semibold text-foreground">
              الإجراءات السريعة
            </h3>
            <div className="flex flex-col gap-2">
              <Link
                to="/sales"
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-700"
              >
                إنشاء فاتورة جديدة
              </Link>
              <Link
                to="/purchases"
                className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
              >
                طلب شراء جديد
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Quick Access */}
      <div className="mt-12">
        <h2 className="mb-6 text-2xl font-semibold text-foreground">
          الوحدات الرئيسية
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.href}
                to={module.href}
                className="erp-card group"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary-100 p-3 group-hover:bg-primary-200 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {module.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-medium">اذهب</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
