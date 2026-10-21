import HRConfigPage from "@/components/hr/HRConfigPage";
import { useI18n } from "@/i18n";

export default function HRFinancialAccountSettings() {
  const { t } = useI18n();
  return <HRConfigPage title={t("إعدادات الحسابات للنظام المحاسبي")} configType="account_setting" valueLabel={t("رقم الحساب")} />;
}
