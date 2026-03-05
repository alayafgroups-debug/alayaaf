import PlaceholderModule from "@/components/PlaceholderModule";
import PlaceholderModule from "@/components/PlaceholderModule";
import { DollarSign } from "lucide-react";

export default function Tax() {
  const features = [
    "حساب الضرائب التلقائي",
    "تطبيق الضريبة على الفواتير",
    "تقارير ضريبية شاملة",
    "الامتثال لمعايير ZATCA",
    "إدارة معدلات الضريبة",
    "تقارير الأداء المالي",
    "تحليل الالتزامات الضريبية",
  ];

  return (
    <PlaceholderModule
      title="إدارة الضرائب"
      description="نظام متخصص لحساب وإدارة الضرائب مع الامتثال الكامل لمتطلبات هيئة الزكاة والضريبة والجمارك (ZATCA)"
      icon={DollarSign}
      features={features}
    />
  );
}
