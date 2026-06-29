import { Building2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { clearStoredAuth, getStoredUser } from "../../utils/auth";
import NotificationBell from "./NotificationBell";

function RoleNavbar({ role }) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const dashboardPath = `/${role}/dashboard`;

  const logout = async () => {
    try {
      await API.post(`/${role}/logout`);
    } finally {
      clearStoredAuth();
      navigate(`/${role}/login`, { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(dashboardPath)}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-label="Open dashboard"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Building2 size={18} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">HostelCare</span>
            <span className="block text-xs capitalize text-slate-500">{role} workspace</span>
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden max-w-40 truncate text-sm text-slate-600 sm:block">
            {user?.name}
          </span>
          <NotificationBell />
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default RoleNavbar;
