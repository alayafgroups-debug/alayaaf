import HRConfigPage from "@/components/hr/HRConfigPage";
import { useI18n } from "@/i18n";

export default function HRFinancialEmployeeCategories() {
  const { t } = useI18n();
  return <HRConfigPage title={t("فئات الموظفين")} configType="employee_category" showValue={false} />;
}
