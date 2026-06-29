import { Building2 } from "lucide-react";
import AuthBackHome from "../navigation/AuthBackHome";

export default function AuthLayout({ icon: Icon, title, subtitle, children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-20 sm:py-24">
      <AuthBackHome />
      <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            {Icon ? <Icon size={22} /> : <Building2 size={22} />}
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
