import Layout from "./Layout";
import { LucideIcon } from "lucide-react";

interface PlaceholderModuleProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

export default function PlaceholderModule({
  title,
  description,
  icon: Icon,
  features,
}: PlaceholderModuleProps) {
  return (
    <Layout>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 inline-flex rounded-lg bg-primary-100 p-3">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{description}</p>
        </div>

        {/* Content Area */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <div className="erp-card">
              <div className="py-16 text-center">
                <div className="mb-4 flex justify-center">
                  <Icon className="h-16 w-16 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {title} قريباً
                </h3>
                <p className="mt-2 text-muted-foreground">
                  هذه الميزة قيد التطوير حالياً. تابعنا للتحديثات الجديدة.
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  يمكنك أن تطلب المزيد من الميزات من خلال فريق الدعم الفني.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            {/* Features Preview */}
            <div className="erp-card">
              <h3 className="mb-4 font-semibold text-foreground">
                الميزات المخطط لها
              </h3>
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Info Box */}
            <div className="erp-card border-l-4 border-l-accent">
              <h4 className="font-semibold text-foreground">نصيحة</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                استكشف الوحدات الأخرى أو تابع معنا للحصول على التحديثات الجديدة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
