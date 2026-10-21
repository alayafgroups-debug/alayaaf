import HRConfigPage from "@/components/hr/HRConfigPage";
import { useI18n } from "@/i18n";

export default function HRFinancialOvertime() {
  const { t } = useI18n();
  return <HRConfigPage title={t("أنواع الساعات الإضافية")} configType="overtime" valueLabel={t("قيمة الساعة (%)")} />;
}
