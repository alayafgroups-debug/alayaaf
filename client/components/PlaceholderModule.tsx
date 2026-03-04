import Layout from "./Layout";
import { LucideIcon, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

        {/* Features Dropdown Section */}
        <div className="mb-8 flex items-end gap-4">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary-700 active:bg-primary-800"
            >
              الميزات المخطط لها
              <ChevronDown
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 origin-top-right rounded-lg border border-border bg-card shadow-lg z-50 animate-fade-in">
                <div className="p-4">
                  <h3 className="mb-4 font-semibold text-foreground text-sm">
                    الخيارات المتاحة
                  </h3>
                  <ul className="space-y-3">
                    {features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 rounded-lg p-2 hover:bg-secondary transition-colors cursor-pointer group"
                      >
                        <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0 group-hover:bg-primary-700" />
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
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
    </Layout>
  );
}
