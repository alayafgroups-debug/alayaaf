import PlaceholderModule from "@/components/PlaceholderModule";
import { Users } from "lucide-react";
import { useI18n } from "@/i18n";

export default function HR() {
  const { t } = useI18n();
  const features = [
    t("بيانات الموظفين"),
    t("إدارة الرواتب"),
    t("تسجيل الحضور والانصراف"),
    t("تقارير الموارد البشرية"),
    t("إجازات وغيابات"),
    t("تطور الموظفين والمؤهلات"),
    t("الرواتب والاستقطاعات"),
  ];

  return (
    <PlaceholderModule
      title="إدارة الموارد البشرية"
      description={t("نظام متكامل لإدارة بيانات الموظفين والرواتب والحضور والتقارير، مع حسابات تلقائية وآمنة")}
      icon={Users}
      features={features}
    />
  );
}
