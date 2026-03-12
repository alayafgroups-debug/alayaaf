import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Receipt, CheckCircle2 } from "lucide-react";

export default function HRPayrollTransfer() {
  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">ترحيل حساب الراتب إلى النظام المحاسبي</h2>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-[#004e89]/10 rounded-full flex items-center justify-center text-[#004e89]">
              <Receipt className="w-12 h-12" />
            </div>
            
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-bold text-gray-900">ميزة ترحيل الرواتب</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                هذه الميزة تتيح لك ترحيل جميع استحقاقات واستقطاعات رواتب الموظفين مباشرة إلى النظام المحاسبي المالي كقيود يومية بشكل آلي.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mt-8">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-right flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-1">تسجيل القيود الآلي</h4>
                  <p className="text-xs text-gray-500">يقوم النظام بإنشاء قيود الرواتب والبدلات في شجرة الحسابات تلقائياً.</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-right flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-1">الدقة والمطابقة</h4>
                  <p className="text-xs text-gray-500">ضمان مطابقة بيانات كشف الراتب مع القوائم المالية للمنشأة.</p>
                </div>
              </div>
            </div>

            <Button className="mt-8 bg-[#004e89] hover:bg-[#003865] text-white h-11 px-8 rounded-lg flex items-center gap-2">
              <span>البدء في الترحيل</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
