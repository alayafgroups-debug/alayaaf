import Layout from "@/components/Layout";
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
  FileX,
  Wallet,
  BarChart2,
  Plus,
  Eye,
  List,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
    { label: "منتفع قائمة", value: activeBeneficiaries, icon: UserCheck, bg: "bg-yellow-400" },
    { label: "إجمالي الرواتب", value: totalSalaries.toLocaleString("ar-SA"), icon: DollarSign, bg: "bg-blue-500" },
    { label: "موظفين سعوديين", value: saudiEmployees, icon: Flag, bg: "bg-green-600" },
    { label: "إجمالي الموظفين", value: totalEmployees, icon: Users, bg: "bg-blue-700" },
  ];

  return (
    <Layout>
      <div dir="rtl" className="space-y-6">
        {/* Page Title */}
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-foreground">إدارة الموارد البشرية</h1>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className={`${s.bg} rounded-xl p-5 flex flex-col items-center gap-2 shadow cursor-pointer hover:opacity-90 transition`}
                onClick={() => i === 0 || i === 3 ? navigate("/hr/employees") : undefined}>
                <Icon className="h-8 w-8 text-white/90" />
                <span className="text-3xl font-bold text-white">{s.value}</span>
                <span className="text-sm text-white/90 font-medium">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Module Cards Grid - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* الموظفون */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-semibold">الموظفون</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">إدارة بيانات الموظفين والعقود</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => navigate("/hr/employees")} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition">
                  <Eye className="h-3.5 w-3.5" />
                  عرض الموظفين
                </button>
                <button onClick={() => navigate("/hr/employees")} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition">
                  <Plus className="h-3.5 w-3.5" />
                  إضافة موظف
                </button>
              </div>
            </div>
          </div>

          {/* مسير الرواتب */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="bg-green-600 text-white px-4 py-3 flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <span className="font-semibold">مسير الرواتب</span>
              </div>
              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">معلق</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">حساب وصرف الرواتب الشهرية</p>
              <div className="flex gap-2">
                <button onClick={() => navigate("/hr/payroll")} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition">
                  <ClipboardList className="h-3.5 w-3.5" />
                  مسير الرواتب
                </button>
              </div>
            </div>
          </div>

          {/* الحضور والانصراف */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="bg-green-700 text-white px-4 py-3 flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="font-semibold">الحضور والانصراف</span>
              </div>
              <span className="bg-green-400 text-green-900 text-xs font-bold px-2 py-0.5 rounded-full">ممتمة</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">تسجيل الحضور والغياب الشهري</p>
              <div className="flex gap-2">
                <button onClick={() => navigate("/hr/attendance")} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-700 text-white text-xs font-medium hover:bg-green-800 transition">
                  <Clock className="h-3.5 w-3.5" />
                  الحضور والانصراف
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Module Cards Grid - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* الهيكل التنظيمي */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="bg-gray-600 text-white px-4 py-3 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span className="font-semibold">الهيكل التنظيمي</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">الأقسام والوظائف والجنسيات</p>
              <div className="flex gap-2 flex-wrap">
                <button className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition">الأقسام</button>
                <button className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition">الوظائف</button>
                <button className="px-3 py-2 rounded-lg bg-gray-600 text-white text-xs font-medium hover:bg-gray-700 transition">الجنسيات</button>
              </div>
            </div>
          </div>

          {/* تصفية المستحقات */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-2">
              <FileX className="h-5 w-5" />
              <span className="font-semibold">تصفية المستحقات</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">تصفية مستحقات الموظفين المنتهية خدمتهم</p>
              <div className="flex gap-2 flex-wrap">
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition">
                  <List className="h-3.5 w-3.5" />
                  عرض التصفيات
                </button>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition">
                  <Plus className="h-3.5 w-3.5" />
                  تصفية جديدة
                </button>
              </div>
            </div>
          </div>

          {/* السلف */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="bg-yellow-500 text-white px-4 py-3 flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <span className="font-semibold">السلف</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">إدارة سلف الموظفين</p>
              <div className="flex gap-2 flex-wrap">
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg bg-yellow-600 text-white text-xs font-medium hover:bg-yellow-700 transition">
                  <Eye className="h-3.5 w-3.5" />
                  عرض السلف
                </button>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition">
                  <Plus className="h-3.5 w-3.5" />
                  سلفة جديدة
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Module Cards Grid - Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* التقارير */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-3 flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              <span className="font-semibold">التقارير</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">تقارير الموارد البشرية الشاملة</p>
              <div className="flex gap-2 flex-wrap">
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-800 text-white text-xs font-medium hover:bg-gray-900 transition">
                  <BarChart2 className="h-3.5 w-3.5" />
                  تقارير شاملة
                </button>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition">
                  <ClipboardList className="h-3.5 w-3.5" />
                  تقارير سريعة
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
