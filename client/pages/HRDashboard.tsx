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
  Calendar,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type EmpRow = { nationality: string; totalSalary: number; status: string; department: string; name: string };
type AttendanceAlert = { absentToday: number; lateToday: number };
type LeaveAlert = { pendingLeaves: number };

export default function HRDashboard() {
  const navigate = useNavigate();
  const [empData, setEmpData] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, saudi: 0, totalSalary: 0 });
  const [attendanceAlert, setAttendanceAlert] = useState<AttendanceAlert>({ absentToday: 0, lateToday: 0 });
  const [leaveAlert, setLeaveAlert] = useState<LeaveAlert>({ pendingLeaves: 0 });
  const [recentAttendance, setRecentAttendance] = useState<{ emp_name: string; check_in: string; status: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        // Load employees
        const { data, error: empError } = await supabase
          .from("employees")
          .select("name, nationality, total_salary, status, department");

        if (empError) {
          console.error("Employees fetch error:", empError);
          setStats({ total: 0, active: 0, saudi: 0, totalSalary: 0 });
        } else if (data) {
          const mapped: EmpRow[] = data.map((r: any) => ({
            name: String(r.name ?? ""),
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

        // Load today's attendance alerts
        const today = new Date().toISOString().split("T")[0];
        const { data: attData, error: attError } = await supabase
          .from("attendance")
          .select("emp_name, check_in, status, late_minutes")
          .eq("date", today);

        if (!attError && attData) {
          const absentToday = (attData || []).filter((a: any) => a.status === "غائب").length;
          const lateToday = (attData || []).filter((a: any) => (a.late_minutes ?? 0) > 0).length;
          setAttendanceAlert({ absentToday, lateToday });
          setRecentAttendance((attData || []).slice(0, 5).map((a: any) => ({
            emp_name: String(a.emp_name ?? ""),
            check_in: String(a.check_in ?? "-"),
            status: String(a.status ?? ""),
          })));
        }

        // Load pending leave requests
        const { data: leaveData, error: leaveError } = await supabase
          .from("leave_requests")
          .select("id")
          .eq("status", "معلقة");

        if (!leaveError && leaveData) {
          setLeaveAlert({ pendingLeaves: leaveData?.length ?? 0 });
        }

      } catch (err) {
        console.error("Error loading HR dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const kpiCards = [
    { label: "الموظفون الكليون", value: stats.total, icon: Users, color: "text-amber-600", bgColor: "bg-amber-50", onClick: () => navigate("/hr/employees") },
    { label: "الموظفون النشطون", value: stats.active, icon: UserCheck, color: "text-green-600", bgColor: "bg-green-50", onClick: () => navigate("/hr/employees") },
    { label: "الموظفون السعوديون", value: stats.saudi, icon: Building2, color: "text-blue-600", bgColor: "bg-blue-50" },
    { label: "إجمالي الرواتب", value: stats.totalSalary > 0 ? `${stats.totalSalary.toLocaleString("ar-SA")} ر.س` : "0", icon: TrendingUp, color: "text-purple-600", bgColor: "bg-purple-50", onClick: () => navigate("/hr/payroll") },
  ];

  const statusDistribution = empData.reduce((acc, emp) => {
    acc[emp.status] = (acc[emp.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasAlerts = attendanceAlert.absentToday > 0 || attendanceAlert.lateToday > 0 || leaveAlert.pendingLeaves > 0;

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">لوحة التحكم - الموارد البشرية</h1>
          <p className="mt-1 text-sm text-muted-foreground">نظرة عامة على أداء وإحصائيات الموارد البشرية</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <button key={card.label} onClick={card.onClick} className={`text-right rounded-xl ${card.bgColor} p-4 transition-all hover:shadow-md border border-transparent hover:border-border`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className={`text-xs font-medium ${card.color}`}>{card.label}</p>
                    <p className="text-2xl font-bold text-foreground">{loading ? "..." : card.value}</p>
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
          {/* Left: Charts & Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Distribution */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4">توزيع حالات الموظفين</h2>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">جاري التحميل...</p>
              ) : Object.keys(statusDistribution).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا يوجد موظفون بعد</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(statusDistribution).map(([status, count]) => (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-muted-foreground">{status}</span>
                        <span className="text-sm font-bold text-foreground">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className={`h-full ${status === "نشط" ? "bg-green-500" : status === "إجازة" ? "bg-blue-500" : status === "غير نشط" ? "bg-gray-400" : "bg-red-500"}`}
                          style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Attendance */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold text-foreground">حضور اليوم</h2>
                </div>
                <button onClick={() => navigate("/hr/attendance")} className="text-sm text-primary font-medium hover:underline">عرض الكل</button>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">جاري التحميل...</p>
              ) : recentAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد سجلات حضور لليوم</p>
              ) : (
                <div className="space-y-2">
                  {recentAttendance.map((att, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                      <span className="text-sm font-medium">{att.emp_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{att.check_in}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${att.status === "حاضر" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {att.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alerts */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-foreground">تنبيهات مهمة</h3>
              </div>
              {!hasAlerts ? (
                <p className="text-sm text-muted-foreground">لا توجد تنبيهات حالياً. جميع البيانات محدثة.</p>
              ) : (
                <div className="space-y-2">
                  {attendanceAlert.absentToday > 0 && (
                    <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50/60 p-3 text-red-700">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold">غياب اليوم</p>
                        <p className="text-xs opacity-75">{attendanceAlert.absentToday} موظف غائب اليوم</p>
                      </div>
                    </div>
                  )}
                  {attendanceAlert.lateToday > 0 && (
                    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-amber-700">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold">تأخير اليوم</p>
                        <p className="text-xs opacity-75">{attendanceAlert.lateToday} موظف متأخر اليوم</p>
                      </div>
                    </div>
                  )}
                  {leaveAlert.pendingLeaves > 0 && (
                    <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-blue-700">
                      <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold">طلبات إجازة معلقة</p>
                        <p className="text-xs opacity-75">{leaveAlert.pendingLeaves} طلب بانتظار الموافقة</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white">
                <h3 className="font-semibold text-right">إجراءات سريعة</h3>
              </div>
              <div className="p-4 space-y-2">
                <button onClick={() => navigate("/hr/employees")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-foreground text-right transition-colors">
                  <Plus className="h-4 w-4" /><span className="text-sm font-medium">إضافة موظف جديد</span>
                </button>
                <button onClick={() => navigate("/hr/employees")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-foreground text-right transition-colors">
                  <Eye className="h-4 w-4" /><span className="text-sm font-medium">عرض جميع الموظفين</span>
                </button>
                <button onClick={() => navigate("/hr/payroll")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-foreground text-right transition-colors">
                  <TrendingUp className="h-4 w-4" /><span className="text-sm font-medium">فتح مسير الرواتب</span>
                </button>
                <button onClick={() => navigate("/hr/attendance")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-foreground text-right transition-colors">
                  <Clock className="h-4 w-4" /><span className="text-sm font-medium">سجل الحضور والانصراف</span>
                </button>
              </div>
            </div>

            {/* Module Cards */}
            {[
              { title: "الموظفون", icon: Users, color: "bg-blue-600", onClick: () => navigate("/hr/employees") },
              { title: "الحضور والانصراف", icon: UserCheck, color: "bg-emerald-600", onClick: () => navigate("/hr/attendance") },
              { title: "مسير الرواتب", icon: TrendingUp, color: "bg-purple-600", onClick: () => navigate("/hr/payroll") },
              { title: "التقارير", icon: BarChart2, color: "bg-rose-600", onClick: () => navigate("/hr/reports") },
            ].map((mod) => {
              const Icon = mod.icon;
              return (
                <button key={mod.title} onClick={mod.onClick} className={`w-full rounded-xl ${mod.color} p-4 text-white hover:shadow-lg transition-all text-right`}>
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold">{mod.title}</h4>
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
