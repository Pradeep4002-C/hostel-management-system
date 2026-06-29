import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Plus, Search, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InfoPill, MediaTile, PriorityBadge, StatusBadge } from "../components/dashboard/DashboardPrimitives";
import RoleNavbar from "../components/navigation/RoleNavbar";
import API from "../services/api";
import { clearStoredAuth } from "../utils/auth";

const workerTypes = ["electrical", "plumbing", "carpentry", "cleaning"];
const nextStatus = { assigned: "in_progress", in_progress: "resolved" };

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", workerType: "" });
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setError("");
    try {
      const [complaintResponse, workerResponse] = await Promise.all([
        API.get("/admin/complaints"),
        API.get("/admin/workers"),
      ]);
      setComplaints(complaintResponse.data.data);
      setWorkers(workerResponse.data.data);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearStoredAuth();
        navigate("/admin/login", { replace: true });
        return;
      }
      setError("Dashboard data could not be loaded. Please try again.");
    } finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const visibleComplaints = useMemo(() => complaints.filter((complaint) => {
    const matchesStatus = status === "all" || (status === "active" ? complaint.status !== "resolved" : complaint.status === status);
    const text = `${complaint.title} ${complaint.student?.name || ""} ${complaint.category}`.toLowerCase();
    return matchesStatus && text.includes(query.trim().toLowerCase());
  }), [complaints, query, status]);

  const createWorker = async (event) => {
    event.preventDefault();
    setError("");
    setBusyId("worker-form");
    try {
      await API.post("/admin/workers", form);
      setForm({ name: "", email: "", password: "", workerType: "" });
      setShowWorkerForm(false);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Worker could not be created.");
    } finally { setBusyId(""); }
  };

  const assign = async (complaintId, workerId) => {
    if (!workerId) return;
    setBusyId(complaintId);
    try { await API.patch(`/complaint/${complaintId}/assign`, { workerId }); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Worker could not be assigned."); }
    finally { setBusyId(""); }
  };

  const advance = async (complaint) => {
    const newStatus = nextStatus[complaint.status];
    if (!newStatus) return;
    setBusyId(complaint._id);
    try { await API.patch(`/admin/complaints/${complaint._id}/status`, { status: newStatus }); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Status could not be updated."); }
    finally { setBusyId(""); }
  };

  const reviewPriority = async (complaintId, priority) => {
    setBusyId(complaintId);
    try { await API.patch(`/admin/complaints/${complaintId}/priority`, { priority }); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Priority could not be updated."); }
    finally { setBusyId(""); }
  };

  const active = complaints.filter(({ status: value }) => value !== "resolved").length;
  const urgent = complaints.filter(({ status: value, priorityLabel }) => value !== "resolved" && ["high", "critical"].includes(priorityLabel)).length;

  return (
    <>
      <RoleNavbar role="admin" />
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="flex flex-col gap-5 rounded-3xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm text-slate-300">Operations overview</p><h1 className="mt-1 text-2xl font-semibold">Complaint management</h1><p className="mt-2 text-sm text-slate-300">Prioritize requests, assign workers, and keep work moving.</p></div>
            <button onClick={() => setShowWorkerForm(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold hover:bg-blue-500"><Plus size={18} /> Add worker</button>
          </section>

          <section className="my-6 grid grid-cols-3 gap-3" aria-label="Operations summary">
            {[[ClipboardList, "Active", active], [AlertTriangle, "Urgent", urgent], [Users, "Workers", workers.length]].map(([Icon, label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><Icon size={18} className="text-slate-500" /><p className="mt-3 text-2xl font-semibold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>)}
          </section>

          <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center">
            <label className="relative flex-1"><span className="sr-only">Search complaints</span><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, student, or category" className="min-h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status" className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="active">Active</option><option value="pending">Pending</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="all">All complaints</option></select>
          </section>

          {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error} <button onClick={load} className="font-semibold underline">Retry</button></p>}
          {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading dashboard…</div> : visibleComplaints.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold">No matching complaints</h2><p className="mt-1 text-sm text-slate-500">Try another search or filter.</p></div> : (
            <div className="space-y-4">
              {visibleComplaints.map((complaint) => (
                <article key={complaint._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0"><div className="flex flex-wrap gap-2"><PriorityBadge priority={complaint.priorityLabel} /><StatusBadge status={complaint.status} />{complaint.duplicateCandidate && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Possible duplicate</span>}</div><h2 className="mt-3 text-lg font-semibold">{complaint.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{complaint.description}</p><p className="mt-2 text-sm text-slate-500">{complaint.student?.name || "Unknown student"} · Block {complaint.student?.hostelBlock || "–"}, room {complaint.student?.roomNumber || "–"}</p></div>
                    <div className="w-full shrink-0 space-y-2 lg:w-64">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Reviewed priority<select aria-label={`Priority for ${complaint.title}`} value={complaint.priorityLabel} disabled={busyId === complaint._id} onChange={(event) => reviewPriority(complaint._id, event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium capitalize"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                      {!complaint.assignedWorker ? <select disabled={busyId === complaint._id} defaultValue="" onChange={(event) => assign(complaint._id, event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="" disabled>Assign a worker</option>{workers.map((worker) => <option key={worker._id} value={worker._id}>{worker.name} · {worker.workerType}</option>)}</select> : nextStatus[complaint.status] ? <button disabled={busyId === complaint._id} onClick={() => advance(complaint)} className="min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{complaint.status === "assigned" ? "Mark in progress" : "Mark resolved"}</button> : null}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3"><InfoPill label="Category" value={complaint.category} tone="blue" /><InfoPill label="Assigned to" value={complaint.assignedWorker?.name || "Not assigned"} tone={complaint.assignedWorker ? "green" : "slate"} /><InfoPill label="Expected time" value={complaint.estimatedResolutionRange || "To be confirmed"} tone="amber" /></div>
                  {(complaint.categoryMismatch || complaint.recommendedWorker) && <details className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm"><summary className="cursor-pointer font-semibold text-slate-700">Routing details</summary><div className="mt-3 space-y-2 text-slate-600">{complaint.categoryMismatch && <p>Suggested category: <strong>{complaint.predictedCategory}</strong></p>}{complaint.recommendedWorker && <p>Recommended worker: <strong>{complaint.recommendedWorker.name}</strong> ({complaint.recommendedWorker.workerType})</p>}</div></details>}
                  {(complaint.image || complaint.afterImage) && <div className="mt-4 grid gap-4 sm:grid-cols-2">{complaint.image && <MediaTile title="Reported photo" src={complaint.image} alt="Reported issue" accent="blue" />}{complaint.afterImage && <MediaTile title="Completion photo" src={complaint.afterImage} alt="Completed work" accent="green" />}</div>}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {showWorkerForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="worker-title"><form onSubmit={createWorker} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="worker-title" className="text-xl font-semibold">Add worker</h2><p className="mt-1 text-sm text-slate-500">Create role-specific access.</p></div><button type="button" aria-label="Close" onClick={() => setShowWorkerForm(false)} className="rounded-xl p-2 hover:bg-slate-100"><X size={20} /></button></div><div className="mt-5 space-y-4">{[["name", "Full name", "text"], ["email", "Email", "email"], ["password", "Temporary password", "password"]].map(([name, label, type]) => <label key={name} className="block text-sm font-medium text-slate-700">{label}<input type={type} autoComplete={name === "password" ? "new-password" : name} minLength={name === "password" ? 8 : undefined} maxLength={name === "email" ? 254 : name === "password" ? 128 : 80} value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>)}<label className="block text-sm font-medium text-slate-700">Skill<select value={form.workerType} onChange={(event) => setForm({ ...form, workerType: event.target.value })} required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="">Select skill</option>{workerTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><button disabled={busyId === "worker-form"} className="min-h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busyId ? "Creating…" : "Create worker"}</button></div></form></div>}
    </>
  );
}
