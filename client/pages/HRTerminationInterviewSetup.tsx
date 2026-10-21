import HRConfigPage from "@/components/hr/HRConfigPage";
import { useI18n } from "@/i18n";

export default function HRTerminationInterviewSetup() {
  const { t } = useI18n();
  return <HRConfigPage title={t("عناصر نموذج مقابلة إنهاء الخدمة")} configType="interview_question" valueLabel={t("الترتيب")} />;
}
