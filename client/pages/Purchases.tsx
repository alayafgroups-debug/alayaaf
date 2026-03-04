import PlaceholderModule from "@/components/PlaceholderModule";
import { ShoppingCart } from "lucide-react";

export default function Purchases() {
  const features = [
    "طلبات الشراء",
    "أوامر الشراء",
    "سندات الاستلام",
    "فواتير المشتريات",
    "مردودات المشتريات",
    "تقارير المشتريات الشاملة",
    "إدارة الموردين والعروض",
  ];

  return (
    <PlaceholderModule
      title="إدارة المشتريات"
      description="نظام شامل لإدارة جميع عمليات الشراء والتعاملات مع الموردين، مع تقارير تفصيلية وتتبع العمليات"
      icon={ShoppingCart}
      features={features}
    />
  );
}
