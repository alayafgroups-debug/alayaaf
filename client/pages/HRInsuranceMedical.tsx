import HRConfigPage from "@/components/hr/HRConfigPage";
import { useI18n } from "@/i18n";

export default function HRInsuranceMedical() {
  const { t } = useI18n();
  return <HRConfigPage title={t("قائمة التأمينات الطبية")} configType="medical_insurance" showValue={false} />;
}
