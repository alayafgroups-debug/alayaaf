import { useI18n } from "@/i18n";
import { useLocation, useNavigate } from "react-router-dom";

const items = [
  { label: "حساب الدوام", path: "/hr/attendance/calculate" },
  { label: "تقرير حساب دوام الموظفين", path: "/hr/attendance/monthly" },
  { label: "التحضير الفردي والجماعي", path: "/hr/attendance/individual-group" },
];

export default function AttendanceWorkspaceNav() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="attendance-no-print rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label={t("حساب الدوام")}>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-[#075f94] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-[#075f94] hover:bg-sky-50 hover:text-[#075f94]"
              }`}
            >
              {t(item.label)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
