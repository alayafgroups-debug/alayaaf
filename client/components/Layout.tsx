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
  Settings,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  subMenu?: { title: string; items: string[] } | null;
}

export default function Layout({ children, subMenu }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: BarChart3, label: "لوحة التحكم", href: "/" },
    { icon: FileText, label: "المبيعات", href: "/sales", hasSubmenu: true },
    { icon: ShoppingCart, label: "المشتريات", href: "/purchases", hasSubmenu: true },
    { icon: Users, label: "الموارد البشرية", href: "/hr", hasSubmenu: true },
    { icon: CreditCard, label: "إدارة العملاء", href: "/crm", hasSubmenu: true },
    { icon: DollarSign, label: "إدارة الضرائب", href: "/tax", hasSubmenu: true },
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
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = isActive(item.href);
            const isExpanded = expandedMenu === item.href && item.hasSubmenu;

            return (
              <div key={item.href}>
                {item.hasSubmenu ? (
                  <button
                    onClick={() =>
                      setExpandedMenu(
                        expandedMenu === item.href ? null : item.href
                      )
                    }
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200",
                      isItemActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-right">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200",
                      isItemActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                )}

                {/* Submenu */}
                {isExpanded && sidebarOpen && subMenu && isItemActive && (
                  <div className="mt-2 ml-4 border-r-2 border-sidebar-primary space-y-1">
                    {subMenu.items.map((subItem) => (
                      <button
                        key={subItem}
                        onClick={() => {}}
                        className="w-full text-right flex items-start gap-2 px-4 py-2 text-xs font-medium text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent rounded transition-colors duration-200"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary flex-shrink-0 mt-1" />
                        <span>{subItem}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
