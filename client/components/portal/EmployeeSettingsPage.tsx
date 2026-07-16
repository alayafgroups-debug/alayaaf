import { useState } from "react";
import { ChevronLeft, Settings, Moon, Sun, Globe, Bell } from "lucide-react";

type Props = { empName: string; empRole: string; onBack: () => void };

export default function EmployeeSettingsPage({ empName, empRole, onBack }: Props) {
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [notificationsOn, setNotificationsOn] = useState(true);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
        <button onClick={onBack} className="text-[#004e89]"><ChevronLeft className="h-6 w-6 rotate-180" /></button>
        <Settings className="h-5 w-5 text-[#004e89]" />
        <h2 className="font-bold text-lg text-gray-900">الإعدادات</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Profile summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#004e89] flex items-center justify-center text-white font-bold text-xl">
            {empName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{empName}</p>
            <p className="text-xs text-gray-500">{empRole}</p>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Globe className="h-4 w-4 text-[#004e89]" /> اللغة</p>
          <div className="flex gap-3">
            <button onClick={() => setLang("ar")} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition ${lang === "ar" ? "bg-[#004e89] text-white border-[#004e89]" : "border-gray-200 text-gray-600"}`}>العربية</button>
            <button onClick={() => setLang("en")} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition ${lang === "en" ? "bg-[#004e89] text-white border-[#004e89]" : "border-gray-200 text-gray-600"}`}>English</button>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 flex items-center gap-2">
              {darkMode ? <Moon className="h-4 w-4 text-indigo-500" /> : <Sun className="h-4 w-4 text-amber-400" />}
              الوضع {darkMode ? "الليلي" : "النهاري"}
            </p>
            <button onClick={() => setDarkMode(!darkMode)} className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? "bg-[#004e89]" : "bg-gray-200"}`}>
              <span className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${darkMode ? "right-0.5" : "left-0.5"}`} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">تغيير مظهر التطبيق</p>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 flex items-center gap-2"><Bell className="h-4 w-4 text-orange-500" /> الإشعارات</p>
            <button onClick={() => setNotificationsOn(!notificationsOn)} className={`w-12 h-6 rounded-full transition-colors relative ${notificationsOn ? "bg-[#004e89]" : "bg-gray-200"}`}>
              <span className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${notificationsOn ? "right-0.5" : "left-0.5"}`} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">{notificationsOn ? "الإشعارات مفعّلة" : "الإشعارات متوقفة"}</p>
        </div>

        {/* App info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center text-gray-400 text-xs">
          نظام الموارد البشرية — بوابة الموظفين<br />الإصدار 1.0
        </div>
      </div>
    </div>
  );
}
