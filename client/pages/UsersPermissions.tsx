import { ShieldCheck } from "lucide-react";
import Layout from "@/components/Layout";
import { useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";

const users = [
  {
    id: 1,
    name: "عبد الرحمن عبد الرحمن الغامدي",
    email: "acct@demo.com",
    role: "Accounting",
    company: "Kore Holding Company",
    status: "نشط",
  },
  {
    id: 2,
    name: "مها عبد الرحمن العتيبي",
    email: "admin@demo.com",
    role: "Administrator",
    company: "Kore Holding Company",
    status: "نشط",
  },
  {
    id: 3,
    name: "سارة الحازمي",
    email: "hr@demo.com",
    role: "HR",
    company: "Kore Holding Company",
    status: "نشط",
  },
  {
    id: 4,
    name: "عبد العزيز عبدالله السالم",
    email: "sales@demo.com",
    role: "Sales",
    company: "Kore Holding Company",
    status: "نشط",
  },
  {
    id: 5,
    name: "ليان أحمد الشمري",
    email: "support@demo.com",
    role: "Support",
    company: "Kore Holding Company",
    status: "نشط",
  },
];

const summaryCards = [
  {
    title: "إجمالي المستخدمين",
    value: "5",
    icon: Users,
    color: "bg-sky-500",
  },
  {
    title: "المستخدمون النشطون",
    value: "5",
    icon: UserCheck,
    color: "bg-emerald-600",
  },
  {
    title: "المستخدمون غير النشطين",
    value: "0",
    icon: UserX,
    color: "bg-amber-500",
  },
  {
    title: "أدوار النظام",
    value: "5",
    icon: ShieldCheck,
    color: "bg-blue-600",
  },
];

export default function UsersPermissions() {
  const location = useLocation();
  const isRoles = location.pathname.includes("/users/roles");
  const isAudit = location.pathname.includes("/users/audit");
  const title = isRoles
    ? "إدارة الأدوار"
    : isAudit
      ? "سجل التدقيق"
      : "إدارة المستخدمين";
  const description = isRoles
    ? "تحديد الصلاحيات والمسؤوليات لكل دور."
    : isAudit
      ? "متابعة سجل التدقيق والعمليات المنفذة."
      : "إدارة بيانات المستخدمين والوصول للنظام.";

  return (
    <Layout
      subMenu={{
        title: "المستخدمين والصلاحيات",
        items: [
          { label: "إدارة المستخدمين", href: "/users" },
          { label: "إدارة الأدوار", href: "/users/roles" },
          { label: "سجل التدقيق", href: "/users/audit" },
        ],
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            إضافة مستخدم جديد
          </button>
        </div>

        {!isRoles && !isAudit && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="erp-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {card.title}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {card.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${card.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isAudit ? (
          <div className="erp-card">
            <h3 className="text-lg font-semibold text-foreground">
              سجل التدقيق
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              يتم تسجيل جميع العمليات الحساسة هنا مع معلومات المستخدم والوقت.
            </p>
          </div>
        ) : isRoles ? (
          <div className="erp-card">
            <h3 className="text-lg font-semibold text-foreground">إدارة الأدوار</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              قم بتحديث الصلاحيات الممنوحة لكل دور حسب احتياج العمل.
            </p>
          </div>
        ) : (
          <div className="erp-card">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="ابحث باسم المستخدم أو البريد"
                  className="w-full rounded-lg border border-border bg-background px-9 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>الدور</option>
                  <option>Accounting</option>
                  <option>Administrator</option>
                  <option>HR</option>
                </select>
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>الحالة</option>
                  <option>نشط</option>
                  <option>غير نشط</option>
                </select>
                <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                  <Filter className="h-4 w-4" />
                  تصفية متقدمة
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-4 py-3 text-right font-semibold">#</th>
                    <th className="px-4 py-3 text-right font-semibold">المستخدم</th>
                    <th className="px-4 py-3 text-right font-semibold">البريد الإلكتروني</th>
                    <th className="px-4 py-3 text-right font-semibold">الدور</th>
                    <th className="px-4 py-3 text-right font-semibold">الشركة</th>
                    <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                    <th className="px-4 py-3 text-right font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.id}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.company}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
