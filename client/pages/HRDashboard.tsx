import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  DollarSign,
  Flag,
  UserCheck,
  ClipboardList,
  Clock,
  Building2,
  Wallet,
  BarChart2,
  Plus,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/SalesPageUI";

export default function HRDashboard() {
  const navigate = useNavigate();
  const [empData, setEmpData] = useState<{ nationality: string; totalSalary: number; status: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("nationality, total_salary, status");
        if (!error && data) {
          setEmpData(data.map((r) => ({
            nationality: String(r.nationality ?? ""),
            totalSalary: Number(r.total_salary ?? 0),
            status: String(r.status ?? "نشط"),
          })));
        }
      } catch {}
    };
    load();
  }, []);

  const totalEmployees = empData.length;
  const activeBeneficiaries = empData.filter((e) => e.status === "نشط").length;
  const totalSalaries = empData.reduce((s, e) => s + e.totalSalary, 0);
  const saudiEmployees = empData.filter((e) => e.nationality === "المملكة العربية السعودية").length;

  const stats = [
    {
      label: "الموظفون النشطون",
      value: activeBeneficiaries,
      icon: UserCheck,
      gradient: "from-emerald-500 to-green-600",
      onClick: () => navigate("/hr/employees"),
    },
    {
      label: "إجمالي الرواتب",
      value: `${totalSalaries.toLocaleString("ar-SA")} ر.س`,
      icon: DollarSign,
      gradient: "from-blue-500 to-indigo-600",
      onClick: () => navigate("/hr/payroll"),
    },
    {
      label: "الموظفون السعوديون",
      value: saudiEmployees,
      icon: Flag,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      label: "إجمالي الموظفين",
      value: totalEmployees,
      icon: Users,
      gradient: "from-violet-500 to-purple-600",
      onClick: () => navigate("/hr/employees"),
    },
  ];

  const modules = [
    {
      title: "الموظفون",
      description: "إدارة بيانات الموظفين والعقود والتعيينات.",
      icon: Users,
      gradient: "from-blue-600 to-indigo-700",
      actions: [
        { label: "عرض الموظفين", icon: Eye, onClick: () => navigate("/hr/employees"), variant: "primary" as const },
        { label: "إضافة موظف", icon: Plus, onClick: () => navigate("/hr/employees"), variant: "success" as const },
      ],
    },
    {
      title: "مسير الرواتب",
      description: "إدارة الرواتب الشهرية وتحديث حالات الصرف.",
      icon: DollarSign,
      gradient: "from-emerald-600 to-green-700",
      badge: "قيد المتابعة",
      actions: [
        { label: "فتح مسير الرواتب", icon: ClipboardList, onClick: () => navigate("/hr/payroll"), variant: "danger" as const },
      ],
    },
    {
      title: "الحضور والانصراف",
      description: "متابعة تسجيل الحضور والغياب والتأخير.",
      icon: Clock,
      gradient: "from-cyan-600 to-sky-700",
      badge: "مفعل",
      actions: [
        { label: "فتح الحضور", icon: Clock, onClick: () => navigate("/hr/attendance"), variant: "info" as const },
      ],
    },
    {
      title: "الهيكل التنظيمي",
      description: "تنظيم الأقسام والوظائف والهيكل الإداري.",
      icon: Building2,
      gradient: "from-slate-600 to-slate-800",
      actions: [
        { label: "الأقسام", icon: Building2, onClick: () => navigate("/hr/settings"), variant: "primary" as const },
        { label: "الإعدادات", icon: Eye, onClick: () => navigate("/hr/settings"), variant: "neutral" as const },
      ],
    },
    {
      title: "السلف",
      description: "إدارة سلف الموظفين وحركة الأقساط.",
      icon: Wallet,
      gradient: "from-amber-500 to-yellow-600",
      actions: [
        { label: "عرض السلف", icon: Eye, onClick: () => navigate("/hr/advances"), variant: "warning" as const },
        { label: "سلفة جديدة", icon: Plus, onClick: () => navigate("/hr/advances"), variant: "success" as const },
      ],
    },
    {
      title: "التقارير",
      description: "تقارير شاملة لأداء الموارد البشرية.",
      icon: BarChart2,
      gradient: "from-indigo-600 to-purple-700",
      actions: [
        { label: "فتح التقارير", icon: BarChart2, onClick: () => navigate("/hr/reports"), variant: "primary" as const },
      ],
    },
  ];

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          icon={Users}
          title="لوحة تحكم الموارد البشرية"
          subtitle="نظرة عامة وإدارة سريعة لجميع أقسام الموارد البشرية"
          actionLabel="إضافة موظف جديد"
          onAction={() => navigate("/hr/employees")}
          gradient="from-emerald-600 to-teal-700"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`w-full text-right rounded-2xl bg-gradient-to-br ${item.gradient} p-5 text-white shadow-lg hover:scale-[1.01] transition-transform`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-white/85">{item.label}</p>
                    <p className="text-2xl font-bold leading-tight">{item.value}</p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {modules.map((module) => (
            <ModuleCard key={module.title} {...module} />
          ))}
        </div>
      </div>
    </Layout>
  );
}

type ModuleAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant: "primary" | "success" | "danger" | "warning" | "info" | "neutral";
};

function ModuleCard({
  title,
  description,
  icon: Icon,
  gradient,
  actions,
  badge,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  actions: ModuleAction[];
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
      <div className={`bg-gradient-to-r ${gradient} px-4 py-3 text-white flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        {badge && <span className="rounded-full bg-white/25 px-2.5 py-1 text-xs font-semibold">{badge}</span>}
      </div>
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <QuickActionButton key={action.label} {...action} />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({ label, icon: Icon, onClick, variant }: ModuleAction) {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    info: "bg-cyan-600 hover:bg-cyan-700 text-white",
    neutral: "bg-slate-600 hover:bg-slate-700 text-white",
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${variants[variant]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
