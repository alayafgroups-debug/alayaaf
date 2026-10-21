import HRConfigPage from "@/components/hr/HRConfigPage";
import { useI18n } from "@/i18n";
export default function HRFinancialAllowances() {
  const { t } = useI18n();
  return <HRConfigPage title={t("قائمة البدلات")} configType="allowance" valueLabel={t("قيمة البدل")} />;
}
