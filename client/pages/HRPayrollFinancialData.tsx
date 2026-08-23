import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { FileText, Download } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";

type EmpRow = { id: string; name: string; jobTitle: string; department: string; branch: string; workTime: string; baseSalary: number };

export default function HRPayrollFinancialData() {
  const { t, direction, formatNumber } = useI18n();
  const [employees, setEmployees] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from("employees").select("id, name, job_title, department, branch, work_time, base_salary, total_salary").order("created_at", { ascending: false });
        if (data) setEmployees(data.map((r) => ({
          id: String(r.id), name: String(r.name ?? ""), jobTitle: String(r.job_title ?? ""),
          department: String(r.department ?? ""), branch: String(r.branch ?? ""),
          workTime: r.work_time == null ? "" : String(r.work_time), baseSalary: Number(r.base_salary ?? 0),
        })));
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir={direction}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#004e89] text-white p-3 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold">{t("البيانات المالية للموظفين")}</h2>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title={t("تصدير")}><Download className="h-4 w-4" /></button>
              <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title={t("سجل")}><FileText className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 font-medium text-center w-16">{t("الصورة")}</th>
                  <th className="py-3 px-4 font-medium">{t("الاسم")}</th>
                  <th className="py-3 px-4 font-medium">{t("المسمى الوظيفي")}</th>
                  <th className="py-3 px-4 font-medium">{t("القسم")}</th>
                  <th className="py-3 px-4 font-medium">{t("الفرع")}</th>
                  <th className="py-3 px-4 font-medium">{t("الراتب الأساسي")}</th>
                  <th className="py-3 px-4 font-medium">{t("وقت العمل")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">{t("جاري التحميل...")}</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-500">{t("لا يوجد موظفون")}</td></tr>
                ) : employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 flex justify-center">
                      <Avatar className="h-8 w-8"><AvatarFallback className="bg-[#004e89] text-white text-xs">{emp.name.charAt(0)}</AvatarFallback></Avatar>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{emp.name}</td>
                    <td className="py-3 px-4">{emp.jobTitle || t("—")}</td>
                    <td className="py-3 px-4">{emp.department || t("—")}</td>
                    <td className="py-3 px-4">{emp.branch || t("—")}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">{formatNumber(emp.baseSalary, { style: "currency", currency: "SAR", minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    <td className="py-3 px-4">{emp.workTime || t("كامل")}</td>
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
