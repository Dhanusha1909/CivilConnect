import React from "react";

const PRIORITY_CLASS = {
  Critical: "badge-critical",
  High: "badge-high",
  Medium: "badge-medium",
  Low: "badge-low",
};

const STATUS_DOT = {
  Pending: "bg-slate-400",
  Clustered: "bg-accent2",
  Open: "bg-accent2",
  Assigned: "bg-medium",
  "In Progress": "bg-high",
  Resolved: "bg-low",
  Rejected: "bg-critical",
};

export function PriorityBadge({ priority }) {
  return <span className={`badge ${PRIORITY_CLASS[priority] || "badge-low"}`}>{priority}</span>;
}

export function StatusBadge({ status }) {
  return (
    <span className="badge bg-white/5 text-slate-200 border border-white/10">
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || "bg-slate-400"}`} />
      {status}
    </span>
  );
}
