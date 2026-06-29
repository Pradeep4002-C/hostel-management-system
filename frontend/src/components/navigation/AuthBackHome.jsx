import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

function AuthBackHome({ variant = "light" }) {
  const navigate = useNavigate();
  const isDark = variant === "dark";

  return (
    <button
      type="button"
      onClick={() => navigate("/", { replace: true })}
      className={`fixed left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition sm:left-6 sm:top-6 ${
        isDark
          ? "border border-white/15 bg-white/10 text-white hover:bg-white/20"
          : "border border-slate-200 bg-white/90 text-slate-700 hover:bg-white"
      }`}
      aria-label="Back to home"
    >
      <ArrowLeft size={16} />
      Home
    </button>
  );
}

export default AuthBackHome;
