import { ShieldAlert } from "lucide-react";
import Layout from "@/components/Layout";
import { useI18n } from "@/i18n";

// أُوقفت أداة الخصومات الآلية: كانت تولّد خصومات بأسباب لا تستند إلى سجلات حضور أو جزاءات،
// ورسائل "إقرار" باسم الموظفين بتواريخ سابقة. البيانات التي وُلّدت سابقًا لم تُحذف وتبقى للمراجعة.
export default function HRDeductionsEmails() {
  const { t, direction } = useI18n();
  return (
    <Layout>
      <div dir={direction} className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <ShieldAlert className="h-6 w-6" />
            <h1 className="text-lg font-bold">{t("أداة الخصومات الآلية موقوفة")}</h1>
          </div>
          <p className="text-sm text-amber-900 leading-7">
            {t("كانت هذه الأداة تولّد خصومات لا تستند إلى سجلات حضور أو جزاءات فعلية، ورسائل إقرار باسم الموظفين بتواريخ سابقة. الخصم من الأجر يجب أن يكون بسبب نظامي موثق وفي حدود نظام العمل.")}
          </p>
          <p className="text-sm text-amber-900 leading-7">
            {t("ما وُلّد سابقًا لم يُحذف ويبقى للمراجعة. الخصومات الفعلية تُسجَّل من الحضور والجزاءات ومسير الرواتب.")}
          </p>
        </div>
      </div>
    </Layout>
  );
}
