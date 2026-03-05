import PlaceholderModule from "@/components/PlaceholderModule";
import PlaceholderModule from "@/components/PlaceholderModule";
import { CreditCard } from "lucide-react";

export default function CRM() {
  const features = [
    "قاعدة بيانات العملاء الشاملة",
    "تتبع التفاعلات مع العملاء",
    "سجل المبيعات لكل عميل",
    "معلومات التواصل والعناوين",
    "تحليل سلوك العملاء",
    "التقارير والإحصائيات",
    "تصنيف ودرجات العملاء",
  ];

  return (
    <PlaceholderModule
      title="إدارة العملاء (CRM)"
      description="نظام إدارة العلاقات مع العملاء يتيح لك متابعة جميع تفاعلاتك معهم وتحليل سلوكهم"
      icon={CreditCard}
      features={features}
    />
  );
}
