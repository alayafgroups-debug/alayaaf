import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function SetupDatabase() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ step: string; status: "pending" | "success" | "error"; message: string }[]>([]);

  const setupDatabase = async () => {
    setLoading(true);
    setResults([]);
    const newResults: typeof results = [];

    try {
      // Step 1: Add employee to database
      newResults.push({ step: "إضافة المدير سعيد الشودري", status: "pending", message: "جاري الإضافة..." });
      setResults([...newResults]);

      const { error: empError } = await supabase
        .from("employees")
        .upsert([
          {
            id: "20000000-0000-0000-0000-000000000001",
            emp_id: "EMP-1001",
            name: "سعيد الشودري",
            email: "saeed@alayaf.com",
            department: "الإدارة العليا",
            job_title: "مدير عام",
            branch: "الفرع الرئيسي",
            base_salary: 22000,
            total_salary: 22000,
            status: "فعال",
            permissions: {
              view_attendance: true,
              view_payroll: true,
              request_leave: true,
            },
          },
        ])
        .select();

      if (empError) {
        newResults[0] = { step: "إضافة المدير سعيد الشودري", status: "error", message: `خطأ: ${empError.message}` };
      } else {
        newResults[0] = { step: "إضافة المدير سعيد الشودري", status: "success", message: "✅ تم إضافة المدير بنجاح" };
      }

      setResults([...newResults]);

      // Step 2: Create Auth User
      newResults.push({ step: "إنشاء حساب Supabase Auth", status: "pending", message: "جاري الإنشاء..." });
      setResults([...newResults]);

      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: "saeed@alayaf.com",
          password: "12345",
          email_confirm: true,
          user_metadata: {
            emp_id: "EMP-1001",
            name: "سعيد الشودري",
          },
        });

        if (authError) {
          // User might already exist
          if (authError.message?.includes("already exists")) {
            newResults[1] = { step: "إنشاء حساب Supabase Auth", status: "success", message: "✅ الحساب موجود بالفعل" };
          } else {
            newResults[1] = { step: "إنشاء حساب Supabase Auth", status: "error", message: `خطأ: ${authError.message}` };
          }
        } else {
          newResults[1] = { step: "إنشاء حساب Supabase Auth", status: "success", message: "✅ تم إنشاء الحساب بنجاح" };
        }
      } catch (err: any) {
        newResults[1] = { step: "إنشاء حساب Supabase Auth", status: "error", message: `خطأ: ${err.message}` };
      }

      setResults([...newResults]);

      // Step 3: Verify data
      newResults.push({ step: "التحقق من البيانات", status: "pending", message: "جاري التحقق..." });
      setResults([...newResults]);

      const { data: empData, error: verifyError } = await supabase
        .from("employees")
        .select("*")
        .eq("emp_id", "EMP-1001")
        .single();

      if (verifyError) {
        newResults[2] = { step: "التحقق من البيانات", status: "error", message: `خطأ في التحقق: ${verifyError.message}` };
      } else if (empData) {
        newResults[2] = {
          step: "التحقق من البيانات",
          status: "success",
          message: `✅ تم التحقق: ${empData.name} (${empData.emp_id})`,
        };
      }

      setResults([...newResults]);

      toast.success("تم إعداد قاعدة البيانات بنجاح! 🎉");
    } catch (err: any) {
      toast.error(`خطأ: ${err.message}`);
      newResults.push({ step: "خطأ عام", status: "error", message: err.message });
      setResults([...newResults]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h1 className="text-3xl font-bold text-[#004e89] mb-2">إعداد قاعدة البيانات</h1>
          <p className="text-gray-600">إضافة المدير التجريبي (سعيد الشودري) للاختبار</p>
        </div>

        {/* Setup Button */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <Button
            onClick={setupDatabase}
            disabled={loading}
            className="w-full h-12 bg-[#004e89] hover:bg-[#003865] text-white font-bold rounded-lg text-lg"
          >
            {loading ? (
              <>
                <Loader className="h-5 w-5 mr-2 animate-spin" />
                جاري الإعداد...
              </>
            ) : (
              "ابدأ الإعداد"
            )}
          </Button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">نتائج الإعداد:</h2>

            {results.map((result, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border-r-4 border-gray-300">
                <div className="flex-shrink-0">
                  {result.status === "pending" && <Loader className="h-5 w-5 text-blue-500 animate-spin" />}
                  {result.status === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {result.status === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
                </div>
                <div className="flex-grow">
                  <p className="font-semibold text-gray-800">{result.step}</p>
                  <p
                    className={`text-sm ${
                      result.status === "success"
                        ? "text-green-600"
                        : result.status === "error"
                          ? "text-red-600"
                          : "text-blue-600"
                    }`}
                  >
                    {result.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6 mt-6">
          <h3 className="font-bold text-blue-900 mb-2">بيانات المدير التجريبي:</h3>
          <div className="space-y-1 text-sm text-blue-800 font-mono">
            <p>الاسم: سعيد الشودري</p>
            <p>الرقم: EMP-1001</p>
            <p>البريد: saeed@alayaf.com</p>
            <p>كلمة المرور: 12345</p>
          </div>
        </div>

        {/* Next Steps */}
        {results.length > 0 && results.every((r) => r.status === "success") && (
          <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6 mt-6">
            <h3 className="font-bold text-green-900 mb-3">✅ تم الإعداد بنجاح!</h3>
            <p className="text-green-800 mb-4">الآن يمكنك تسجيل الدخول:</p>
            <a
              href="/employee/login"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
            >
              اذهب إلى صفحة الدخول
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
