import HRConfigPage from "@/components/hr/HRConfigPage";
import { useI18n } from "@/i18n";

export default function HRFinancialLoans() {
  const { t } = useI18n();
  return <HRConfigPage title={t("قائمة أنواع السلف")} configType="loan" showValue={false} />;
}
