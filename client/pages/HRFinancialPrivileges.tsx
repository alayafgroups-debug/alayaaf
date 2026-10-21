import HRConfigPage from "@/components/hr/HRConfigPage";
import { useI18n } from "@/i18n";

export default function HRFinancialPrivileges() {
  const { t } = useI18n();
  return <HRConfigPage title={t("أنواع الامتيازات المالية")} configType="privilege" showValue={false} />;
}
