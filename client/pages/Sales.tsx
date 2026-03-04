import PlaceholderModule from "@/components/PlaceholderModule";
import { FileText } from "lucide-react";

export default function Sales() {
  const features = [
    "عروض الأسعار",
    "أوامر البيع",
    "فواتير المبيعات",
    "سندات التسليم",
    "مردودات المبيعات",
    "تقارير المبيعات المتقدمة",
    "تتبع الحالة والتنبيهات",
  ];

  return (
    <PlaceholderModule
      title="إدارة المبيعات"
      description="نظام متكامل لإدارة عمليات البيع من العرض إلى الفاتورة النهائية، مع التوافق الكامل مع معايير ZATCA للفوترة الإلكترونية"
      icon={FileText}
      features={features}
    />
  );
}
