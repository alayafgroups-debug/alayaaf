import HRConfigPage from "@/components/hr/HRConfigPage";
import { useI18n } from "@/i18n";

export default function HRFinancialDeductions() {
  const { t } = useI18n();
  return <HRConfigPage title={t("أنواع الاقتطاعات المالية")} configType="deduction" valueLabel={t("قيمة الاقتطاع")} />;
}
