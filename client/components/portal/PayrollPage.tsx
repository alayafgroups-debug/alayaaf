import { useEffect, useState } from "react";
import { ChevronLeft, DollarSign, FileText, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";

type Props = { empId: string; onBack: () => void };

type PayrollRecord = {
  id: string;
  month: string;
  basic_salary: number;
  allowances: number;
  social_insurance_deduction: number;
  deductions: number;
  net_salary: number;
  status: string;
  paid_date: string | null;
};

export default function PayrollPage({ empId, onBack }: Props) {
  const { t, formatNumber, formatDate } = useI18n();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PayrollRecord | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("payroll")
        .select("id, month, basic_salary, allowances, social_insurance_deduction, deductions, net_salary, status, paid_date")
        .eq("emp_id", empId)
        .order("month", { ascending: false });
      setRecords((data ?? []) as PayrollRecord[]);
      setLoading(false);
    }
    load();
  }, [empId]);

  if (selected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
          <button onClick={() => setSelected(null)} className="text-[#004e89]"><ChevronLeft className="h-6 w-6 rotate-180" /></button>
          <h2 className="font-bold text-lg text-gray-900">{t("قسيمة الراتب")} — {selected.month}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50">
          <div className="bg-[#004e89] text-white rounded-xl p-5 mb-4 text-center">
            <p className="text-blue-200 text-sm mb-1">{t("صافي الراتب")}</p>
            <p className="text-4xl font-bold">{formatNumber(+selected.net_salary, { minimumFractionDigits: 2 })} <span className="text-xl">{t("ر.س")}</span></p>
            <p className="text-blue-200 text-sm mt-1">{selected.month}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            {[
              { label: "الراتب الأساسي", value: selected.basic_salary, color: "text-gray-800" },
              { label: "البدلات", value: selected.allowances, color: "text-green-600" },
              { label: "التأمينات الاجتماعية 9.75%", value: selected.social_insurance_deduction, color: "text-orange-600", negative: true },
              { label: "إجمالي الخصومات", value: selected.deductions, color: "text-red-600", negative: true },
              { label: "صافي الراتب", value: selected.net_salary, color: "text-[#004e89] font-bold" },
            ].map(({ label, value, color, negative }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <span className="text-gray-600 text-sm">{t(label)}</span>
                <span className={`font-semibold ${color}`}>{negative ? "-" : "+"}{formatNumber(+value, { minimumFractionDigits: 2 })} {t("ر.س")}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">{t("الحالة")}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${selected.status === "مدفوع" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{t(selected.status)}</span>
            </div>
            {selected.paid_date && <div className="flex justify-between items-center mt-2"><span className="text-gray-500 text-sm">{t("تاريخ الدفع")}</span><span className="text-gray-800 text-sm font-medium">{formatDate(selected.paid_date, { dateStyle: "medium" })}</span></div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
        <button onClick={onBack} className="text-[#004e89]"><ChevronLeft className="h-6 w-6 rotate-180" /></button>
        <h2 className="font-bold text-lg text-gray-900">{t("حساب الراتب")}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t("جاري التحميل...")}</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-gray-400">{t("لا توجد سجلات رواتب")}</div>
        ) : (
          records.map((rec) => (
            <button key={rec.id} onClick={() => setSelected(rec)} className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 flex items-center gap-4 hover:shadow-md transition text-start">
              <div className="w-12 h-12 rounded-full bg-[#004e89]/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-6 w-6 text-[#004e89]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{rec.month}</p>
                <p className="text-sm text-gray-500">{t("صافي")} : {formatNumber(+rec.net_salary, { minimumFractionDigits: 2 })} {t("ر.س")}</p>
              </div>
              <div className="text-start">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${rec.status === "مدفوع" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{t(rec.status)}</span>
              </div>
              <ChevronLeft className="h-5 w-5 text-gray-400" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
