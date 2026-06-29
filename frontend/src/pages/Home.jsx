import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  Menu,
  ShieldCheck,
  Smartphone,
  UserCog,
  Wrench,
} from "lucide-react";

const featureCards = [
  {
    icon: ClipboardList,
    title: "Guided issue reporting",
    description:
      "Students can submit clear maintenance requests with titles, details, and optional images.",
  },
  {
    icon: CheckCircle2,
    title: "Live status tracking",
    description:
      "Every complaint moves through a visible workflow from pending to resolved.",
  },
  {
    icon: UserCog,
    title: "Worker assignment",
    description:
      "Admins can assign the right worker and review recommendations for each request.",
  },
  {
    icon: Camera,
    title: "Before and after evidence",
    description:
      "Image uploads help workers diagnose faster and let students verify completed work.",
  },
  {
    icon: Smartphone,
    title: "Responsive access",
    description:
      "The system works cleanly on desktop and mobile so issues can be reported anywhere.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    description:
      "Separate flows keep student, worker, and admin actions organized and secure.",
  },
];

const steps = [
  {
    step: "1",
    title: "Register",
    description: "Create a student account with your hostel and room details.",
  },
  {
    step: "2",
    title: "Report",
    description: "Describe the issue and add a photo when it helps.",
  },
  {
    step: "3",
    title: "Track",
    description: "Follow assignment, progress, and resolution updates.",
  },
  {
    step: "4",
    title: "Confirm",
    description: "Review the completed work and verify the complaint is closed.",
  },
];

const faqs = [
  {
    q: "How do I report an issue?",
    a: "Log in as a student, open the complaint form, add the problem details, and submit it.",
  },
  {
    q: "Can I upload photos?",
    a: "Yes. Photos help the maintenance team understand the issue before they arrive.",
  },
  {
    q: "How do I track progress?",
    a: "Your dashboard shows the latest complaint status, assigned worker, and estimated resolution time.",
  },
  {
    q: "Who manages assignments?",
    a: "Admins review incoming complaints and assign workers based on category and workload.",
  },
];

function Home() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_45%,_#f8fafc_100%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
              <Building2 size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                HostelCare
              </p>
              <p className="text-lg font-semibold text-slate-900">
                Complaint Management
              </p>
            </div>
          </button>

          <div className="relative">
            <button
              onClick={() => setOpen((value) => !value)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
            >
              <Menu size={16} />
              Management Login
            </button>

            {open && (
              <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
                <button
                  onClick={() => navigate("/admin/login")}
                  className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Admin Login
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate("/worker/login")}
                  className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Worker Login
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-24">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              <ShieldCheck size={16} />
              Faster issue reporting for students and staff
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                A cleaner, faster way to manage hostel maintenance from report
                to resolution.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Students can raise complaints in seconds, admins can assign the
                right worker quickly, and maintenance teams can close requests
                with visible proof of completion.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/student/register")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
              >
                Create Student Account
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate("/student/login")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                Student Login
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-blue-100/60 backdrop-blur">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-900 p-5 text-white sm:col-span-2">
                <p className="text-sm uppercase tracking-[0.24em] text-blue-200">
                  Workflow
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  One system for every role
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Structured dashboards for students, admins, and workers keep
                  complaints visible and moving.
                </p>
              </div>

              <button
                onClick={() => navigate("/student/login")}
                className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-left transition hover:border-blue-200 hover:bg-blue-100/70"
              >
                <p className="text-sm font-semibold text-blue-700">Students</p>
                <p className="mt-2 text-sm text-slate-600">
                  Report issues, upload images, and track every complaint.
                </p>
              </button>

              <button
                onClick={() => navigate("/admin/login")}
                className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-left transition hover:border-amber-200 hover:bg-amber-100/70"
              >
                <p className="text-sm font-semibold text-amber-700">Admins</p>
                <p className="mt-2 text-sm text-slate-600">
                  Assign workers, review priority, and monitor progress.
                </p>
              </button>

              <button
                onClick={() => navigate("/worker/login")}
                className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-left transition hover:border-emerald-200 hover:bg-emerald-100/70 sm:col-span-2"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-600 p-3 text-white">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">
                      Workers
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      View assigned work, start tasks, and upload completion
                      proof.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-6 shadow-lg shadow-slate-200/40"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/40">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  How It Works
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                  A simple four-step complaint flow
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-600">
                The product is designed to minimize confusion and make progress
                visible from the first report through final completion.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              {steps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-semibold text-white">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl shadow-slate-900/20">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">
                Support
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Common questions, answered clearly.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The system is built around simple actions: log in, report, track,
                assign, and resolve. The answers here cover the most common
                starting points.
              </p>
            </div>

            <div className="grid gap-4">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-900">
                    {faq.q}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,_#0f172a_0%,_#1d4ed8_100%)] p-10 text-white shadow-2xl shadow-blue-200/40">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">
                  Get Started
                </p>
                <h2 className="mt-3 text-3xl font-semibold">
                  Bring complaint tracking, worker coordination, and resolution
                  updates into one flow.
                </h2>
                <p className="mt-4 text-sm leading-7 text-blue-100">
                  Create a student account to start reporting issues, or sign in
                  as management to oversee the full maintenance pipeline.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate("/student/register")}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Register Now
                </button>
                <button
                  onClick={() => navigate("/admin/login")}
                  className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Open Admin Portal
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/60 bg-white/70 py-8 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          <p>{currentYear} HostelCare. All rights reserved.</p>
          <p>Making hostel maintenance visible, organized, and easier to resolve.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
