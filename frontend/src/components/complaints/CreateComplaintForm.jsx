import { useRef, useState } from "react";
import API from "../../services/api";

function CreateComplaintForm({ onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    image: null,
  });
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: "", message: "" });
    setSubmitting(true);

    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("category", form.category);

    if (form.image) {
      formData.append("image", form.image);
    }

    try {
      const response = await API.post("/complaint", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const complaint = response.data?.data;
      setForm({
        title: "",
        description: "",
        category: "",
        image: null,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onSuccess?.(complaint);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "Complaint could not be submitted.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-5">
        {feedback.message && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {feedback.message}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Complaint title
            </label>
            <input
              placeholder="e.g. Water leak near sink"
              className="mt-2 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              value={form.title}
              minLength={3}
              maxLength={120}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              required
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Description
            </label>
            <textarea
              placeholder="Describe what is happening, where it is happening, and how urgent it feels."
              className="mt-2 min-h-28 w-full resize-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              value={form.description}
              minLength={10}
              maxLength={2000}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              required
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Category
            </label>
            <select
              className="mt-2 w-full bg-transparent text-sm text-slate-900 outline-none"
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
              required
            >
              <option value="">Select category</option>
              <option value="electrical">Electrical</option>
              <option value="plumbing">Plumbing</option>
              <option value="carpentry">Carpentry</option>
              <option value="cleaning">Cleaning</option>
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Photo
            </label>
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
              onChange={(event) =>
                setForm({ ...form, image: event.target.files?.[0] || null })
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Clear details and an image usually improve routing and ETA accuracy.
          </p>
          <button disabled={submitting} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {submitting ? "Submitting…" : "Submit complaint"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateComplaintForm;
