import { useState } from "react";
import { Wrench, Lock } from "lucide-react";
import Layout from "@/components/Layout";
import DeductionSettingsPage from "./DeductionSettingsPage";

export default function HRDeductionsEmails() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handlePasswordSubmit = () => {
    if (password === "1234") {
      setIsAuthenticated(true);
      setPassword("");
      setError("");
    } else {
      setError("كلمة المرور غير صحيحة");
      setPassword("");
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
              {/* Logo Only */}
              <div className="flex justify-center">
                <div className="p-4 bg-orange-100 rounded-2xl">
                  <Wrench className="h-8 w-8 text-orange-600" />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  <Lock className="h-4 w-4 inline mr-2" />
                  كلمة المرور
                </label>
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handlePasswordSubmit();
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              </div>

              {/* Submit Button */}
              <button
                onClick={handlePasswordSubmit}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition"
              >
                دخول
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div dir="rtl" className="space-y-6">
        {/* Logo Only - No Text */}
        <div className="flex items-center justify-between mb-8">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Wrench className="h-6 w-6 text-orange-600" />
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            خروج
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <DeductionSettingsPage />
        </div>
      </div>
    </Layout>
  );
}
