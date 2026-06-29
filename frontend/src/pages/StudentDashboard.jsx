import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Clock3, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RoleNavbar from "../components/navigation/RoleNavbar";
import { InfoPill, MediaTile, StatusBadge } from "../components/dashboard/DashboardPrimitives";
import API from "../services/api";
import { clearStoredAuth, getStoredUser } from "../utils/auth";
import CreateComplaintForm from "../components/complaints/CreateComplaintForm";

const formatDate = (value) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function StudentDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const user = getStoredUser();
  const navigate = useNavigate();

  const loadComplaints = useCallback(async () => {
    setError("");
    try {
      const response = await API.get("/student/complaints");
      setComplaints(response.data.data);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearStoredAuth();
        navigate("/student/login", { replace: true });
        return;
      }
      setError("Complaints could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadComplaints(); }, [loadComplaints]);

  const activeCount = complaints.filter(({ status }) => status !== "resolved").length;
  const resolvedCount = complaints.length - activeCount;

  return (
    <>
      <RoleNavbar role="student" />
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="flex flex-col gap-5 rounded-3xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-300">Hostel {user?.hostelBlock} · Room {user?.roomNumber}</p>
              <h1 className="mt-1 text-2xl font-semibold">Hello, {user?.name?.split(" ")[0] || "student"}</h1>
              <p className="mt-2 text-sm text-slate-300">Report maintenance issues and follow their progress.</p>
            </div>
            <button onClick={() => setShowForm(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold hover:bg-blue-500">
              <Plus size={18} /> New complaint
            </button>
          </section>

          <section aria-label="Complaint summary" className="my-6 grid grid-cols-3 gap-3">
            {[
              [ClipboardList, "Total", complaints.length],
              [Clock3, "Active", activeCount],
              [CheckCircle2, "Resolved", resolvedCount],
            ].map(([Icon, label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <Icon size={18} className="text-slate-500" />
                <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
                <p className="text-xs font-medium text-slate-500">{label}</p>
              </div>
            ))}
          </section>

          <div className="mb-4 flex items-end justify-between gap-4">
            <div><h2 className="text-xl font-semibold text-slate-950">My complaints</h2><p className="mt-1 text-sm text-slate-500">Newest requests appear first.</p></div>
          </div>

          {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error} <button onClick={loadComplaints} className="font-semibold underline">Retry</button></div>}
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading complaints…</div>
          ) : complaints.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <ClipboardList className="mx-auto text-slate-300" size={36} />
              <h3 className="mt-4 font-semibold text-slate-800">No complaints yet</h3>
              <p className="mt-1 text-sm text-slate-500">Create one when something in your room or hostel needs attention.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.map((complaint) => (
                <article key={complaint._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={complaint.status} /><span className="text-xs text-slate-500">{formatDate(complaint.createdAt)}</span></div>
                      <h3 className="mt-3 text-lg font-semibold text-slate-950">{complaint.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{complaint.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <InfoPill label="Category" value={complaint.category} tone="blue" />
                    <InfoPill label="Assigned to" value={complaint.assignedWorker?.name || "Waiting for assignment"} tone={complaint.assignedWorker ? "green" : "slate"} />
                    <InfoPill label="Expected time" value={complaint.estimatedResolutionRange || "To be confirmed"} tone="amber" />
                  </div>
                  {complaint.categoryMismatch && <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-700">This may be a {complaint.predictedCategory} issue. The admin will review it.</p>}
                  {(complaint.image || complaint.afterImage) && <div className="mt-4 grid gap-4 sm:grid-cols-2">{complaint.image && <MediaTile title="Reported photo" src={complaint.image} alt="Reported maintenance issue" accent="blue" />}{complaint.afterImage && <MediaTile title="Completion photo" src={complaint.afterImage} alt="Completed maintenance work" accent="green" />}</div>}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="new-complaint-title">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-5">
              <div><h2 id="new-complaint-title" className="text-xl font-semibold">New complaint</h2><p className="text-sm text-slate-500">Describe the problem clearly.</p></div>
              <button aria-label="Close" onClick={() => setShowForm(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="p-5"><CreateComplaintForm onSuccess={() => { setShowForm(false); loadComplaints(); }} /></div>
          </div>
        </div>
      )}
    </>
  );
}
