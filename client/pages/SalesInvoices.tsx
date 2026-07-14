import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { salesFeatures } from "./Sales";
import {
  Plus,
  Search,
  X,
  Trash2,
  ArrowLeftRight,
  Edit,
  Eye,
  Printer,
  FileText,
  CreditCard,
  Settings,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  FilterBar,
  FilterInput,
  FilterSelect,
  FilterActions,
  DataTable,
  ActionBtn,
} from "@/components/SalesPageUI";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

const COMPANY_LOGO_URL =
  "https://cdn.builder.io/api/v1/image/assets%2Fce04605038104603b965d31c7c18e8db%2Ff22198e2793344a8afcb99b315ddbc49?format=webp&width=800&height=1200";

const statusColors: Record<string, string> = {
  "مدفوعة بالكامل": "bg-green-600 text-white",
  "مدفوعة جزئياً": "bg-yellow-500 text-white",
  "مفتوحة": "bg-cyan-500 text-white",
};

const parseCurrency = (value: string) =>
  Number(value.replace(/[^0-9.]/g, "")) || 0;

const initialInvoices: Invoice[] = [];

type Invoice = {
  id: string;
  date: string;
  dueDate: string;
  customer: string;
  customerAddress: string;
  total: string;
  paid: string;
  remaining: string;
  status: string;
  statusColor: string;
};

export default function SalesInvoices() {
  const [view, setView] = useState<"list" | "create" | "details" | "edit" | "payment">("list");
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      const { data, error } = await supabase
        .from("sales_invoices")
        .select("*")
        .order("date", { ascending: false });

      if (!error && data) {
        const mapped = data.map((row) => ({
          id: row.id ?? "",
          date: row.date ?? "",
          dueDate: row.due_date ?? row.dueDate ?? "",
          customer: row.customer ?? "",
          customerAddress: String(row.customer_address ?? localStorage.getItem(`sales-invoice-address-${row.id}`) ?? ""),
          total: row.total ?? "",
          paid: row.paid ?? "",
          remaining: row.remaining ?? "",
          status: row.status ?? "مفتوحة",
          statusColor: statusColors[row.status ?? "مفتوحة"] ??
            "bg-slate-500 text-white",
        }));
        setInvoices(mapped);
      }
    };

    loadInvoices();
  }, []);

  const handleSaved = (invoice: Invoice) => {
    setInvoices((prev) => [invoice, ...prev]);
  };

  const handleUpdate = (updated: Invoice) => {
    setInvoices((prev) =>
      prev.map((invoice) => (invoice.id === updated.id ? updated : invoice))
    );
  };

  const handleDelete = async (invoiceId: string) => {
    const { error } = await supabase
      .from("sales_invoices")
      .delete()
      .eq("id", invoiceId);

    if (!error) {
      setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));
      toast({ title: "تم حذف الفاتورة", description: `الفاتورة: ${invoiceId}` });
    } else {
      toast({ title: "تعذر حذف الفاتورة", description: "يرجى المحاولة لاحقاً" });
    }
  };

  const handleDownloadPdf = (invoice: Invoice) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const escapeHtml = (value: string) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const stored = localStorage.getItem(`sales-invoice-items-${invoice.id}`);
    const parsedItems = stored
      ? (JSON.parse(stored) as Array<{
          id: number;
          description: string;
          quantity: number;
          unitPrice: number;
          discount: number;
          taxPercent: number;
        }>)
      : [];

    const fallbackTotal = parseCurrency(invoice.total);
    const lineItems =
      parsedItems.length > 0
        ? parsedItems
        : [
            {
              id: 1,
              description: "-",
              quantity: 1,
              unitPrice: fallbackTotal / 1.15,
              discount: 0,
              taxPercent: 15,
            },
          ];

    const rows = lineItems.map((item, idx) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const discount = Number(item.discount) || 0;
      const taxPercent = Number(item.taxPercent) || 0;
      const taxable = qty * price - discount;
      const vat = (taxable * taxPercent) / 100;
      const total = taxable + vat;
      return {
        idx: idx + 1,
        description: item.description || "-",
        qty,
        price,
        taxable,
        vat,
        taxPercent,
        total,
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.taxable += row.taxable;
        acc.vat += row.vat;
        acc.total += row.total;
        return acc;
      },
      { taxable: 0, vat: 0, total: 0 }
    );

    const rowsHtml = rows
      .map(
        (row) => `
          <tr>
            <td>${row.idx}</td>
            <td>${escapeHtml(row.description)}</td>
            <td>${row.qty}</td>
            <td>${row.price.toFixed(2)}</td>
            <td>${row.taxable.toFixed(2)}</td>
            <td>${row.vat.toFixed(2)}<div class="vat-rate">${row.taxPercent}%</div></td>
            <td>${row.total.toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>فاتورة ${escapeHtml(invoice.id)}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            html, body { width: 210mm; min-height: 297mm; }
            body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
            .sheet { width: 190mm; max-width: 190mm; margin: 0 auto; background: #fff; }
            @media print { html, body { width: 210mm; } .sheet { width: 190mm; max-width: 190mm; } }
            .head { border: 1px solid #d1d5db; padding: 10px 12px; }
            .company-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; }
            .company-ar, .company-en { font-size: 11px; line-height: 1.5; }
            .company-ar { text-align: right; }
            .company-en { text-align: left; }
            .company-logo { width: 120px; height: 72px; object-fit: contain; display: block; margin: 0 auto; }
            .title { text-align: center; font-size: 24px; font-weight: 700; margin: 8px 0 10px; }
            .meta { border: 1px solid #d1d5db; font-size: 12px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; }
            .meta-cell { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
            .meta-grid .meta-cell:nth-child(odd) { border-left: 1px solid #e5e7eb; }
            .meta-cell .row { display: flex; justify-content: space-between; gap: 8px; }
            .meta-cell .label { color: #4b5563; }
            .meta-cell .value { font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 7px 6px; text-align: center; vertical-align: middle; }
            th { background: #f3f4f6; font-weight: 700; }
            .vat-rate { font-size: 10px; color: #6b7280; margin-top: 2px; }
            .bottom { display: grid; grid-template-columns: 1fr 300px; gap: 14px; margin-top: 12px; align-items: start; }
            .qr-note { display: flex; align-items: center; gap: 10px; }
            .qr-box { width: 96px; height: 96px; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #6b7280; }
            .qr-text { font-size: 10px; color: #6b7280; line-height: 1.5; }
            .notes { margin-top: 8px; font-size: 11px; line-height: 1.6; }
            .totals { font-size: 13px; border-top: 1px solid #d1d5db; padding-top: 6px; }
            .totals .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .totals .final { font-weight: 700; font-size: 14px; }
            .bank { margin-top: 10px; border-top: 1px solid #d1d5db; padding-top: 8px; font-size: 11px; line-height: 1.7; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="head">
              <div class="company-row">
                <div class="company-ar">
                  <strong>شركة لاكجري العياف</strong><br />
                  8529 الشيخ محمد بن جبير، الشوقية، مكة المكرمة، المملكة العربية السعودية 24351<br />
                  رقم التسجيل الضريبي 314559705300003<br />
                  رقم السجل التجاري 7053358979
                </div>
                <img src="${COMPANY_LOGO_URL}" class="company-logo" alt="شعار الشركة" />
                <div class="company-en">
                  <strong>Luxury Al Ayaf company</strong><br />
                  8529, Sheikh Muhammad Ibn Jabeer, Ash Shawqiyah, Mecca, 24351, Kingdom of Saudi Arabia<br />
                  VAT number 314559705300003<br />
                  CR Number 7053358979
                </div>
              </div>

              <div class="title">فاتورة ضريبية Tax Invoice</div>

              <div class="meta">
                <div class="meta-grid">
                  <div class="meta-cell">
                    <div class="row"><span class="label">العميل</span><span class="value">${escapeHtml(invoice.customer)}</span></div>
                    <div class="row"><span class="label">العنوان الوطني</span><span class="value">${escapeHtml(invoice.customerAddress || "-")}</span></div>
                    <div class="row"><span class="label">الهاتف</span><span class="value">0507089850</span></div>
                    <div class="row"><span class="label">رقم التسجيل الضريبي</span><span class="value">312731286200003</span></div>
                  </div>
                  <div class="meta-cell">
                    <div class="row"><span class="label">رقم الفاتورة</span><span class="value">${escapeHtml(invoice.id)}</span></div>
                    <div class="row"><span class="label">التاريخ</span><span class="value">${escapeHtml(invoice.date)}</span></div>
                    <div class="row"><span class="label">تاريخ الاستحقاق</span><span class="value">${escapeHtml(invoice.dueDate)}</span></div>
                    <div class="row"><span class="label">الحالة</span><span class="value">${escapeHtml(invoice.status)}</span></div>
                  </div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الوصف<br/>Description</th>
                    <th>الكمية<br/>Qty</th>
                    <th>السعر<br/>Price</th>
                    <th>المبلغ الخاضع للضريبة<br/>Taxable amount</th>
                    <th>المبلغ المضافة<br/>VAT amount</th>
                    <th>المجموع<br/>Line amount</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>

              <div class="bottom">
                <div>
                  <div class="qr-note">
                    <div class="qr-box">QR</div>
                    <div class="qr-text">تم ترميز هذا الرمز وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك للفوترة الإلكترونية</div>
                  </div>
                  <div class="notes">
                    <strong>ملاحظات</strong><br/>
                    بيانات الحساب البنكي:<br/>
                    اسم المستفيد: شركة لاكجري العياف<br/>
                    رقم الحساب: 1575917249940<br/>
                    رقم الايبان: SA3520000001575917249940<br/>
                    بنك الرياض
                  </div>
                </div>
                <div class="totals">
                  <div class="row"><span>المجموع الفرعي Subtotal</span><strong>${totals.taxable.toFixed(2)} ﷼</strong></div>
                  <div class="row"><span>إجمالي ضريبة القيمة المضافة Total VAT</span><strong>${totals.vat.toFixed(2)} ﷼</strong></div>
                  <div class="row final"><span>المجموع شامل القيمة المضافة Total</span><strong>${totals.total.toFixed(2)} ﷼</strong></div>
                </div>
              </div>

              <div class="bank">
                المدفوع: ${escapeHtml(invoice.paid)}<br/>
                المتبقي: ${escapeHtml(invoice.remaining)}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    let hasPrinted = false;
    const triggerPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      printWindow.focus();
      printWindow.print();
    };
    const logo = printWindow.document.querySelector(".company-logo") as HTMLImageElement | null;
    if (logo && !logo.complete) {
      logo.addEventListener("load", triggerPrint, { once: true });
      logo.addEventListener("error", triggerPrint, { once: true });
      window.setTimeout(triggerPrint, 3000);
    } else {
      window.setTimeout(triggerPrint, 150);
    }
  };

  return (
    <Layout subMenu={{ title: "المبيعات", items: salesFeatures }}>
      <div className="mx-auto max-w-7xl">
        {view === "list" && (
          <InvoicesList
            onCreateClick={() => setView("create")}
            onView={(invoice) => {
              setSelectedInvoice(invoice);
              setView("details");
            }}
            onEdit={(invoice) => {
              setSelectedInvoice(invoice);
              setView("edit");
            }}
            onPayment={(invoice) => {
              setSelectedInvoice(invoice);
              setView("payment");
            }}
            onDelete={handleDelete}
            onDownloadPdf={handleDownloadPdf}
            invoices={invoices}
          />
        )}
        {view === "create" && (
          <InvoiceForm onBack={() => setView("list")} onSaved={handleSaved} />
        )}
        {view === "details" && selectedInvoice && (
          <InvoiceDetails invoice={selectedInvoice} onBack={() => setView("list")} />
        )}
        {view === "edit" && selectedInvoice && (
          <InvoiceEdit
            invoice={selectedInvoice}
            onBack={() => setView("list")}
            onUpdated={handleUpdate}
          />
        )}
        {view === "payment" && selectedInvoice && (
          <InvoicePayment
            invoice={selectedInvoice}
            onBack={() => setView("list")}
            onUpdated={handleUpdate}
          />
        )}
      </div>
    </Layout>
  );
}

function InvoicesList({
  onCreateClick,
  onView,
  onEdit,
  onPayment,
  onDelete,
  onDownloadPdf,
  invoices,
}: {
  onCreateClick: () => void;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onPayment: (invoice: Invoice) => void;
  onDelete: (invoiceId: string) => void;
  onDownloadPdf: (invoice: Invoice) => void;
  invoices: Invoice[];
}) {
  const notifyAction = (title: string, description?: string) => {
    toast({ title, description });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="فواتير المبيعات"
        subtitle="إدارة وتتبع جميع فواتير المبيعات والمدفوعات"
        actionLabel="إضافة فاتورة مبيعات جديدة"
        onAction={onCreateClick}
        gradient="from-emerald-600 to-teal-700"
      />

      <FilterBar>
        <FilterInput label="البحث" placeholder="رقم الفاتورة، المرجع، اسم العميل..." colSpan={2} />
        <FilterSelect label="العميل" options={["الكل"]} />
        <FilterSelect label="الحالة" options={["الكل", "مفتوحة", "مدفوعة جزئياً", "مدفوعة بالكامل"]} />
        <FilterActions />
      </FilterBar>

      <DataTable
        headers={["الإجراءات", "الحالة", "المبلغ المتبقي", "المبلغ المدفوع", "الإجمالي", "العميل", "تاريخ الاستحقاق", "تاريخ الفاتورة", "رقم الفاتورة"]}
        gradient="from-[#1e293b] to-[#334155]"
      >
        {invoices.map((invoice, i) => (
          <tr key={invoice.id} className={cn("hover:bg-muted/30 transition-colors", i % 2 !== 0 && "bg-muted/10")}>
            <td className="px-5 py-3.5 align-middle">
              <div className="flex items-center gap-1.5 flex-wrap">
                <ActionBtn icon={Eye} label="عرض" color="blue" onClick={() => onView(invoice)} />
                <ActionBtn icon={Edit} label="تعديل" color="emerald" onClick={() => onEdit(invoice)} />
                <ActionBtn icon={CreditCard} label="تسديد" color="indigo" onClick={() => onPayment(invoice)} />
                <ActionBtn icon={Trash2} label="حذف" color="red" onClick={() => onDelete(invoice.id)} />
                <ActionBtn icon={Download} label="PDF" color="slate" onClick={() => {
                  onDownloadPdf(invoice);
                  notifyAction("تحميل PDF", `الفاتورة: ${invoice.id}`);
                }} />
              </div>
            </td>
            <td className="px-5 py-3.5 align-middle text-right">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-[11px] font-bold whitespace-nowrap",
                  invoice.status === "مدفوعة بالكامل"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : invoice.status === "مدفوعة جزئياً"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-sky-50 text-sky-700 border-sky-200"
                )}
              >
                {invoice.status}
              </span>
            </td>
            <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap text-red-500 font-semibold text-[13px]">
              {invoice.remaining}
            </td>
            <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap text-emerald-600 font-semibold text-[13px]">
              {invoice.paid}
            </td>
            <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap font-bold text-primary">
              {invoice.total}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-foreground font-medium">
              {invoice.customer}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-muted-foreground text-[13px]">
              {invoice.dueDate}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-muted-foreground text-[13px]">
              {invoice.date}
            </td>
            <td className="px-5 py-3.5 align-middle text-right font-bold text-primary hover:underline cursor-pointer">
              {invoice.id}
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function InvoiceDetails({
  invoice,
  onBack,
}: {
  invoice: Invoice;
  onBack: () => void;
}) {
  const [lineItems, setLineItems] = useState<
    Array<{
      id: number;
      description: string;
      qty: number;
      price: number;
      taxable: number;
      vat: number;
      total: number;
    }>
  >([]);

  useEffect(() => {
    const stored = localStorage.getItem(`sales-invoice-items-${invoice.id}`);
    if (stored) {
      const parsed = JSON.parse(stored) as Array<{
        id: number;
        description: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        taxPercent: number;
      }>;

      const mapped = parsed.map((item) => {
        const lineSubtotal = item.quantity * item.unitPrice - item.discount;
        const vat = (lineSubtotal * item.taxPercent) / 100;
        return {
          id: item.id,
          description: item.description || "-",
          qty: item.quantity,
          price: item.unitPrice,
          taxable: lineSubtotal,
          vat,
          total: lineSubtotal + vat,
        };
      });
      setLineItems(mapped);
    } else {
      const totalValue = parseCurrency(invoice.total);
      const taxableValue = totalValue ? totalValue / 1.15 : 0;
      const vatValue = totalValue ? totalValue - taxableValue : 0;
      setLineItems([
        {
          id: 1,
          description: "-",
          qty: 1,
          price: taxableValue,
          taxable: taxableValue,
          vat: vatValue,
          total: totalValue,
        },
      ]);
    }
  }, [invoice.id, invoice.total]);

  const totals = lineItems.reduce(
    (acc, item) => {
      acc.taxable += item.taxable;
      acc.vat += item.vat;
      acc.total += item.total;
      return acc;
    },
    { taxable: 0, vat: 0, total: 0 }
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">تفاصيل الفاتورة الضريبية</h1>
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="space-y-2 text-right">
                <h2 className="text-lg text-sm font-bold text-foreground">شركة لاكجري العياف</h2>
                <p className="text-sm text-slate-600">
                  8529 الشيخ محمد بن جبير، الشوقية، مكة المكرمة
                </p>
                <p className="text-sm text-slate-600">24351 المملكة العربية السعودية</p>
                <p className="text-sm text-slate-600">رقم التسجيل الضريبي 314559705300003</p>
                <p className="text-sm text-slate-600">رقم السجل التجاري 7053358979</p>
              </div>
              <div className="flex items-center justify-center">
                <img src={COMPANY_LOGO_URL} alt="شعار الشركة" className="h-24 w-32 object-contain" />
              </div>
              <div className="space-y-2 text-left md:text-right">
                <h2 className="text-lg text-sm font-bold text-foreground">Luxury Al Ayaf Company</h2>
                <p className="text-sm text-slate-600">
                  8529, Sheikh Muhammad Ibn Jabeer, Ash Shawqiyah, Mecca
                </p>
                <p className="text-sm text-slate-600">24351, Kingdom of Saudi Arabia</p>
                <p className="text-sm text-slate-600">VAT number 314559705300003</p>
                <p className="text-sm text-slate-600">CR Number 7053358979</p>
              </div>
            </div>

            <div className="text-center border-t border-b border-slate-200 py-4">
              <h3 className="text-2xl font-bold text-slate-800">فاتورة ضريبية</h3>
              <p className="text-sm text-slate-500">Tax Invoice</p>
            </div>

            <div className="border border-slate-200 rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
                <div className="p-3 border-b md:border-b-0 md:border-l border-slate-200 space-y-2 text-right">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">العميل</span>
                    <span className="text-sm font-bold text-foreground">{invoice.customer}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">العنوان الوطني</span>
                    <span className="text-sm font-bold text-foreground">{invoice.customerAddress || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">رقم التسجيل الضريبي</span>
                    <span className="text-sm font-bold text-foreground">300726885600003</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 text-right">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">رقم الفاتورة</span>
                    <span className="text-sm font-bold text-foreground">{invoice.id}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">التاريخ</span>
                    <span className="text-sm font-bold text-foreground">{invoice.date}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">تاريخ الاستحقاق</span>
                    <span className="text-sm font-bold text-foreground">{invoice.dueDate}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right border border-slate-200">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 border border-slate-200">#</th>
                    <th className="px-3 py-2 border border-slate-200">الوصف</th>
                    <th className="px-3 py-2 border border-slate-200">الكمية</th>
                    <th className="px-3 py-2 border border-slate-200">السعر</th>
                    <th className="px-3 py-2 border border-slate-200">المبلغ الخاضع للضريبة</th>
                    <th className="px-3 py-2 border border-slate-200">القيمة المضافة</th>
                    <th className="px-3 py-2 border border-slate-200">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 border border-slate-200">{item.id}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.description}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.qty}</td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.price.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.taxable.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.vat.toFixed(2)}
                        <div className="text-xs text-slate-500">15%</div>
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-28 w-28 border border-slate-200 rounded flex items-center justify-center text-xs text-slate-500">
                    QR
                  </div>
                  <div className="text-xs text-slate-500">
                    تم ترميز هذا الرمز وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك للفوترة الإلكترونية
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <h4 className="font-semibold">ملاحظات</h4>
                  <p>يتم عرض تفاصيل الفاتورة وفق نموذج الفاتورة الضريبية المعتمد.</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">المجموع الفرعي</span>
                  <span className="text-sm font-bold text-foreground">{totals.taxable.toFixed(2)} ﷼</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">إجمالي ضريبة القيمة المضافة</span>
                  <span className="text-sm font-bold text-foreground">{totals.vat.toFixed(2)} ﷼</span>
                </div>
                <div className="flex justify-between text-blue-600 font-bold">
                  <span>المجموع شامل القيمة المضافة</span>
                  <span>{totals.total.toFixed(2)} ﷼</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 text-sm text-slate-700">
              <h4 className="font-semibold mb-2">بيانات الحساب البنكي</h4>
              <div className="space-y-1">
                <div>اسم المستفيد: شركة لاكجري العياف</div>
                <div>رقم الحساب: 1575917249940</div>
                <div>رقم الآيبان: SA3520000001575917249940</div>
                <div>بنك الرياض</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceEdit({
  invoice,
  onBack,
  onUpdated,
}: {
  invoice: Invoice;
  onBack: () => void;
  onUpdated: (invoice: Invoice) => void;
}) {
  const [invoiceDate, setInvoiceDate] = useState(invoice.date);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [customer, setCustomer] = useState(invoice.customer);
  const [customerAddress, setCustomerAddress] = useState(invoice.customerAddress);
  const [status, setStatus] = useState(invoice.status);
  const [items, setItems] = useState(
    () =>
      JSON.parse(
        localStorage.getItem(`sales-invoice-items-${invoice.id}`) || "null"
      ) || [
        {
          id: 1,
          description: "",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          taxPercent: 15,
        },
      ]
  );

  const handleAddItem = () => {
    setItems((prev: typeof items) => [
      ...prev,
      {
        id: prev.length + 1,
        description: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxPercent: 15,
      },
    ]);
  };

  const updateItem = (id: number, changes: Partial<(typeof items)[number]>) => {
    setItems((prev: typeof items) =>
      prev.map((item: (typeof items)[number]) =>
        item.id === id ? { ...item, ...changes } : item
      )
    );
  };

  const removeItem = (id: number) => {
    setItems((prev: typeof items) => prev.filter((item) => item.id !== id));
  };

  const totals = items.reduce(
    (acc: { subtotal: number; discount: number; tax: number; total: number }, item: (typeof items)[number]) => {
      const lineSubtotal = item.quantity * item.unitPrice - item.discount;
      const tax = (lineSubtotal * item.taxPercent) / 100;
      const lineTotal = lineSubtotal + tax;
      return {
        subtotal: acc.subtotal + lineSubtotal,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + lineTotal,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  const handleSave = async () => {
    const paidValue = parseCurrency(invoice.paid);
    const totalValue = totals.total;
    const remainingValue = Math.max(totalValue - paidValue, 0);

    const { data, error } = await supabase
      .from("sales_invoices")
      .update({
        date: invoiceDate,
        due_date: dueDate,
        customer,
        total: `ريال ${totalValue.toFixed(2)}`,
        remaining: `ريال ${remainingValue.toFixed(2)}`,
        status,
      })
      .eq("id", invoice.id)
      .select()
      .single();

    if (!error && data) {
      localStorage.setItem(
        `sales-invoice-items-${invoice.id}`,
        JSON.stringify(items)
      );
      localStorage.setItem(`sales-invoice-address-${invoice.id}`, customerAddress);
      onUpdated({
        ...invoice,
        date: invoiceDate,
        dueDate,
        customer,
        customerAddress,
        total: `ريال ${totalValue.toFixed(2)}`,
        remaining: `ريال ${remainingValue.toFixed(2)}`,
        status,
        statusColor: statusColors[status] ?? "bg-slate-500 text-white",
      });
      toast({ title: "تم تحديث الفاتورة", description: `الفاتورة: ${invoice.id}` });
      onBack();
    } else {
      toast({ title: "تعذر تحديث الفاتورة", description: "يرجى المحاولة لاحقاً" });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">تعديل الفاتورة</h1>
          <Edit className="h-5 w-5 text-emerald-600" />
        </div>
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
        >
          حفظ التعديلات
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-end gap-2">
            <h2 className="text-sm font-bold text-foreground">معلومات الفاتورة</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">
                تاريخ الفاتورة
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">
                تاريخ الاستحقاق
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">العميل</label>
              <input
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">العنوان الوطني</label>
              <input
                type="text"
                value={customerAddress}
                onChange={(event) => setCustomerAddress(event.target.value)}
                placeholder="رقم المبنى، الشارع، الحي، المدينة، الرمز البريدي"
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">الحالة</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
              >
                <option value="مفتوحة">مفتوحة</option>
                <option value="مدفوعة جزئياً">مدفوعة جزئياً</option>
                <option value="مدفوعة بالكامل">مدفوعة بالكامل</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <button
              onClick={handleAddItem}
              className="rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-500/20 hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              إضافة بند
            </button>
            <h2 className="text-sm font-bold text-foreground">بنود الفاتورة</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right mb-4">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="pb-2 font-medium w-16 text-center"></th>
                  <th className="pb-2 font-medium w-24">المجموع</th>
                  <th className="pb-2 font-medium w-24">الضريبة</th>
                  <th className="pb-2 font-medium w-20">خصم</th>
                  <th className="pb-2 font-medium w-24">سعر الوحدة *</th>
                  <th className="pb-2 font-medium w-20">الكمية *</th>
                  <th className="pb-2 font-medium w-[320px]">وصف البند</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: (typeof items)[number]) => {
                  const lineSubtotal = item.quantity * item.unitPrice - item.discount;
                  const lineTax = (lineSubtotal * item.taxPercent) / 100;
                  const lineTotal = lineSubtotal + lineTax;

                  return (
                    <tr key={item.id}>
                      <td className="pt-4 align-top">
                        <div className="flex items-center justify-center gap-1 h-10">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="text"
                          value={lineTotal.toFixed(2)}
                          disabled
                          className="w-full px-2 py-2 border border-border/40 bg-muted/30 rounded-xl text-sm text-right outline-none h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.taxPercent}
                          onChange={(event) =>
                            updateItem(item.id, {
                              taxPercent: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(event) =>
                            updateItem(item.id, {
                              discount: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(item.id, {
                              unitPrice: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, {
                              quantity: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 pl-1 align-top min-w-[320px]">
                        <textarea
                          rows={3}
                          placeholder="اكتب وصف البند..."
                          value={item.description}
                          onChange={(event) =>
                            updateItem(item.id, {
                              description: event.target.value,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[88px] resize-y"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t border-slate-200 pt-4 flex justify-center mt-8">
              <div className="w-96 flex justify-between">
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.tax.toFixed(2)} ريال
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-emerald-600">
                      {totals.total.toFixed(2)} ريال
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm text-slate-600">الضريبة</div>
                  <div className="text-sm font-bold text-slate-800">المجموع الكلي</div>
                </div>
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.subtotal.toFixed(2)} ريال
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.discount.toFixed(2)} ريال
                    </span>
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

function InvoicePayment({
  invoice,
  onBack,
  onUpdated,
}: {
  invoice: Invoice;
  onBack: () => void;
  onUpdated: (invoice: Invoice) => void;
}) {
  const totalValue = parseCurrency(invoice.total);
  const paidValue = parseCurrency(invoice.paid);
  const remainingValue = parseCurrency(invoice.remaining);
  const defaultStatus =
    remainingValue === 0 ? "مدفوعة بالكامل" : paidValue > 0 ? "مدفوعة جزئياً" : "مفتوحة";
  const [amount, setAmount] = useState(remainingValue.toFixed(2));
  const [status, setStatus] = useState(invoice.status || defaultStatus);

  const handleSave = async () => {
    const paymentAmount = Math.max(Number(amount) || 0, 0);
    const nextPaid = Math.min(paidValue + paymentAmount, totalValue);
    const nextRemaining = Math.max(totalValue - nextPaid, 0);
    const nextStatus = status || defaultStatus;

    const { data, error } = await supabase
      .from("sales_invoices")
      .update({
        paid: `ريال ${nextPaid.toFixed(2)}`,
        remaining: `ريال ${nextRemaining.toFixed(2)}`,
        status: nextStatus,
      })
      .eq("id", invoice.id)
      .select()
      .single();

    if (!error && data) {
      onUpdated({
        ...invoice,
        paid: `ريال ${nextPaid.toFixed(2)}`,
        remaining: `ريال ${nextRemaining.toFixed(2)}`,
        status: nextStatus,
        statusColor: statusColors[nextStatus] ?? "bg-slate-500 text-white",
      });
      toast({ title: "تم تسديد الفاتورة", description: `الفاتورة: ${invoice.id}` });
      onBack();
    } else {
      toast({ title: "تعذر تسديد الفاتورة", description: "يرجى المحاولة لاحقاً" });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">تسديد الفاتورة</h1>
          <CreditCard className="h-5 w-5 text-indigo-600" />
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors"
        >
          حفظ السداد
        </button>
      </div>

      <div className="p-4">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-end gap-2">
            <h2 className="text-sm font-bold text-foreground">معلومات السداد</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">رقم الفاتورة</label>
              <div className="text-base text-sm font-bold text-foreground text-right">
                {invoice.id}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">المتبقي</label>
              <div className="text-base text-sm font-bold text-foreground text-right">
                {invoice.remaining}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">المبلغ المدفوع الآن</label>
              <input
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">الحالة</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="مفتوحة">مفتوحة</option>
                <option value="مدفوعة جزئياً">مدفوعة جزئياً</option>
                <option value="مدفوعة بالكامل">مدفوعة بالكامل</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceForm({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: (invoice: Invoice) => void;
}) {
  const [items, setItems] = useState([
    {
      id: 1,
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxPercent: 15,
    },
  ]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [customer, setCustomer] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [project, setProject] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [notes, setNotes] = useState("");
  const customerOptions = ["فندي بن سالم", "فندي كوزوبد", "شركة لاكجري العياف"];

  useEffect(() => {
    const loadDefaults = async () => {
      const today = new Date();
      const due = new Date();
      due.setDate(today.getDate() + 30);

      setInvoiceDate(today.toISOString().split("T")[0]);
      setDueDate(due.toISOString().split("T")[0]);

      const { data } = await supabase
        .from("sales_invoices")
        .select("id")
        .like("id", "INV-%")
        .order("id", { ascending: false })
        .limit(1);

      const latestId = data?.[0]?.id ?? "INV-000100";
      const latestNumber = Number(String(latestId).split("-")[1] ?? "100");
      setInvoiceNumber(`INV-${String(latestNumber + 1).padStart(6, "0")}`);
    };

    void loadDefaults();
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        description: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxPercent: 15,
      },
    ]);
  };

  const updateItem = (id: number, changes: Partial<(typeof items)[number]>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  };

  const totals = items.reduce(
    (acc, item) => {
      const lineSubtotal = item.quantity * item.unitPrice - item.discount;
      const tax = (lineSubtotal * item.taxPercent) / 100;
      const lineTotal = lineSubtotal + tax;
      return {
        subtotal: acc.subtotal + lineSubtotal,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + lineTotal,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  const handleSave = async () => {
    const invoiceId = invoiceNumber || `INV-${Date.now()}`;
    const totalValue = totals.total;
    const payload = {
      id: invoiceId,
      date: invoiceDate,
      due_date: dueDate,
      customer,
      total: `ريال ${totalValue.toFixed(2)}`,
      paid: "ريال 0.00",
      remaining: `ريال ${totalValue.toFixed(2)}`,
      status: "مفتوحة",
    };

    const { data, error } = await supabase
      .from("sales_invoices")
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      localStorage.setItem(
        `sales-invoice-items-${data.id ?? invoiceId}`,
        JSON.stringify(items)
      );
      localStorage.setItem(`sales-invoice-address-${data.id ?? invoiceId}`, customerAddress);
      onSaved({
        id: data.id ?? invoiceId,
        date: data.date ?? invoiceDate,
        dueDate: data.due_date ?? dueDate,
        customer: data.customer ?? customer,
        customerAddress,
        total: data.total ?? payload.total,
        paid: data.paid ?? payload.paid,
        remaining: data.remaining ?? payload.remaining,
        status: data.status ?? "مفتوحة",
        statusColor: statusColors[data.status ?? "مفتوحة"] ??
          "bg-cyan-500 text-white",
      });
      onBack();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-foreground hover:bg-muted/30 transition-all flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center gap-2"
          >
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
            حفظ الفاتورة
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            حفظ وطباعة
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">
            إنشاء فاتورة مبيعات جديدة
          </h1>
          <CreditCard className="h-5 w-5 text-blue-600" />
        </div>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="h-16 w-16 rounded-lg bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center text-center">
                شركة لاكجري العياف
              </div>
              <div>
                <p className="text-base font-bold text-foreground">شركة لاكجري العياف</p>
                <p className="text-xs text-muted-foreground mt-1">الشارع رقم 20</p>
                <p className="text-xs text-muted-foreground">المملكة العربية السعودية</p>
                <p className="text-xs text-muted-foreground">315597905300003 : الرقم الضريبي</p>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">العميل</label>
                  <select
                    value={customer}
                    onChange={(event) => setCustomer(event.target.value)}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-white"
                  >
                    <option value="">اختر العميل</option>
                    {customerOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">العنوان الوطني</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(event) => setCustomerAddress(event.target.value)}
                    placeholder="رقم المبنى، الشارع، الحي، المدينة، الرمز البريدي"
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">رقم الفاتورة</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    readOnly
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-muted/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">العملة</label>
                  <input
                    type="text"
                    value="SAR"
                    disabled
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-muted/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(event) => setInvoiceDate(event.target.value)}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">أمر الشراء</label>
                  <input
                    type="text"
                    value={purchaseOrder}
                    onChange={(event) => setPurchaseOrder(event.target.value)}
                    placeholder="اختياري"
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">المرجع</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="اختياري"
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">المشروع</label>
                  <input
                    type="text"
                    value={project}
                    onChange={(event) => setProject(event.target.value)}
                    placeholder="اختياري"
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">المستودع</label>
                  <input
                    type="text"
                    value={warehouse}
                    onChange={(event) => setWarehouse(event.target.value)}
                    placeholder="اختياري"
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <button
              onClick={handleAddItem}
              className="rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-500/20 hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              إضافة بند
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">بنود الفاتورة</h2>
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
                  <th className="pb-2 font-medium w-24">سعر الوحدة *</th>
                  <th className="pb-2 font-medium w-20">الكمية *</th>
                  <th className="pb-2 font-medium w-[320px]">وصف البند</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const lineSubtotal = item.quantity * item.unitPrice - item.discount;
                  const lineTax = (lineSubtotal * item.taxPercent) / 100;
                  const lineTotal = lineSubtotal + lineTax;

                  return (
                  <tr key={item.id}>
                    <td className="pt-4 align-top">
                      <div className="flex items-center justify-center gap-1 h-10">
                        <button className="w-7 h-7 flex items-center justify-center bg-cyan-500 text-white rounded hover:bg-cyan-600">
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="text"
                        value={lineTotal.toFixed(2)}
                        disabled
                        className="w-full px-2 py-2 border border-border/40 bg-muted/30 rounded-xl text-sm text-right outline-none h-10"
                      />
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="number"
                        value={item.taxPercent}
                        onChange={(event) =>
                          updateItem(item.id, {
                            taxPercent: Number(event.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                      />
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(event) =>
                          updateItem(item.id, {
                            discount: Number(event.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                      />
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(item.id, {
                            unitPrice: Number(event.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                      />
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, {
                            quantity: Number(event.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                      />
                    </td>
                    <td className="pt-4 pl-1 align-top min-w-[320px]">
                      <textarea
                        rows={3}
                        placeholder="اكتب وصف البند..."
                        value={item.description}
                        onChange={(event) =>
                          updateItem(item.id, {
                            description: event.target.value,
                          })
                        }
                        className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[88px] resize-y"
                      />
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-slate-200 pt-4 flex justify-center mt-8">
              <div className="w-96 flex justify-between">
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.tax.toFixed(2)} ريال
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-blue-600">
                      {totals.total.toFixed(2)} ريال
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm text-slate-600">الضريبة</div>
                  <div className="text-sm font-bold text-slate-800">المجموع الكلي</div>
                </div>
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.subtotal.toFixed(2)} ريال
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.discount.toFixed(2)} ريال
                    </span>
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
