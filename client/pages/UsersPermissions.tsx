import { ShieldCheck } from "lucide-react";
import PlaceholderModule from "@/components/PlaceholderModule";

export default function UsersPermissions() {
  const features = [
    { label: "إدارة المستخدمين", href: "/users" },
    { label: "إدارة الأدوار", href: "/users/roles" },
    { label: "سجل التدقيق", href: "/users/audit" },
  ];

  return (
    <PlaceholderModule
      title="المستخدمين والصلاحيات"
      description="إدارة المستخدمين والأدوار والصلاحيات وسجل التدقيق بشكل مركزي"
      icon={ShieldCheck}
      features={features}
    />
  );
}
