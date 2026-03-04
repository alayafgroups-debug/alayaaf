import Layout from "./Layout";
import { LucideIcon, X, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Layout>
      <div className="flex h-full">
        {/* Main Content */}
        <div className={cn("flex-1 transition-all duration-300", isOpen && "opacity-50")}>
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
              <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary-700 active:bg-primary-800 shadow-lg hover:shadow-xl"
              >
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
                    استكشف الوحدات الأخرى أو تابع معنا للحصول على التحديثات الجديدة.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel - Features */}
        {isOpen && (
          <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl z-50 overflow-y-auto rounded-l-2xl border-l border-slate-700">
            {/* Header */}
            <div className="sticky top-0 border-b border-slate-700 bg-slate-800/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white"
              >
                <ChevronUp className="h-5 w-5" />
              </button>
            </div>

            {/* Features List */}
            <div className="p-6">
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-accent flex-shrink-0 group-hover:bg-accent/80 transition-colors" />
                    <span className="text-slate-200 group-hover:text-white text-sm leading-relaxed transition-colors">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </Layout>
  );
}
