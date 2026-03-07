import { ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  FileText,
  ShoppingCart,
  Users,
  DollarSign,
  CreditCard,
  ShieldCheck,
  Bot,
  Menu,
  X,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  subMenu?: { title: string; items: { label: string; href?: string }[] } | null;
}

// Static submenu definitions for each main section
const navSubMenus: Record<string, { label: string; href: string }[]> = {
  "/sales": [
    { label: "عروض الأسعار", href: "/sales/quotations" },
    { label: "أوامر البيع", href: "/sales/orders" },
    { label: "فواتير المبيعات", href: "/sales/invoices" },
  ],
  "/purchases": [
    { label: "طلبات الشراء", href: "/purchases/requests" },
    { label: "أوامر الشراء", href: "/purchases/orders" },
    { label: "سندات الاستلام", href: "/purchases/receipts" },
    { label: "فواتير المشتريات", href: "/purchases/invoices" },
    { label: "مردودات المشتريات", href: "/purchases/returns" },
    { label: "تقارير المشتريات الشاملة", href: "/purchases/reports" },
  ],
  "/hr": [
    { label: "بيانات الموظفين", href: "/hr" },
    { label: "إدارة الرواتب", href: "/hr" },
    { label: "الحضور والانصراف", href: "/hr" },
    { label: "الإجازات والغيابات", href: "/hr" },
  ],
  "/crm": [
    { label: "العملاء", href: "/crm/customers" },
    { label: "الموردين", href: "/crm/vendors" },
    { label: "التقارير", href: "/crm/reports" },
  ],
  "/tax": [
    { label: "حساب الضرائب", href: "/tax" },
    { label: "تقارير ضريبية", href: "/tax" },
    { label: "الامتثال لـ ZATCA", href: "/tax" },
  ],
  "/users": [
    { label: "المستخدمون", href: "/users" },
    { label: "الأدوار والصلاحيات", href: "/users/roles" },
    { label: "سجل النشاط", href: "/users/audit" },
  ],
  "/ai": [
    { label: "المساعد الذكي", href: "/ai/assistant" },
  ],
};

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  const navItems = [
    { icon: BarChart3, label: "لوحة التحكم", href: "/" },
    { icon: FileText, label: "المبيعات", href: "/sales", hasSubmenu: true },
    { icon: ShoppingCart, label: "المشتريات", href: "/purchases", hasSubmenu: true },
    { icon: Users, label: "الموارد البشرية", href: "/hr", hasSubmenu: true },
    { icon: CreditCard, label: "العملاء والموردين", href: "/crm", hasSubmenu: true },
    { icon: DollarSign, label: "إدارة الضرائب", href: "/tax", hasSubmenu: true },
    { icon: ShieldCheck, label: "المستخدمين والصلاحيات", href: "/users", hasSubmenu: true },
    { icon: Bot, label: "الذكاء الاصطناعي", href: "/ai", hasSubmenu: true },
    { icon: Settings, label: "الإعدادات", href: "/settings" },
  ];

  // Auto-expand menu when navigating to a page with submenu
  useEffect(() => {
    const currentPath = location.pathname;
    navItems.forEach((item) => {
      if (
        currentPath.startsWith(item.href) &&
        item.href !== "/" &&
        item.hasSubmenu
      ) {
        setExpandedMenu(item.href);
      }
    });
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col flex-shrink-0 h-full border-r border-sidebar-border bg-sidebar/95 shadow-lg transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border/70 px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 transition hover:bg-sidebar-accent/70"
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
            نظ
          </div>
          {sidebarOpen && (
            <span className="text-sm font-semibold text-sidebar-foreground">
              نظام الفواتير
            </span>
          )}
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = isActive(item.href);
            const isExpanded = expandedMenu === item.href && item.hasSubmenu;
            const subItems = navSubMenus[item.href];

            return (
              <div key={item.href}>
                {item.hasSubmenu ? (
                  <button
                    onClick={() => {
                      // Only toggle submenu - never navigate to main section page
                      setExpandedMenu(
                        expandedMenu === item.href ? null : item.href
                      );
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                      isItemActive
                        ? "bg-sidebar-accent/80 text-sidebar-primary shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-primary"
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
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                      isItemActive
                        ? "bg-sidebar-accent/80 text-sidebar-primary shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-primary"
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                )}

                {/* Submenu - shows when expanded, no need to be on main route */}
                {isExpanded && sidebarOpen && subItems && (
                  <div className="mt-2 ml-4 border-r-2 border-sidebar-primary space-y-1">
                    {subItems.map((subItem, index) => (
                      <button
                        key={index}
                        onClick={() => navigate(subItem.href)}
                        className={cn(
                          "w-full text-right flex items-start gap-2 px-4 py-2 text-xs font-medium rounded transition-colors duration-200",
                          location.pathname === subItem.href
                            ? "text-sidebar-primary bg-sidebar-accent"
                            : "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary flex-shrink-0 mt-1" />
                        <span>{subItem.label}</span>
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
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border/60 bg-card/90 backdrop-blur">
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
