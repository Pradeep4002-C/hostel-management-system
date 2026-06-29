import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, MapPin, Play, Upload, Wrench, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InfoPill, MediaTile, StatusBadge } from "../components/dashboard/DashboardPrimitives";
import RoleNavbar from "../components/navigation/RoleNavbar";
import API from "../services/api";
import { clearStoredAuth, getStoredUser } from "../utils/auth";

export default function WorkerDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [selected, setSelected] = useState(null);
  const [image, setImage] = useState(null);
  const worker = getStoredUser();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await API.get("/worker/complaints");
      setComplaints(response.data.data);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearStoredAuth();
        navigate("/worker/login", { replace: true });
        return;
      }
      setError("Assignments could not be loaded. Please try again.");
    } finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const start = async (complaint) => {
    setBusyId(complaint._id);
    try {
      await API.patch(`/worker/complaints/${complaint._id}/status`, { status: "in_progress" });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The task could not be started.");
    } finally { setBusyId(""); }
  };

  const complete = async (event) => {
    event.preventDefault();
    if (!selected || !image) return;
    setBusyId(selected._id);
    const data = new FormData();
    data.append("image", image);
    try {
      await API.patch(`/worker/complaints/${selected._id}/complete`, data);
      setSelected(null);
      setImage(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Completion proof could not be submitted.");
    } finally { setBusyId(""); }
  };

  const ready = complaints.filter(({ status }) => status === "assigned").length;
  const active = complaints.filter(({ status }) => status === "in_progress").length;

  return (
    <>
      <RoleNavbar role="worker" />
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl bg-slate-900 p-6 text-white">
            <p className="text-sm text-slate-300">{worker?.workerType || "Maintenance"} team</p>
            <h1 className="mt-1 text-2xl font-semibold">Assignments for {worker?.name || "worker"}</h1>
            <p className="mt-2 text-sm text-slate-300">Start assigned work and add a clear photo when it is complete.</p>
          </section>

          <section className="my-6 grid grid-cols-3 gap-3" aria-label="Assignment summary">
            {[[Wrench, "Total", complaints.length], [Clock3, "Ready", ready], [Play, "Active", active]].map(([Icon, label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><Icon size={18} className="text-slate-500" /><p className="mt-3 text-2xl font-semibold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
            ))}
          </section>

          <h2 className="mb-4 text-xl font-semibold">Work queue</h2>
          {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error} <button onClick={load} className="font-semibold underline">Retry</button></p>}
          {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading assignments…</div> : complaints.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={36} /><h3 className="mt-3 font-semibold">Your queue is clear</h3><p className="mt-1 text-sm text-slate-500">New assignments will appear here.</p></div>
          ) : (
            <div className="space-y-4">
              {complaints.map((complaint) => (
                <article key={complaint._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><StatusBadge status={complaint.status} /><h3 className="mt-3 text-lg font-semibold">{complaint.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{complaint.description}</p><p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700"><MapPin size={15} /> Block {complaint.student?.hostelBlock || "–"}, room {complaint.student?.roomNumber || "–"}</p></div>
                    <div className="flex shrink-0 gap-2">
                      {complaint.status === "assigned" && <button disabled={busyId === complaint._id} onClick={() => start(complaint)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Play size={16} /> Start work</button>}
                      {complaint.status === "in_progress" && <button onClick={() => setSelected(complaint)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"><Upload size={16} /> Complete</button>}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3"><InfoPill label="Student" value={complaint.student?.name || "Unknown"} /><InfoPill label="Category" value={complaint.category} tone="blue" /><InfoPill label="Expected time" value={complaint.estimatedResolutionRange || "To be confirmed"} tone="amber" /></div>
                  {(complaint.image || complaint.afterImage) && <div className="mt-4 grid gap-4 sm:grid-cols-2">{complaint.image && <MediaTile title="Reported photo" src={complaint.image} alt="Reported issue" accent="blue" />}{complaint.afterImage && <MediaTile title="Completion photo" src={complaint.afterImage} alt="Completed work" accent="green" />}</div>}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="complete-title"><form onSubmit={complete} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="complete-title" className="text-xl font-semibold">Complete task</h2><p className="mt-1 text-sm text-slate-500">Upload a clear photo of the finished work.</p></div><button type="button" aria-label="Close" onClick={() => { setSelected(null); setImage(null); }} className="rounded-xl p-2 hover:bg-slate-100"><X size={20} /></button></div><input type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setImage(event.target.files?.[0] || null)} className="mt-5 w-full rounded-xl border border-slate-300 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white" /><button disabled={!image || busyId === selected._id} className="mt-5 min-h-11 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{busyId ? "Submitting…" : "Submit completion proof"}</button></form></div>}
    </>
  );
}
