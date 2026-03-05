import { useState } from "react";
import Layout from "@/components/Layout";
import { purchasesFeatures } from "./Purchases";
import {
  Plus,
  Search,
  X,
  Trash2,
  Eye,
  Edit,
  Printer,
  FileText,
  Ban,
  ClipboardList,
  ChevronDown,
  Settings,
  ArrowLeftRight,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mockRequests = [
  {
    id: "PR-2026-000006",
    date: "07/02/2026",
    type: "مواد",
    department: "التسويق",
    requester: "د.يوسف فؤاد",
    section: "التسويق",
    total: "ريال 862.50",
    status: "مغلقة",
    approval: "موافق",
    statusColor: "bg-green-600 text-white",
    approvalColor: "bg-green-600 text-white",
  },
  {
    id: "PR-2026-000005",
    date: "02/02/2026",
    type: "أصول",
    department: "الإدارة المالية",
    requester: "د.يوسف فؤاد",
    section: "المشتريات",
    total: "ريال 11,902.50",
    status: "مغلقة",
    approval: "موافق",
    statusColor: "bg-green-600 text-white",
    approvalColor: "bg-green-600 text-white",
  },
  {
    id: "PR-2026-000004",
    date: "02/02/2026",
    type: "خدمات",
    department: "الإدارة المالية",
    requester: "د.يوسف فؤاد",
    section: "التسويق",
    total: "ريال 1,052.50",
    status: "مغلقة",
    approval: "موافق",
    statusColor: "bg-green-600 text-white",
    approvalColor: "bg-green-600 text-white",
  },
  {
    id: "PR-2026-000003",
    date: "02/02/2026",
    type: "أصول",
    department: "الإدارة المالية",
    requester: "د.يوسف فؤاد",
    section: "التسويق",
    total: "ريال 155,233.00",
    status: "مغلقة",
    approval: "موافق",
    statusColor: "bg-green-600 text-white",
    approvalColor: "bg-green-600 text-white",
  },
  {
    id: "PR-2026-000002",
    date: "02/02/2026",
    type: "مواد",
    department: "الإدارة المالية",
    requester: "د.يوسف فؤاد",
    section: "التسويق",
    total: "ريال 15,066.60",
    status: "مغلقة",
    approval: "موافق",
    statusColor: "bg-green-600 text-white",
    approvalColor: "bg-green-600 text-white",
  },
];

export default function PurchaseRequests() {
  const [view, setView] = useState<"list" | "create">("list");

  return (
    <Layout subMenu={{ title: "المشتريات", items: purchasesFeatures }}>
      <div className="mx-auto max-w-7xl">
        {view === "list" ? (
          <RequestsList onCreateClick={() => setView("create")} />
        ) : (
          <RequestForm onBack={() => setView("list")} />
        )}
      </div>
    </Layout>
  );
}

function RequestsList({ onCreateClick }: { onCreateClick: () => void }) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1>طلبات الشراء</h1>
        </div>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 bg-[#1b8c56] text-white px-4 py-2 rounded-md hover:bg-[#157347] transition-colors font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          إنشاء طلب شراء جديد
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">
            من تاريخ
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">
            إلى تاريخ
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">
            النوع
          </label>
          <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right bg-white appearance-none text-slate-700">
            <option>الكل</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">
            الجهة
          </label>
          <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right bg-white appearance-none text-slate-700">
            <option>الكل</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">
            الحالة
          </label>
          <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right bg-white appearance-none text-slate-700">
            <option>الكل</option>
          </select>
        </div>
        <div className="md:col-span-5 flex items-center justify-start gap-2 pt-2">
          <button className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-1.5 rounded-md hover:bg-slate-50 transition-colors text-sm">
            <X className="h-4 w-4" />
            إعادة تعيين
          </button>
          <button className="inline-flex items-center gap-2 bg-white border border-slate-300 text-primary px-6 py-1.5 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium">
            <Search className="h-4 w-4" />
            بحث
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-[#222831] text-white">
            <tr>
              <th className="px-4 py-3 font-semibold text-right">الإجراءات</th>
              <th className="px-4 py-3 font-semibold text-right">مستوى الاعتماد</th>
              <th className="px-4 py-3 font-semibold text-right">الحالة</th>
              <th className="px-4 py-3 font-semibold text-right">المجموع</th>
              <th className="px-4 py-3 font-semibold text-right">القسم</th>
              <th className="px-4 py-3 font-semibold text-right">مقدم الطلب</th>
              <th className="px-4 py-3 font-semibold text-right">الجهة</th>
              <th className="px-4 py-3 font-semibold text-right">النوع</th>
              <th className="px-4 py-3 font-semibold text-right">التاريخ</th>
              <th className="px-4 py-3 font-semibold text-right">رقم الطلب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {mockRequests.map((request, i) => (
              <tr
                key={request.id}
                className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
              >
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button className="p-1.5 text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-green-600 border border-green-200 rounded hover:bg-green-50 transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenDropdownId(
                            openDropdownId === request.id ? null : request.id
                          )
                        }
                        className="p-1.5 text-slate-600 border border-slate-300 rounded hover:bg-slate-100 transition-colors flex items-center"
                      >
                        <MoreVertical className="h-4 w-3" />
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {openDropdownId === request.id && (
                        <div className="absolute top-full mt-1 left-0 w-36 bg-white border border-slate-200 rounded shadow-lg z-10 py-1">
                          <button className="w-full px-4 py-2 text-right text-sm hover:bg-slate-50 flex items-center justify-between">
                            <Printer className="h-4 w-4 text-slate-600" />
                            طباعة
                          </button>
                          <button className="w-full px-4 py-2 text-right text-sm hover:bg-slate-50 flex items-center justify-between">
                            <FileText className="h-4 w-4 text-slate-600" />
                            PDF
                          </button>
                          <div className="h-px bg-slate-200 my-1" />
                          <button className="w-full px-4 py-2 text-right text-sm hover:bg-red-50 text-red-600 flex items-center justify-between">
                            <Ban className="h-4 w-4" />
                            إلغاء الطلب
                          </button>
                        </div>
                      )}
                    </div>
                    <button className="p-1.5 text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap",
                      request.approvalColor
                    )}
                  >
                    {request.approval}
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap",
                      request.statusColor
                    )}
                  >
                    {request.status}
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                  {request.total}
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  {request.section}
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  {request.requester}
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  {request.department}
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  {request.type}
                </td>
                <td className="px-4 py-3 align-middle text-right text-slate-600">
                  {request.date}
                </td>
                <td className="px-4 py-3 align-middle text-right font-medium text-blue-600 hover:underline cursor-pointer">
                  {request.id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestForm({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-500 text-white text-sm font-medium rounded hover:bg-slate-600 transition-colors flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            إلغاء
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            حفظ طلب الشراء
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">
            إنشاء طلب شراء جديد
          </h1>
          <ClipboardList className="h-5 w-5 text-blue-600" />
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">
              معلومات طلب الشراء الأساسية
            </h2>
            <svg
              className="h-5 w-5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                تاريخ الطلب <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                defaultValue="2026-03-05"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                نوع الطلب
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option>مواد</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                أولوية الطلب
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option>عادية</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                رقم الطلب المرجع
              </label>
              <input
                type="text"
                placeholder="رقم مرجع اختياري"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Requester Section */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">مقدم الطلب</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                اسم مقدم الطلب
              </label>
              <input
                type="text"
                placeholder="اسم مقدم الطلب"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                الجهة
              </label>
              <input
                type="text"
                placeholder="الجهة أو القسم"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                الوظيفة
              </label>
              <input
                type="text"
                placeholder="المسمى الوظيفي"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Financial Section */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">البيانات المالية</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                مركز التكلفة
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option>بدون مركز تكلفة</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                نوع التكلفة
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option>نوع تكلفة افتراضي</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                الميزانية
              </label>
              <input
                type="text"
                defaultValue="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                المبلغ المتبقي
              </label>
              <input
                type="text"
                defaultValue="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <button className="bg-[#1b8c56] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#157347] flex items-center gap-1">
              <Plus className="h-4 w-4" />
              إضافة بند
            </button>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-800">بنود طلب الشراء</h2>
              <svg
                className="h-5 w-5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right mb-4">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="pb-2 font-medium w-16 text-center"></th>
                  <th className="pb-2 font-medium w-24">المجموع</th>
                  <th className="pb-2 font-medium w-24">الضريبة</th>
                  <th className="pb-2 font-medium w-20">خصم</th>
                  <th className="pb-2 font-medium w-24">السعر *</th>
                  <th className="pb-2 font-medium w-24">الوحدة</th>
                  <th className="pb-2 font-medium w-20">الكمية *</th>
                  <th className="pb-2 font-medium">وصف البند *</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="pt-4 align-top">
                    <div className="flex items-center justify-center gap-1 h-10">
                      <button className="w-7 h-7 flex items-center justify-center bg-cyan-500 text-white rounded hover:bg-cyan-600">
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="pt-4 px-1 align-top">
                    <input
                      type="text"
                      disabled
                      className="w-full px-2 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none h-10"
                    />
                  </td>
                  <td className="pt-4 px-1 align-top">
                    <input
                      type="text"
                      defaultValue="15%"
                      className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                    />
                  </td>
                  <td className="pt-4 px-1 align-top">
                    <input
                      type="number"
                      defaultValue={0}
                      className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                    />
                  </td>
                  <td className="pt-4 px-1 align-top">
                    <input
                      type="number"
                      className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                    />
                  </td>
                  <td className="pt-4 px-1 align-top">
                    <select className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10 text-slate-400">
                      <option>اختر الوحدة...</option>
                    </select>
                  </td>
                  <td className="pt-4 px-1 align-top">
                    <input
                      type="number"
                      defaultValue={1}
                      className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                    />
                  </td>
                  <td className="pt-4 pl-1 align-top">
                    <select className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10 text-slate-400">
                      <option>ابحث عن منتج بالاسم أو الكود...</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="border-t border-slate-200 pt-4 flex justify-center mt-8">
              <div className="w-96 flex justify-between">
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">0.00 ريال</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-blue-600">0.00 ريال</span>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm text-slate-600">الضريبة</div>
                  <div className="text-sm font-bold text-slate-800">المجموع الكلي</div>
                </div>
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">0.00 ريال</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">0.00 ريال</span>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm text-slate-600">المجموع الفرعي</div>
                  <div className="text-sm text-slate-600">الخصم</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
