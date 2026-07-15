import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type PayrollSettings = {
  salaryBasis: string;
  showCooperators: boolean;
  advancePayroll: boolean;
  payDate: string;
  absenceCalc: string;
  normalHourCalc: string;
  otBasic: string;
  otExtra: string;
  overtimeInsurance: boolean;
  excludeAdvances: boolean;
  totalsColumns: string;
  earnedSalary: boolean;
  monthDaysMethod: string;
  month31Policy: string;
};

const DEFAULTS: PayrollSettings = {
  salaryBasis: "الأيام",
  showCooperators: false,
  advancePayroll: true,
  payDate: "يوم 30 من الشهر",
  absenceCalc: "basic_allowances",
  normalHourCalc: "basic",
  otBasic: "basic",
  otExtra: "basic",
  overtimeInsurance: false,
  excludeAdvances: false,
  totalsColumns: "الإثنين معاً",
  earnedSalary: true,
  monthDaysMethod: "30 يوم ثابت (افتراضي حسب نظام العمل السعودي)",
  month31Policy: "لصالح الموظف (متساهل)",
};

const SETTING_KEY = "payroll_settings";

export default function HRPayrollSettings() {
  const [s, setS] = useState<PayrollSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("hr_settings")
          .select("setting_value")
          .eq("setting_key", SETTING_KEY)
          .maybeSingle();
        if (data?.setting_value) {
          setS({ ...DEFAULTS, ...(data.setting_value as Partial<PayrollSettings>) });
        }
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = <K extends keyof PayrollSettings>(key: K, value: PayrollSettings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("hr_settings")
      .upsert([{ setting_key: SETTING_KEY, setting_value: s, updated_at: new Date().toISOString() }], { onConflict: "setting_key" });
    setSaving(false);
    if (error) {
      toast({ title: "تعذر الحفظ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم الحفظ", description: "تم حفظ إعدادات حساب الراتب في قاعدة البيانات" });
  };

  const Radio = ({ name, checked, onChange, label }: { name: string; checked: boolean; onChange: () => void; label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );

  const YesNo = ({ name, value, onChange }: { name: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex gap-6 mt-2">
      <Radio name={name} checked={value} onChange={() => onChange(true)} label="نعم" />
      <Radio name={name} checked={!value} onChange={() => onChange(false)} label="لا" />
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-400" dir="rtl">جاري تحميل الإعدادات...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-8" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">إعدادات حساب الراتب</h2>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">حساب الراتب <span className="text-red-500">*</span></label>
                  <select value={s.salaryBasis} onChange={(e) => set("salaryBasis", e.target.value)} className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                    <option>الأيام</option>
                    <option>الساعات</option>
                  </select>
                  <p className="text-xs text-gray-400">اختر طريقة حساب قيمة الراتب للحضور والغياب</p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">عرض المتعاونين في كشف الراتب</label>
                  <YesNo name="cooperators" value={s.showCooperators} onChange={(v) => set("showCooperators", v)} />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">تفعيل إمكانية اصدار حساب الراتب مقدما</label>
                  <YesNo name="advance_payroll" value={s.advancePayroll} onChange={(v) => set("advancePayroll", v)} />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">حدد تاريخ صرف الراتب <span className="text-red-500">*</span></label>
                  <select value={s.payDate} onChange={(e) => set("payDate", e.target.value)} className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                    <option>يوم 25 من الشهر</option>
                    <option>يوم 27 من الشهر</option>
                    <option>يوم 30 من الشهر</option>
                    <option>آخر يوم في الشهر</option>
                  </select>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">طريقة احتساب قيمة أيام الغياب <span className="text-red-500">*</span></label>
                  <div className="space-y-3 mt-2">
                    <Radio name="absence_calc" checked={s.absenceCalc === "basic"} onChange={() => set("absenceCalc", "basic")} label="من الراتب الأساسي (الافتراضي)" />
                    <Radio name="absence_calc" checked={s.absenceCalc === "basic_allowances"} onChange={() => set("absenceCalc", "basic_allowances")} label="من إجمالي الراتب الأساسي + البدلات" />
                    <Radio name="absence_calc" checked={s.absenceCalc === "basic_allowances_privileges"} onChange={() => set("absenceCalc", "basic_allowances_privileges")} label="من إجمالي الراتب الأساسي + البدلات + الإمتيازات" />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">احتساب قيمة الساعة العادية للموظف <span className="text-red-500">*</span></label>
                  <div className="space-y-3 mt-2">
                    <Radio name="normal_hour_calc" checked={s.normalHourCalc === "basic"} onChange={() => set("normalHourCalc", "basic")} label="من الراتب الأساسي / 30 يوم / على عدد ساعات الدوام" />
                    <Radio name="normal_hour_calc" checked={s.normalHourCalc === "basic_allowances"} onChange={() => set("normalHourCalc", "basic_allowances")} label="من (الأساسي + البدلات) / 30 يوم / على عدد ساعات الدوام" />
                    <Radio name="normal_hour_calc" checked={s.normalHourCalc === "basic_allowances_privileges"} onChange={() => set("normalHourCalc", "basic_allowances_privileges")} label="من (الأساسي + البدلات + الإمتيازات) / 30 يوم / على ساعات الدوام" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">احتساب الساعة الإضافية حتى 100% <span className="text-red-500">*</span></label>
                <div className="space-y-3 mt-2">
                  <Radio name="ot_basic" checked={s.otBasic === "basic"} onChange={() => set("otBasic", "basic")} label="من الراتب الأساسي (الافتراضي)" />
                  <Radio name="ot_basic" checked={s.otBasic === "basic_allowances"} onChange={() => set("otBasic", "basic_allowances")} label="من إجمالي الراتب الأساسي + البدلات" />
                  <Radio name="ot_basic" checked={s.otBasic === "basic_allowances_privileges"} onChange={() => set("otBasic", "basic_allowances_privileges")} label="من إجمالي الراتب الأساسي + البدلات + الإمتيازات" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">احتساب الساعة الإضافية فوق 100% <span className="text-red-500">*</span></label>
                <div className="space-y-3 mt-2">
                  <Radio name="ot_extra" checked={s.otExtra === "basic"} onChange={() => set("otExtra", "basic")} label="من الراتب الأساسي (الافتراضي)" />
                  <Radio name="ot_extra" checked={s.otExtra === "basic_allowances"} onChange={() => set("otExtra", "basic_allowances")} label="من إجمالي الراتب الأساسي + البدلات" />
                  <Radio name="ot_extra" checked={s.otExtra === "basic_allowances_privileges"} onChange={() => set("otExtra", "basic_allowances_privileges")} label="من إجمالي الراتب الأساسي + البدلات + الإمتيازات" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">تفعيل التأمين على الساعات الإضافية</label>
                <select value={s.overtimeInsurance ? "نعم" : "لا"} onChange={(e) => set("overtimeInsurance", e.target.value === "نعم")} className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                  <option>لا</option>
                  <option>نعم</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">استثناء السلف من الاقتطاعات</label>
                <YesNo name="exclude_advances" value={s.excludeAdvances} onChange={(v) => set("excludeAdvances", v)} />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">أعمدة الإجماليات في كشف الراتب</label>
                <select value={s.totalsColumns} onChange={(e) => set("totalsColumns", e.target.value)} className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                  <option>الإثنين معاً</option>
                  <option>الإجمالي فقط</option>
                  <option>الصافي فقط</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-[#004e89] font-bold text-base mb-6 border-r-4 border-[#004e89] pr-3">إعدادات طريقة احتساب الراتب</h3>
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">تفعيل نظام الراتب المكتسب حسب الحضور</label>
                <YesNo name="earned_salary" value={s.earnedSalary} onChange={(v) => set("earnedSalary", v)} />
                <p className="text-xs text-gray-400 mt-2">في نظام الراتب المكتسب يُحسب الراتب حسب أيام الحضور الفعلية مقابل أيام الدوام.</p>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-[#004e89] font-bold text-base mb-6 border-r-4 border-[#004e89] pr-3">إعدادات أيام الشهر</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">طريقة حساب أيام الشهر <span className="text-red-500">*</span></label>
                  <select value={s.monthDaysMethod} onChange={(e) => set("monthDaysMethod", e.target.value)} className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                    <option>30 يوم ثابت (افتراضي حسب نظام العمل السعودي)</option>
                    <option>عدد أيام الشهر الفعلي</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">سياسة الأشهر ذات 31 يوم <span className="text-red-500">*</span></label>
                  <select value={s.month31Policy} onChange={(e) => set("month31Policy", e.target.value)} className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                    <option>لصالح الموظف (متساهل)</option>
                    <option>لصالح الشركة</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-[#004e89] hover:bg-[#003865] text-white px-8 h-10 rounded-md">
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
