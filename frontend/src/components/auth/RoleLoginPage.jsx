import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { setStoredAuth } from "../../utils/auth";
import AuthLayout from "./AuthLayout";

const fieldClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function RoleLoginPage({ role, icon, title, subtitle, allowRegister = false }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await API.post(`/${role}/login`, form);
      const payload = response.data.data;
      const user = payload.user || payload.worker;
      setStoredAuth({ token: payload.accessToken, user });
      navigate(`/${role}/dashboard`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout icon={icon} title={title} subtitle={subtitle}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {error}
          </p>
        )}
        <label className="block text-sm font-medium text-slate-700">
          <span className="inline-flex items-center gap-2"><Mail size={15} /> Email</span>
          <input
            type="email"
            autoComplete="email"
            className={fieldClass}
            placeholder={`${role}@example.com`}
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="inline-flex items-center gap-2"><Lock size={15} /> Password</span>
          <input
            type="password"
            autoComplete="current-password"
            className={fieldClass}
            placeholder="Enter your password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {allowRegister && (
        <p className="mt-6 text-center text-sm text-slate-500">
          New student?{" "}
          <button type="button" onClick={() => navigate("/student/register")} className="font-semibold text-blue-700 hover:underline">
            Create an account
          </button>
        </p>
      )}
    </AuthLayout>
  );
}
