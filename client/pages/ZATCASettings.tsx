import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { AlertCircle, Check, Copy, Eye, EyeOff, RefreshCw, Settings, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useZATCA } from "@/hooks/useZATCA";

interface ZATCASetup {
  id?: string;
  org_id?: string;
  mode: "sandbox" | "production";
  csid?: string;
  ccsid?: string;
  sandbox_tested: boolean;
  production_ready: boolean;
  api_key?: string;
  created_at?: string;
  last_sync?: string;
}

export default function ZATCASettings() {
  const [setup, setSetup] = useState<ZATCASetup>({
    mode: "sandbox",
    sandbox_tested: false,
    production_ready: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "connected" | "failed">("idle");
  const { testConnection } = useZATCA();

  // تحميل الإعدادات الحالية
  useEffect(() => {
    const loadSetup = async () => {
      try {
        const { data } = await supabase
          .from("zatca_integration")
          .select("*")
          .limit(1)
          .single();

        if (data) {
          setSetup(data);
        }
      } catch (error) {
        console.error("Error loading setup:", error);
      }
    };

    loadSetup();
  }, []);

  // حفظ الإعدادات
  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (setup.id) {
        // تحديث
        const { error } = await supabase
          .from("zatca_integration")
          .update({
            mode: setup.mode,
            csid: setup.csid,
            ccsid: setup.ccsid,
            api_key: setup.api_key,
            sandbox_tested: setup.sandbox_tested,
            production_ready: setup.production_ready,
          })
          .eq("id", setup.id);

        if (error) throw error;
      } else {
        // إدراج
        const { error } = await supabase
          .from("zatca_integration")
          .insert([setup]);

        if (error) throw error;
      }

      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ إعدادات ZATCA بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // اختبار الاتصال
  const handleTestConnection = async () => {
    setConnectionStatus("testing");
    try {
      const result = await testConnection();
      if (result.connected) {
        setConnectionStatus("connected");
        setSetup((prev) => ({ ...prev, sandbox_tested: true }));
        toast({
          title: "نجح الاتصال",
          description: result.message,
        });
      } else {
        setConnectionStatus("failed");
        toast({
          title: "فشل الاتصال",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setConnectionStatus("failed");
      toast({
        title: "خطأ",
        description: "فشل اختبار الاتصال",
        variant: "destructive",
      });
    }
  };

  // نسخ قيمة إلى الحافظة
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "تم النسخ",
        description: "تم نسخ القيمة إلى الحافظة",
      });
    } catch {
      toast({
        title: "خطأ",
        description: "فشل نسخ القيمة",
        variant: "destructive",
      });
    }
  };

  // حذف الإعدادات
  const handleDelete = async () => {
    if (!setup.id) return;

    if (!confirm("هل أنت متأكد من حذف هذه الإعدادات؟")) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("zatca_integration")
        .delete()
        .eq("id", setup.id);

      if (error) throw error;

      setSetup({
        mode: "sandbox",
        sandbox_tested: false,
        production_ready: false,
      });

      toast({
        title: "تم الحذف",
        description: "تم حذف الإعدادات بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل حذف الإعدادات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 bg-white">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إعدادات ZATCA</h1>
          <p className="text-gray-600">إدارة تكامل نظام الفاتورة الإلكترونية مع ZATCA</p>
        </div>

        {/* حالة الاتصال */}
        <div className="mb-6 p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">حالة الاتصال</h3>
              <p className="text-sm text-gray-600 mt-1">
                {connectionStatus === "idle" && "لم يتم اختبار الاتصال بعد"}
                {connectionStatus === "testing" && "جاري الاختبار..."}
                {connectionStatus === "connected" && "متصل بنجاح ✓"}
                {connectionStatus === "failed" && "فشل الاتصال ✗"}
              </p>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={isLoading || connectionStatus === "testing"}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={18} />
              اختبار الاتصال
            </button>
          </div>
        </div>

        {/* نمط التشغيل */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">نمط التشغيل</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="sandbox"
                checked={setup.mode === "sandbox"}
                onChange={(e) => setSetup({ ...setup, mode: e.target.value as "sandbox" | "production" })}
                className="w-4 h-4"
              />
              <span>Sandbox (الاختبار)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="production"
                checked={setup.mode === "production"}
                onChange={(e) => setSetup({ ...setup, mode: e.target.value as "sandbox" | "production" })}
                className="w-4 h-4"
              />
              <span>Production (الإنتاج)</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            استخدم Sandbox للاختبار قبل الانتقال للإنتاج
          </p>
        </div>

        {/* بيانات الشهادات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* CSID */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">CSID (Compliance Stamp ID)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={setup.csid || ""}
                onChange={(e) => setSetup({ ...setup, csid: e.target.value })}
                placeholder="الحصول عليه من ZATCA"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
              {setup.csid && (
                <button
                  onClick={() => copyToClipboard(setup.csid!)}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  title="نسخ"
                >
                  <Copy size={18} />
                </button>
              )}
            </div>
          </div>

          {/* CCSID */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              CCSID (Compliance Cryptographic Stamp ID)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={setup.ccsid || ""}
                onChange={(e) => setSetup({ ...setup, ccsid: e.target.value })}
                placeholder="الحصول عليه من ZATCA"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
              {setup.ccsid && (
                <button
                  onClick={() => copyToClipboard(setup.ccsid!)}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  title="نسخ"
                >
                  <Copy size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">مفتاح API (اختياري)</label>
          <div className="flex gap-2">
            <input
              type={showApiKey ? "text" : "password"}
              value={setup.api_key || ""}
              onChange={(e) => setSetup({ ...setup, api_key: e.target.value })}
              placeholder="مفتاح API من ZATCA"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="px-3 py-2 text-gray-600 hover:text-gray-900"
            >
              {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* حالات الاختبار والإنتاج */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">حالة التجهيز</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={setup.sandbox_tested}
                  onChange={(e) => setSetup({ ...setup, sandbox_tested: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>تم اختبار Sandbox</span>
              </label>
              {setup.sandbox_tested && <Check className="text-green-600" size={20} />}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={setup.production_ready}
                  onChange={(e) => setSetup({ ...setup, production_ready: e.target.checked })}
                  className="w-4 h-4"
                  disabled={!setup.sandbox_tested}
                />
                <span>جاهز للإنتاج</span>
              </label>
              {setup.production_ready && <Check className="text-green-600" size={20} />}
            </div>
          </div>
        </div>

        {/* تنبيهات */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-gray-800">
            <p className="font-semibold mb-1">نصائح هامة:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>ابدأ دائماً بـ Sandbox للاختبار قبل الانتقال للإنتاج</li>
              <li>احفظ CSID و CCSID بشكل آمن</li>
              <li>تأكد من صحة بيانات الشركة قبل الإرسال</li>
              <li>احتفظ بسجل لجميع الفواتير المرسلة</li>
            </ul>
          </div>
        </div>

        {/* الأزرار */}
        <div className="flex gap-3 justify-end">
          {setup.id && (
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
            >
              <Trash2 size={18} />
              حذف
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Settings size={18} />
            {isLoading ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>

        {/* معلومات إضافية */}
        {setup.created_at && (
          <div className="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-500">
            <p>تاريخ الإنشاء: {new Date(setup.created_at).toLocaleString("ar-SA")}</p>
            {setup.last_sync && (
              <p>آخر مزامنة: {new Date(setup.last_sync).toLocaleString("ar-SA")}</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
