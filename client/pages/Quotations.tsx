import { useState } from "react";
import Layout from "@/components/Layout";
import { salesFeatures } from "./Sales";
import {
  Plus,
  Search,
  X,
  Trash2,
  MoreVertical,
  ArrowLeftRight,
  Edit,
  Eye,
  Printer,
  FileText,
  Ban,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data
const mockQuotations = [
  {
    id: "QUO-000014",
    date: "11/02/2026",
    validity: "12/03/2026",
    customer: "moga",
    total: "SAR 220.80",
    status: "مفتوح",
    statusColor: "bg-cyan-500 text-white",
  },
  {
    id: "QUO-000011",
    date: "10/02/2026",
    validity: "12/03/2026",
    customer: "ahmed",
    total: "SAR 5.75",
    status: "مغلق",
    subStatus: "محول لأمر بيع",
    statusColor: "bg-green-600 text-white",
    subStatusColor: "bg-blue-600 text-white",
  },
  {
    id: "QUO-000012",
    date: "10/02/2026",
    validity: "12/03/2026",
    customer: "ahmed",
    total: "SAR 57.50",
    status: "مفتوح",
    statusColor: "bg-cyan-500 text-white",
  },
  {
    id: "QUO-000013",
    date: "10/02/2026",
    validity: "12/03/2026",
    customer: "ahmed",
    total: "SAR 57.50",
    status: "مفتوح",
    statusColor: "bg-cyan-500 text-white",
  },
  {
    id: "QUO-000010",
    date: "28/01/2026",
    validity: "27/02/2026",
    customer: "-",
    total: "SAR 575.00",
    status: "مغلق",
    subStatus: "محول لفاتورة",
    statusColor: "bg-green-600 text-white",
    subStatusColor: "bg-yellow-500 text-white",
  },
];

export default function Quotations() {
  const [view, setView] = useState<"list" | "create">("list");

  return (
    <Layout subMenu={{ title: "المبيعات", items: salesFeatures }}>
      <div className="mx-auto max-w-7xl">
        {view === "list" ? (
          <QuotationsList onCreateClick={() => setView("create")} />
        ) : (
          <QuotationForm onBack={() => setView("list")} />
        )}
      </div>
    </Layout>
  );
}

function QuotationsList({ onCreateClick }: { onCreateClick: () => void }) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <h1>عروض الأسعار</h1>
        </div>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 bg-[#1b8c56] text-white px-4 py-2 rounded-md hover:bg-[#157347] transition-colors font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          إضافة عرض سعر جديد
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm text-slate-600 text-right block">
            البحث
          </label>
          <input
            type="text"
            placeholder="رقم العرض، المرجع، اسم العميل..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right"
            dir="rtl"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">
            العميل
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
        <div className="md:col-span-4 flex items-center justify-start gap-2 pt-2">
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
              <th className="px-4 py-3 font-semibold text-right">الحالة</th>
              <th className="px-4 py-3 font-semibold text-right">الإجمالي</th>
              <th className="px-4 py-3 font-semibold text-right">العميل</th>
              <th className="px-4 py-3 font-semibold text-right">
                تاريخ الصلاحية
              </th>
              <th className="px-4 py-3 font-semibold text-right">تاريخ العرض</th>
              <th className="px-4 py-3 font-semibold text-right">رقم العرض</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {mockQuotations.map((quo, i) => (
              <tr
                key={quo.id}
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
                    <button className="p-1.5 text-cyan-500 border border-cyan-200 rounded hover:bg-cyan-50 transition-colors">
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenDropdownId(
                            openDropdownId === quo.id ? null : quo.id
                          )
                        }
                        className="p-1.5 text-slate-600 border border-slate-300 rounded hover:bg-slate-100 transition-colors flex items-center"
                      >
                        <MoreVertical className="h-4 w-3" />
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {openDropdownId === quo.id && (
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
                            إلغاء العرض
                          </button>
                        </div>
                      )}
                    </div>
                    <button className="p-1.5 text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-right space-y-1">
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap",
                      quo.statusColor
                    )}
                  >
                    {quo.status === "مغلق" ? (
                      <span className="h-2 w-2 bg-white rounded-full ml-1" />
                    ) : (
                      <FileSpreadsheet className="h-3 w-3 ml-1" />
                    )}
                    {quo.status}
                  </div>
                  {quo.subStatus && (
                    <div
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap block mt-1",
                        quo.subStatusColor
                      )}
                    >
                      <ShoppingCart className="h-3 w-3 ml-1" />
                      {quo.subStatus}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                  {quo.total}
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  {quo.customer}
                </td>
                <td className="px-4 py-3 align-middle text-right text-slate-600">
                  {quo.validity}
                </td>
                <td className="px-4 py-3 align-middle text-right text-slate-600">
                  {quo.date}
                </td>
                <td className="px-4 py-3 align-middle text-right font-medium text-blue-600 hover:underline cursor-pointer">
                  {quo.id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuotationForm({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-500 text-white text-sm font-medium rounded hover:bg-slate-600 transition-colors"
          >
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
            حفظ العرض
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">
            إضافة عرض سعر جديد
          </h1>
          <Plus className="h-5 w-5 text-blue-600" />
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          العودة للقائمة
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
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">
              معلومات العرض الأساسية
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
                مرجع العرض
              </label>
              <input
                type="text"
                placeholder="أدخل مرجع العرض (اختياري)"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                العملة
              </label>
              <input
                type="text"
                value="SAR"
                disabled
                className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-center text-slate-600 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                الحالة
              </label>
              <div className="w-full px-3 py-2 border border-slate-300 rounded bg-white flex justify-center">
                <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded font-medium">
                  مفتوح
                </span>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1">
                الحالة تتغير تلقائياً
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                تاريخ الصلاحية <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                defaultValue="2026-04-04"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                تاريخ العرض <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                defaultValue="2026-03-05"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="text-sm font-medium text-slate-700 text-right block">
                العميل <span className="text-red-500">*</span>
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option value="">ابحث عن عميل...</option>
              </select>
            </div>

            <div className="space-y-1 md:col-start-4">
              <label className="text-sm font-medium text-slate-700 text-right block">
                المخزن
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option value="">اختر المخزن...</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-3">
              <label className="text-sm font-medium text-slate-700 text-right block">
                ملاحظات
              </label>
              <textarea
                rows={2}
                placeholder="أدخل ملاحظات إضافية"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <div className="w-8 h-4 bg-green-500 rounded-full flex items-center p-0.5">
                  <div className="w-3 h-3 bg-white rounded-full shadow-sm ml-auto"></div>
                </div>
                <label className="text-sm font-medium text-slate-700 text-right block">
                  مركز التكلفة
                </label>
              </div>
              <select className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option value="">اختر مركز التكلفة...</option>
              </select>
              <p className="text-xs text-amber-500 text-right mt-1">
                يرجى اختيار مركز التكلفة من القائمة أعلاه ⚠️
              </p>
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
              <h2 className="font-semibold text-slate-800">بنود العرض</h2>
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
                  <th className="pb-2 font-medium w-32">الإجمالي</th>
                  <th className="pb-2 font-medium w-48">نوع الضريبة</th>
                  <th className="pb-2 font-medium w-24">خصم</th>
                  <th className="pb-2 font-medium w-32">السعر *</th>
                  <th className="pb-2 font-medium w-24">الكمية *</th>
                  <th className="pb-2 font-medium w-32">الوحدة</th>
                  <th className="pb-2 font-medium">وصف البند *</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="pt-4 align-top">
                    <div className="flex items-center justify-end gap-2 h-10">
                      <button className="w-8 h-8 flex items-center justify-center bg-cyan-500 text-white rounded hover:bg-cyan-600">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 12H4"
                          />
                        </svg>
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="pt-4 px-1 align-top">
                    <select className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10">
                      <option>ضريبة 15% (15.0000%)</option>
                    </select>
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
                    <input
                      type="number"
                      defaultValue={1}
                      className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                    />
                  </td>
                  <td className="pt-4 px-1 align-top">
                    <select className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10 text-slate-400">
                      <option>اختر الوحدة...</option>
                    </select>
                  </td>
                  <td className="pt-4 pl-1 align-top">
                    <select className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10 text-slate-400">
                      <option>ابحث عن منتج بالاسم أو الكود...</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
            
            {/* Totals */}
            <div className="border-t border-slate-200 pt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-800">0.00 ريال</span>
                  <span className="text-slate-600">المجموع الفرعي</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-800">0.00 ريال</span>
                  <span className="text-slate-600">الخصم</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-800">0.00 ريال</span>
                  <span className="text-slate-600">الضريبة</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                  <span className="font-bold text-blue-600">0.00 ريال</span>
                  <span className="font-bold text-slate-800">الإجمالي</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ShoppingCart({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
