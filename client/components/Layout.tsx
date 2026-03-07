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
  LogOut,
  Bell,
  Search,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  subMenu?: { title: string; items: { label: string; href?: string }[] } | null;
}

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
    { label: "لوحة التحكم", href: "/hr/dashboard" },
    { label: "الموظفون", href: "/hr/employees" },
    { label: "الحضور والانصراف", href: "/hr/attendance" },
    { label: "مسير الرواتب", href: "/hr/payroll" },
    { label: "السلف", href: "/hr/advances" },
    { label: "شهادات الخبرة", href: "/hr/certificates" },
    { label: "تقارير الموارد البشرية", href: "/hr/reports" },
    { label: "إعدادات الموارد البشرية", href: "/hr/settings" },
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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "relative flex flex-col flex-shrink-0 h-full transition-all duration-300",
          "bg-[hsl(224,71%,12%)] text-white shadow-2xl",
          sidebarOpen ? "w-[270px]" : "w-[72px]"
        )}
      >
        {/* decorative gradient orb */}
        <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 -right-16 h-40 w-40 rounded-full bg-secondary/15 blur-3xl" />

        {/* Logo + Toggle */}
        <div className="relative z-10 flex h-[72px] items-center justify-between px-4 border-b border-white/[0.08]">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white font-bold text-sm shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
              LX
            </div>
            {sidebarOpen && (
              <span className="text-[13px] font-bold text-white/90 leading-tight">
                شركة لاكجري العياف
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = isActive(item.href);
            const isExpanded = expandedMenu === item.href && item.hasSubmenu;
            const subItems = navSubMenus[item.href];

            return (
              <div key={item.href}>
                {item.hasSubmenu ? (
                  <button
                    onClick={() =>
                      setExpandedMenu(expandedMenu === item.href ? null : item.href)
                    }
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                      isItemActive
                        ? "bg-white/[0.12] text-white shadow-sm"
                        : "text-white/60 hover:bg-white/[0.07] hover:text-white/90"
                    )}
                    title={item.label}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors flex-shrink-0",
                        isItemActive
                          ? "bg-primary/80 text-white shadow-sm shadow-primary/30"
                          : "bg-white/[0.06] text-white/50"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-right">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200 text-white/40",
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
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                      isItemActive
                        ? "bg-white/[0.12] text-white shadow-sm"
                        : "text-white/60 hover:bg-white/[0.07] hover:text-white/90"
                    )}
                    title={item.label}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors flex-shrink-0",
                        isItemActive
                          ? "bg-primary/80 text-white shadow-sm shadow-primary/30"
                          : "bg-white/[0.06] text-white/50"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                )}

                {/* Submenu */}
                {isExpanded && sidebarOpen && subItems && (
                  <div className="mt-1 mr-5 space-y-0.5 border-r border-white/[0.1] pr-0.5 animate-fade-in">
                    {subItems.map((subItem, index) => (
                      <button
                        key={index}
                        onClick={() => navigate(subItem.href)}
                        className={cn(
                          "w-full text-right flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-lg transition-colors duration-150",
                          location.pathname === subItem.href
                            ? "text-white bg-primary/60"
                            : "text-white/45 hover:text-white/80 hover:bg-white/[0.05]"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full flex-shrink-0",
                            location.pathname === subItem.href
                              ? "bg-white"
                              : "bg-white/30"
                          )}
                        />
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom user area */}
        {sidebarOpen && (
          <div className="relative z-10 border-t border-white/[0.08] p-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-[11px] font-bold text-white">
                م
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white/90 truncate">مدير النظام</p>
                <p className="text-[11px] text-white/40 truncate">admin@luxury-ayaf.com</p>
              </div>
              <button className="text-white/30 hover:text-white/70 transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 h-[72px] flex items-center justify-between px-8 bg-white/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-foreground">
              شركة لاكجري العياف
            </h1>
            <span className="hidden sm:inline-block h-5 w-px bg-border/70" />
            <span className="hidden sm:inline-block text-xs text-muted-foreground font-medium">
              نظام إدارة الأعمال المتكامل
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <button className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground hover:bg-muted/70 transition-colors">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">بحث...</span>
            </button>
            {/* Notifications */}
            <button className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-muted/60 transition-colors">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse-soft" />
            </button>
            {/* Date */}
            <div className="hidden lg:flex items-center gap-2 rounded-xl bg-muted/40 px-3.5 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                {new Date().toLocaleDateString("ar-SA", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}
