import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  FileText,
  ShoppingCart,
  Users,
  DollarSign,
  CreditCard,
  Menu,
  X,
  Home,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: Home, label: "الرئيسية", href: "/" },
    { icon: BarChart3, label: "لوحة التحكم", href: "/dashboard" },
    { icon: FileText, label: "المبيعات", href: "/sales" },
    { icon: ShoppingCart, label: "المشتريات", href: "/purchases" },
    { icon: Users, label: "الموارد البشرية", href: "/hr" },
    { icon: CreditCard, label: "إدارة العملاء", href: "/crm" },
    { icon: DollarSign, label: "إدارة الضرائب", href: "/tax" },
    { icon: Settings, label: "الإعدادات", href: "/settings" },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 hover:bg-sidebar-accent"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Logo Area */}
        <Link
          to="/"
          className={cn(
            "flex items-center gap-3 border-b border-sidebar-border px-4 py-4 transition-all duration-300",
            !sidebarOpen && "flex-col"
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            نظ
          </div>
          {sidebarOpen && (
            <span className="text-sm font-semibold text-sidebar-foreground">
              نظام الفواتير
            </span>
          )}
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200",
                  isActive(item.href)
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                title={item.label}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-card">
          <div className="flex h-16 items-center justify-between px-8">
            <h1 className="text-xl font-semibold text-foreground">
              نظام الفواتير الإلكترونية المتكامل
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("ar-SA")}
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
