import PlaceholderModule from "@/components/PlaceholderModule";
import { ShoppingCart } from "lucide-react";

export default function Purchases() {
  const features = [
    "طلبات الشراء (Purchase Requests)",
    "أوامر الشراء (Purchase Orders)",
    "سندات الاستلام (Goods Receipt Notes)",
    "فواتير المشتريات (Purchase Invoices)",
    "مردودات المشتريات (Purchase Returns)",
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
