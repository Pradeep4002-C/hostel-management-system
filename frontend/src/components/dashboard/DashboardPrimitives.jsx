const toneClasses = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
  violet: "bg-violet-50 text-violet-700 border-violet-100",
};

const statuses = {
  pending: ["Pending", "bg-rose-50 text-rose-700 border-rose-100"],
  assigned: ["Assigned", "bg-amber-50 text-amber-700 border-amber-100"],
  in_progress: ["In progress", "bg-blue-50 text-blue-700 border-blue-100"],
  resolved: ["Resolved", "bg-emerald-50 text-emerald-700 border-emerald-100"],
};

const priorities = {
  critical: "bg-rose-600 text-white",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-slate-100 text-slate-700",
};

const mediaUrl = (src) => {
  if (!src?.startsWith("/")) return src;
  const api = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5001/api/v1`;
  return `${api.replace(/\/api\/v1\/?$/, "")}${src}`;
};

export function StatusBadge({ status }) {
  const [label, className] = statuses[status] || [status, toneClasses.slate];
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${priorities[priority] || priorities.medium}`}>{priority || "medium"} priority</span>;
}

export function InfoPill({ label, value, tone = "slate" }) {
  return <div className={`rounded-xl border px-3 py-2.5 text-sm ${toneClasses[tone] || toneClasses.slate}`}><p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p><p className="mt-1 truncate font-medium capitalize" title={String(value)}>{value}</p></div>;
}

export function MediaTile({ title, subtitle, src, alt }) {
  const url = mediaUrl(src);
  return <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><figcaption className="border-b border-slate-100 px-4 py-3"><p className="text-sm font-semibold">{title}</p>{subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}</figcaption><a href={url} target="_blank" rel="noreferrer"><img src={url} alt={alt} loading="lazy" className="h-48 w-full object-cover" /></a></figure>;
}
