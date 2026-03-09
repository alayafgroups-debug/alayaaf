import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  UserCheck,
  AlertCircle,
  BarChart2,
  TrendingUp,
  Plus,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function HRDashboard() {
  const navigate = useNavigate();
  const [empData, setEmpData] = useState<{ nationality: string; totalSalary: number; status: string; department?: string }[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    saudi: 0,
    totalSalary: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("nationality, total_salary, status, department");
        if (!error && data) {
          const mapped = data.map((r) => ({
            nationality: String(r.nationality ?? ""),
            totalSalary: Number(r.total_salary ?? 0),
            status: String(r.status ?? "نشط"),
            department: String(r.department ?? ""),
          }));
          setEmpData(mapped);
          setStats({
            total: mapped.length,
            active: mapped.filter((e) => e.status === "نشط").length,
            saudi: mapped.filter((e) => e.nationality === "المملكة العربية السعودية").length,
            totalSalary: mapped.reduce((s, e) => s + e.totalSalary, 0),
          });
        }
      } catch {}
    };
    load();
  }, []);

  const kpiCards = [
    {
      label: "الموظفون الكليون",
      value: stats.total,
      icon: Users,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      onClick: () => navigate("/hr/employees"),
    },
    {
      label: "الموظفون النشطون",
      value: stats.active,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
      onClick: () => navigate("/hr/employees"),
    },
    {
      label: "الموظفون السعوديون",
      value: stats.saudi,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "إجمالي الرواتب",
      value: `${(stats.totalSalary / 1000).toFixed(0)}K`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      onClick: () => navigate("/hr/payroll"),
    },
  ];

  const modules = [
    {
      title: "الموظفون",
      icon: Users,
      color: "bg-blue-600",
      onClick: () => navigate("/hr/employees"),
    },
    {
      title: "الحضور والانصراف",
      icon: UserCheck,
      color: "bg-emerald-600",
      onClick: () => navigate("/hr/attendance"),
    },
    {
      title: "مسير الرواتب",
      icon: TrendingUp,
      color: "bg-purple-600",
      onClick: () => navigate("/hr/payroll"),
    },
    {
      title: "التقارير",
      icon: BarChart2,
      color: "bg-rose-600",
      onClick: () => navigate("/hr/reports"),
    },
  ];

  const statusDistribution = empData.reduce(
    (acc, emp) => {
      acc[emp.status] = (acc[emp.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Layout
      subMenu={{
        title: "الموارد البشرية",
        items: [
          { label: "لوحة التحكم", href: "/hr/dashboard" },
          { label: "الموظفون", href: "/hr/employees" },
          { label: "الحضور والانصراف", href: "/hr/attendance" },
          { label: "مسير الرواتب", href: "/hr/payroll" },
          { label: "السلف", href: "/hr/advances" },
          { label: "شهادات الخبرة", href: "/hr/certificates" },
          { label: "التقارير", href: "/hr/reports" },
          { label: "الإعدادات", href: "/hr/settings" },
        ],
      }}
    >
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">لوحة التحكم الموارد البشرية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نظرة عامة على أداء وإحصائيات الموارد البشرية
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                onClick={card.onClick}
                className={`text-right rounded-xl ${card.bgColor} p-4 transition-all hover:shadow-md border border-transparent hover:border-border`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className={`text-xs font-medium ${card.color}`}>{card.label}</p>
                    <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  </div>
                  <div className={`rounded-lg ${card.bgColor} p-2.5`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Charts Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Distribution Chart */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">توزيع حالات الموظفين</h2>
              </div>
              <div className="space-y-3">
                {Object.entries(statusDistribution).map(([status, count]) => (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-muted-foreground">{status}</span>
                      <span className="text-sm font-bold text-foreground">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className={`h-full ${
                          status === "نشط"
                            ? "bg-green-500"
                            : status === "مجازة"
                              ? "bg-blue-500"
                              : "bg-red-500"
                        }`}
                        style={{
                          width: `${(count / stats.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts/Notices */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">تنبيهات مهمة</h3>
                  <p className="text-sm text-muted-foreground">لا توجد تنبيهات حالياً. جميع البيانات محدثة.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="space-y-5">
            {/* Quick Action Module */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white">
                <h3 className="font-semibold text-right">إجراءات سريعة</h3>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => navigate("/hr/employees")}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-foreground text-right transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">إضافة موظف جديد</span>
                </button>
                <button
                  onClick={() => navigate("/hr/employees")}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-foreground text-right transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span className="text-sm font-medium">عرض جميع الموظفين</span>
                </button>
                <button
                  onClick={() => navigate("/hr/payroll")}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-foreground text-right transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">فتح مسير الرواتب</span>
                </button>
              </div>
            </div>

            {/* Module Cards */}
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.title}
                  onClick={mod.onClick}
                  className={`w-full rounded-xl ${mod.color} p-4 text-white hover:shadow-lg transition-all text-right`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{mod.title}</h4>
                    </div>
                    <Icon className="h-5 w-5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
