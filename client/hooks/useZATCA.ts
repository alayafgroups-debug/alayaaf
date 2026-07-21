import { useState, useCallback, useEffect } from "react";
import { createZATCAService, ZATCAService, ZATCAConfig, ZATCAInvoice } from "@/lib/zatcaIntegration";
import { supabase } from "@/lib/supabaseClient";

interface ZATCAResult {
  success: boolean;
  uuid?: string;
  error?: string;
  message?: string;
}

export function useZATCA() {
  const [service, setService] = useState<ZATCAService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<ZATCAConfig | null>(null);

  // تحميل إعدادات ZATCA من قاعدة البيانات
  useEffect(() => {
    const loadZATCAConfig = async () => {
      try {
        const { data: orgData } = await supabase.auth.getUser();
        if (!orgData.user) return;

        // جلب إعدادات ZATCA من جدول zatca_integration
        const { data } = await supabase
          .from("zatca_integration")
          .select("*")
          .limit(1)
          .single();

        if (data) {
          const zatcaConfig: ZATCAConfig = {
            mode: data.sandbox_mode ? "sandbox" : "production",
            // Reporting API الرسمي — بوابة Fatoora
            apiUrl: data.sandbox_mode
              ? "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal"
              : "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
            companyVAT: "", // سيتم ملؤها من بيانات المنظمة
            companyName: "",
            companyNameAr: "",
            companyAddress: "",
            companyEmail: "",
            companyPhone: "",
            ccsid: data.ccsid,
            csid: data.csid,
            secret: data.secret,
          };

          setConfig(zatcaConfig);
          setService(createZATCAService(zatcaConfig));
        }
      } catch (error) {
        console.error("Error loading ZATCA config:", error);
      }
    };

    loadZATCAConfig();
  }, []);

  // اختبار الاتصال بـ ZATCA
  const testConnection = useCallback(async () => {
    if (!service) return;

    setIsLoading(true);
    try {
      const result = await service.testConnection();
      setIsConnected(result.connected);
      return result;
    } catch (error) {
      console.error("Connection test error:", error);
      setIsConnected(false);
      return {
        connected: false,
        message: "فشل اختبار الاتصال",
      };
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // تقديم الفاتورة للمسح (B2B/B2G)
  const submitInvoiceForClearance = useCallback(
    async (invoice: ZATCAInvoice): Promise<ZATCAResult> => {
      if (!service) return { success: false, error: "خدمة ZATCA غير مهيأة" };

      setIsLoading(true);
      try {
        // توليد XML
        const invoiceXML = service.generateInvoiceXML(invoice);

        // إرسال للمسح
        const result = await service.clearInvoice(invoiceXML);

        if (result.success) {
          // حفظ نتائج ZATCA في قاعدة البيانات
          await supabase
            .from("sales_invoices")
            .update({
              uuid: result.uuid,
              cryptographic_stamp: result.cryptographicStamp,
              qr_code: result.qrCode,
              zatca_status: "cleared",
              zatca_response: result,
            })
            .eq("invoice_number", invoice.invoiceNumber);

          return {
            success: true,
            uuid: result.uuid,
            message: "تم المسح والموافقة بنجاح",
          };
        }

        return {
          success: false,
          error: result.error || "خطأ في المسح",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "خطأ غير معروف",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [service]
  );

  // تقديم الفاتورة المبسطة للإبلاغ (B2C)
  const submitSimplifiedInvoice = useCallback(
    async (invoice: ZATCAInvoice): Promise<ZATCAResult> => {
      if (!service) return { success: false, error: "خدمة ZATCA غير مهيأة" };

      setIsLoading(true);
      try {
        // توليد XML
        const invoiceXML = service.generateInvoiceXML(invoice);

        // إرسال للإبلاغ عبر Reporting API الرسمي
        const result = await service.reportSimplifiedInvoice(
          invoiceXML,
          invoice.uuid,
        );

        // حفظ نتيجة الإبلاغ (نجاح أو فشل) للمراجعة
        await supabase
          .from("sales_invoices")
          .update({
            uuid: invoice.uuid,
            zatca_status: result.success
              ? result.reportingStatus === "REPORTED"
                ? "reported"
                : "reported_with_warnings"
              : "reporting_failed",
            zatca_response: result.raw ?? result,
            zatca_reported_at: result.success
              ? new Date().toISOString()
              : null,
          })
          .eq("invoice_number", invoice.invoiceNumber);

        if (result.success) {
          return {
            success: true,
            message:
              result.reportingStatus === "REPORTED"
                ? "تم الإبلاغ بنجاح"
                : "تم الإبلاغ مع وجود تحذيرات",
          };
        }

        return {
          success: false,
          error: result.error || "خطأ في الإبلاغ",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "خطأ غير معروف",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [service]
  );

  // تحميل نموذج الفاتورة من البيانات الموجودة
  const buildInvoiceFromData = useCallback(
    async (invoiceId: string): Promise<ZATCAInvoice | null> => {
      try {
        const { data } = await supabase
          .from("sales_invoices")
          .select("*")
          .eq("id", invoiceId)
          .single();

        if (!data) return null;

        // تحويل بيانات قاعدة البيانات إلى نموذج ZATCA
        return {
          invoiceNumber: data.invoice_number || data.id,
          invoiceType: data.buyer_vat ? "standard" : "simplified",
          issueDate: new Date(data.date),
          dueDate: data.due_date ? new Date(data.due_date) : undefined,
          buyerName: data.customer || "",
          buyerNameAr: data.customer || "",
          buyerVAT: data.buyer_vat,
          buyerAddress: data.customer_address || "",
          sellerVAT: config?.companyVAT || "",
          sellerName: config?.companyName || "",
          sellerNameAr: config?.companyNameAr || "",
          sellerAddress: config?.companyAddress || "",
          lineItems: data.items || [],
          subtotal: parseFloat(data.subtotal) || 0,
          totalTax: parseFloat(data.total_tax) || 0,
          total: parseFloat(data.total) || 0,
        };
      } catch (error) {
        console.error("Error building invoice:", error);
        return null;
      }
    },
    [config]
  );

  return {
    service,
    config,
    isConnected,
    isLoading,
    testConnection,
    submitInvoiceForClearance,
    submitSimplifiedInvoice,
    buildInvoiceFromData,
  };
}
