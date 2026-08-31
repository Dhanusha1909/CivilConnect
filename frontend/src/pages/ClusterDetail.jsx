import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import Navbar from "../components/Navbar.jsx";
import { PriorityBadge, StatusBadge } from "../components/StatusBadge.jsx";
import ComplaintGraph from "../components/ComplaintGraph.jsx";

const STATUS_FLOW = ["Open", "Assigned", "In Progress", "Resolved"];

export default function ClusterDetail() {
  const { id } = useParams();
  const [cluster, setCluster] = useState(null);
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    const res = await api.get(`/clusters/${id}`);
    setCluster(res.data.cluster);
    setGraph(res.data.graph);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(status) {
    setBusy(true);
    try {
      await api.put(`/clusters/${id}/status`, { status, note });
      setNote("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function regenerateInsight() {
    setBusy(true);
    try {
      await api.post(`/clusters/${id}/regenerate-insight`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading || !cluster) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="text-center text-slate-400 mt-20">Loading...</p>
      </div>
    );
  }

  const nextStatusIndex = STATUS_FLOW.indexOf(cluster.status) + 1;
  const nextStatus = STATUS_FLOW[nextStatusIndex];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <Link to="/officer" className="text-sm text-slate-400 hover:text-accent mb-6 inline-block">
          ← Back to dashboard
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PriorityBadge priority={cluster.priority} />
              <StatusBadge status={cluster.status} />
              <span className="badge bg-white/5 border border-white/10 text-slate-300">
                {cluster.insightSource === "ai" ? "AI-generated insight" : "Heuristic insight"}
              </span>
            </div>
            <h1 className="font-display text-2xl font-semibold">{cluster.rootCauseLabel}</h1>
            <p className="text-slate-400 text-sm mt-1">
              📍 {cluster.representativeLocation} · {cluster.category} · {cluster.complaints.length} linked complaints
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-display font-semibold">{cluster.impactScore}</p>
            <p className="text-xs text-slate-500">Impact Score</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 card p-6">
            <h2 className="font-display font-semibold mb-3">Complaint-to-Cause Graph</h2>
            <ComplaintGraph graph={graph} />
          </div>
          <div className="space-y-4">
            <MetricCard label="Severity" value={`${cluster.severity} / 10`} />
            <MetricCard label="Affected users" value={cluster.affectedUsers} />
            <MetricCard label="Recurrence score" value={cluster.recurrenceScore} />
            <MetricCard label="Urgency factor" value={cluster.urgencyFactor} />
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold">Root cause explanation</h2>
            <button onClick={regenerateInsight} disabled={busy} className="btn-ghost text-xs">
              ↻ Regenerate insight
            </button>
          </div>
          <p className="text-slate-300 mb-4">{cluster.rootCauseExplanation}</p>
          <div className="rounded-xl bg-accent/5 border border-accent/20 p-4">
            <p className="text-sm font-medium text-accent mb-1">Recommended action</p>
            <p className="text-sm text-slate-300">{cluster.recommendedAction}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="card p-6">
            <h2 className="font-display font-semibold mb-4">Assign staff</h2>
            {cluster.assignedStaff?.name ? (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm mb-3">
                <p>
                  <span className="text-slate-400">Staff: </span>
                  <span className="font-medium">{cluster.assignedStaff.name}</span>
                </p>
                {cluster.assignedStaff.contact && (
                  <p className="mt-1">
                    <span className="text-slate-400">Contact: </span>
                    {cluster.assignedStaff.contact}
                  </p>
                )}
                {cluster.dueDate && (
                  <p className="mt-1">
                    <span className="text-slate-400">Due: </span>
                    {new Date(cluster.dueDate).toDateString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-slate-400 text-sm mb-3">No staff assigned yet.</p>
            )}
            <button onClick={() => setShowAssign(true)} className="btn-secondary w-full">
              {cluster.assignedStaff?.name ? "Reassign staff" : "Appoint staff & due date"}
            </button>
          </div>

          <div className="card p-6">
            <h2 className="font-display font-semibold mb-4">Update status</h2>
            <textarea
              className="input min-h-[70px] mb-3"
              placeholder="Optional note (visible to citizens)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-3">
              {nextStatus && (
                <button onClick={() => updateStatus(nextStatus)} disabled={busy} className="btn-primary flex-1">
                  Mark as "{nextStatus}"
                </button>
              )}
              {cluster.status !== "Resolved" && (
                <button onClick={() => updateStatus("Resolved")} disabled={busy} className="btn-secondary flex-1">
                  Mark Resolved
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Updating status here propagates to every complaint linked to this root cause.
            </p>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-display font-semibold mb-4">Linked complaints ({cluster.complaints.length})</h2>
          <div className="space-y-3">
            {cluster.complaints.map((c) => (
              <div key={c._id} className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{c.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{c.description}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    By {c.citizen?.name || "citizen"} · {new Date(c.createdAt).toLocaleDateString()}
                    {c.similarityToCluster != null && ` · similarity ${(c.similarityToCluster * 100).toFixed(0)}%`}
                    {c.isDuplicateOf && " · flagged as duplicate"}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      </main>

      {showAssign && (
        <AssignModal
          clusterId={id}
          onClose={() => setShowAssign(false)}
          onDone={() => {
            setShowAssign(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className="text-xl font-display font-semibold mt-1">{value}</p>
    </div>
  );
}

function AssignModal({ clusterId, onClose, onDone }) {
  const [staffName, setStaffName] = useState("");
  const [staffContact, setStaffContact] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post(`/clusters/${clusterId}/assign`, { staffName, staffContact, dueDate, note });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign staff");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl font-semibold mb-4">Appoint staff</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Staff name</label>
            <input className="input" value={staffName} onChange={(e) => setStaffName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Contact (optional)</label>
            <input className="input" value={staffContact} onChange={(e) => setStaffContact(e.target.value)} />
          </div>
          <div>
            <label className="label">Due date</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p className="text-sm text-critical bg-critical/10 border border-critical/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? "Assigning..." : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
