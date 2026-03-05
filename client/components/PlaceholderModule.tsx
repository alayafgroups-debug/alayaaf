import Layout from "./Layout";
import { LucideIcon } from "lucide-react";

interface PlaceholderModuleProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features: { label: string; href?: string }[] | string[];
}

export default function PlaceholderModule({
  title,
  description,
  icon: Icon,
  features,
}: PlaceholderModuleProps) {
  const formattedFeatures = features.map((f) =>
    typeof f === "string" ? { label: f } : f
  );

  return (
    <Layout subMenu={{ title, items: formattedFeatures }}>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 inline-flex rounded-lg bg-primary-100 p-3">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{description}</p>
        </div>

        {/* Main Button */}
        <div className="mb-8">
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary-700 active:bg-primary-800 shadow-lg hover:shadow-xl">
            <Icon className="h-5 w-5" />
            {title}
          </button>
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
            {/* Info Box */}
            <div className="erp-card border-l-4 border-l-accent">
              <h4 className="font-semibold text-foreground">نصيحة</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                اضغط على {title} في الشريط الجانبي لعرض قائمة الخيارات.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
