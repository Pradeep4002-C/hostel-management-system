import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import API from "../services/api";

const fields = [
  ["name", "Full name", "text", "name"],
  ["email", "Email address", "email", "email"],
  ["password", "Password (8+ characters)", "password", "new-password"],
  ["phoneNumber", "Phone number", "tel", "tel"],
  ["hostelBlock", "Hostel block", "text", "organization"],
  ["roomNumber", "Room number", "text", "off"],
];

export default function StudentRegister() {
  const [form, setForm] = useState(Object.fromEntries(fields.map(([name]) => [name, ""])));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("/student/register", form);
      navigate("/student/login", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout icon={UserPlus} title="Create student account" subtitle="Use your current hostel and room details.">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 sm:col-span-2">{error}</p>}
        {fields.map(([name, label, type, autoComplete]) => (
          <label key={name} className={`block text-sm font-medium text-slate-700 ${["name", "email", "password"].includes(name) ? "sm:col-span-2" : ""}`}>
            {label}
            <input
              type={type}
              autoComplete={autoComplete}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              value={form[name]}
              maxLength={name === "email" ? 254 : name === "password" ? 128 : 80}
              minLength={name === "password" ? 8 : undefined}
              onChange={(event) => setForm({ ...form, [name]: event.target.value })}
              required
            />
          </label>
        ))}
        <button disabled={loading} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-2">
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{" "}
        <button type="button" onClick={() => navigate("/student/login")} className="font-semibold text-blue-700 hover:underline">Sign in</button>
      </p>
    </AuthLayout>
  );
}
