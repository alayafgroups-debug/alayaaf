import { ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  FileText,
  ShoppingCart,
  Users,
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
  Crown,
  Receipt,
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
    { label: "إشعار دائن", href: "/sales/credit-note" },
    { label: "إشعار تسليم", href: "/sales/delivery-note" },
    { label: "سندات العملاء (قبض)", href: "/expenses/petty-cash" },
  ],
  "/purchases": [
    { label: "فواتير المشتريات", href: "/purchases/invoices" },
    { label: "سندات الموردين", href: "/purchases/vendor-vouchers" },
    { label: "مصروفات نقدية", href: "/purchases/cash-expenses" },
    { label: "إشعارات مدينة", href: "/purchases/debit-notes" },
    { label: "أوامر الشراء", href: "/purchases/orders" },
    { label: "تقارير المشتريات الشاملة", href: "/purchases/reports" },
  ],
  "/hr": [
    { label: "لوحة التحكم", href: "/hr/dashboard" },
    { label: "الموظفون", href: "/hr/employees" },
    { label: "الموظفون المتعاونون", href: "/hr/employees/cooperative" },
    { label: "الموظفون غير الفعالين", href: "/hr/employees/inactive" },
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
  "/expenses": [
    { label: "شجرة الحسابات", href: "/expenses" },
    { label: "حساب الضرائب", href: "/expenses/tax" },
    { label: "تقارير ضريبية", href: "/expenses/tax-reports" },
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

/* ── Per-item accent colors for active state ── */
const itemColors: Record<string, { icon: string; active: string; glow: string; dot: string; text: string; subBg: string; border: string }> = {
  "/":          { icon: "from-sky-400 to-blue-600",      active: "bg-sky-500/15 border-sky-500/25",      glow: "shadow-sky-500/20",      dot: "bg-sky-400",      text: "text-sky-300",      subBg: "bg-sky-500/[0.06]",      border: "border-sky-400/20" },
  "/sales":     { icon: "from-blue-400 to-indigo-600",   active: "bg-blue-500/15 border-blue-500/25",    glow: "shadow-blue-500/20",     dot: "bg-blue-400",     text: "text-blue-300",     subBg: "bg-blue-500/[0.06]",     border: "border-blue-400/20" },
  "/purchases": { icon: "from-violet-400 to-purple-600", active: "bg-violet-500/15 border-violet-500/25",glow: "shadow-violet-500/20",   dot: "bg-violet-400",   text: "text-violet-300",   subBg: "bg-violet-500/[0.06]",   border: "border-violet-400/20" },
  "/hr":        { icon: "from-emerald-400 to-teal-600",  active: "bg-emerald-500/15 border-emerald-500/25",glow: "shadow-emerald-500/20",dot: "bg-emerald-400",  text: "text-emerald-300",  subBg: "bg-emerald-500/[0.06]",  border: "border-emerald-400/20" },
  "/crm":       { icon: "from-amber-400 to-orange-600",  active: "bg-amber-500/15 border-amber-500/25",  glow: "shadow-amber-500/20",   dot: "bg-amber-400",    text: "text-amber-300",    subBg: "bg-amber-500/[0.06]",    border: "border-amber-400/20" },
  "/expenses":  { icon: "from-green-400 to-emerald-600", active: "bg-green-500/15 border-green-500/25",  glow: "shadow-green-500/20",   dot: "bg-green-400",    text: "text-green-300",    subBg: "bg-green-500/[0.06]",    border: "border-green-400/20" },
  "/users":     { icon: "from-cyan-400 to-teal-600",     active: "bg-cyan-500/15 border-cyan-500/25",    glow: "shadow-cyan-500/20",    dot: "bg-cyan-400",     text: "text-cyan-300",     subBg: "bg-cyan-500/[0.06]",     border: "border-cyan-400/20" },
  "/ai":        { icon: "from-fuchsia-400 to-purple-600",active: "bg-fuchsia-500/15 border-fuchsia-500/25",glow: "shadow-fuchsia-500/20",dot: "bg-fuchsia-400", text: "text-fuchsia-300",  subBg: "bg-fuchsia-500/[0.06]",  border: "border-fuchsia-400/20" },
  "/settings":  { icon: "from-slate-400 to-gray-600",    active: "bg-slate-500/15 border-slate-500/25",  glow: "shadow-slate-500/20",   dot: "bg-slate-400",    text: "text-slate-300",    subBg: "bg-slate-500/[0.06]",    border: "border-slate-400/20" },
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
    { icon: Receipt, label: "المحاسبة والمالية", href: "/expenses", hasSubmenu: true },
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
          "relative flex flex-col flex-shrink-0 h-full transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-[270px]" : "w-[72px]"
        )}
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #1a1f3a 40%, #15203a 100%)",
        }}
      >
        {/* Decorative ambient lights */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-blue-500/[0.08] blur-[80px]" />
        <div className="pointer-events-none absolute top-1/3 -right-20 h-40 w-40 rounded-full bg-violet-500/[0.06] blur-[60px]" />
        <div className="pointer-events-none absolute bottom-20 -left-16 h-36 w-36 rounded-full bg-cyan-500/[0.05] blur-[60px]" />

        {/* ── Logo area ── */}
        <div className="relative z-10 px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-white font-extrabold text-sm shadow-xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-105">
                <Crown className="h-5 w-5" />
                {/* shine effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent opacity-60" />
              </div>
              {sidebarOpen && (
                <div className="flex flex-col">
                  <span className="text-[14px] font-extrabold text-white tracking-tight leading-tight">
                    لاكجري العياف
                  </span>
                  <span className="text-[10px] font-medium text-blue-300/60 tracking-wide">
                    LUXURY AL AYAF
                  </span>
                </div>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-xl p-2 text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative z-10 mx-4 h-px bg-gradient-to-l from-transparent via-white/[0.08] to-transparent" />

        {/* ── Navigation ── */}
        <nav className="relative z-10 flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
          {sidebarOpen && (
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
              القائمة الرئيسية
            </p>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = isActive(item.href);
            const isExpanded = expandedMenu === item.href && item.hasSubmenu;
            const subItems = navSubMenus[item.href];
            const colors = itemColors[item.href] || itemColors["/"];

            const btnContent = (
              <>
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 flex-shrink-0",
                    isItemActive
                      ? cn("bg-gradient-to-br text-white shadow-lg", colors.icon, colors.glow)
                      : "bg-white/[0.04] text-white/40 group-hover:bg-white/[0.08] group-hover:text-white/70"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                {sidebarOpen && (
                  <>
                    <span className={cn(
                      "flex-1 text-right transition-colors duration-200",
                      isItemActive ? "text-white font-semibold" : ""
                    )}>
                      {item.label}
                    </span>
                    {item.hasSubmenu && (
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-300 text-white/25",
                          isExpanded && "rotate-180 text-white/50"
                        )}
                      />
                    )}
                  </>
                )}
              </>
            );

            const baseClass = cn(
              "group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 border border-transparent",
              isItemActive
                ? cn("text-white", colors.active)
                : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
            );

            return (
              <div key={item.href}>
                {item.hasSubmenu ? (
                  <button
                    onClick={() =>
                      setExpandedMenu(expandedMenu === item.href ? null : item.href)
                    }
                    className={baseClass}
                    title={item.label}
                  >
                    {btnContent}
                  </button>
                ) : (
                  <Link to={item.href} className={baseClass} title={item.label}>
                    {btnContent}
                  </Link>
                )}

                {/* Submenu */}
                {isExpanded && sidebarOpen && subItems && (
                  <div className={cn(
                    "mt-1.5 mr-4 ml-2 rounded-xl p-1.5 space-y-0.5 animate-fade-in border",
                    colors.subBg, colors.border
                  )}>
                    {subItems.map((subItem, index) => {
                      const isSubActive = location.pathname === subItem.href;
                      return (
                        <button
                          key={index}
                          onClick={() => navigate(subItem.href)}
                          className={cn(
                            "w-full text-right flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-200",
                            isSubActive
                              ? cn("text-white", colors.active)
                              : cn("hover:bg-white/[0.05]", colors.text, "opacity-60 hover:opacity-100")
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full flex-shrink-0 transition-all duration-200",
                              isSubActive
                                ? cn("h-2 w-2 shadow-sm", colors.dot, colors.glow)
                                : cn(colors.dot, "opacity-40")
                            )}
                          />
                          <span>{subItem.label}</span>
                          {isSubActive && (
                            <span className={cn("mr-auto h-1 w-5 rounded-full bg-gradient-to-l opacity-60", colors.icon)} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="relative z-10 mx-4 h-px bg-gradient-to-l from-transparent via-white/[0.06] to-transparent" />

        {/* ── Bottom user area ── */}
        <div className="relative z-10 p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-300",
              "bg-gradient-to-l from-white/[0.04] to-white/[0.02] border border-white/[0.06]",
              !sidebarOpen && "justify-center px-0"
            )}
          >
            <div className="relative flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-[12px] font-bold text-white shadow-md shadow-blue-500/20">
                م
              </div>
              {/* online dot */}
              <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-[#1a1f3a] bg-emerald-400" />
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-white/90 truncate">مدير النظام</p>
                  <p className="text-[10px] text-white/30 truncate">admin@luxury-ayaf.com</p>
                </div>
                <button className="rounded-lg p-1.5 text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 h-[68px] flex items-center justify-between px-8 bg-white/80 backdrop-blur-xl border-b border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-4">
            <h1 className="text-[16px] font-extrabold text-foreground">
              شركة لاكجري العياف
            </h1>
            <span className="hidden sm:inline-block h-5 w-px bg-border/60" />
            <span className="hidden sm:inline-block text-[11px] text-muted-foreground font-bold">
              نظام إدارة الأعمال المتكامل
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2 text-[11px] text-muted-foreground hover:bg-muted/60 transition-colors">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">بحث...</span>
            </button>
            <button className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-muted/50 transition-colors">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse-soft" />
            </button>
            <div className="hidden lg:flex items-center gap-2 rounded-xl bg-muted/30 px-3.5 py-2">
              <span className="text-[11px] font-medium text-muted-foreground">
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
