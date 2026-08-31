import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import Navbar from "../components/Navbar.jsx";
import { PriorityBadge, StatusBadge } from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get("/complaints/my");
    setComplaints(res.data.complaints);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const stats = {
    total: complaints.length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
    active: complaints.filter((c) => !["Resolved", "Rejected"].includes(c.status)).length,
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl font-semibold">Hi, {user?.name?.split(" ")[0]} 👋</h1>
            <p className="text-slate-400 text-sm mt-1">Track your complaints and report new issues.</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + New complaint
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Total submitted" value={stats.total} />
          <StatCard label="Active" value={stats.active} accent />
          <StatCard label="Resolved" value={stats.resolved} />
        </div>

        <h2 className="font-display font-semibold text-lg mb-4">Your complaints</h2>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : complaints.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">
            <p className="mb-4">You haven't submitted any complaints yet.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              Submit your first complaint
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <Link
                to={`/citizen/complaints/${c._id}`}
                key={c._id}
                className="card p-5 flex items-start justify-between gap-4 hover:border-accent/30 transition group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h3 className="font-medium group-hover:text-accent transition truncate">{c.title}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{c.description}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    📍 {c.locationText} · {c.category} · {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                  {c.cluster && (
                    <p className="text-xs text-accent2 mt-2">
                      Linked to root cause: <span className="font-medium">{c.cluster.rootCauseLabel}</span> ·{" "}
                      {c.cluster.affectedUsers} people affected
                    </p>
                  )}
                </div>
                {c.cluster && <PriorityBadge priority={c.cluster.priority} />}
              </Link>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <ComplaintFormModal
          onClose={() => setShowForm(false)}
          onSubmitted={() => {
            setShowForm(false);
            load();
          }}
          defaultAddress={user?.address}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="card p-5">
      <p className="text-slate-400 text-sm">{label}</p>
      <p className={`text-3xl font-display font-semibold mt-1 ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

function ComplaintFormModal({ onClose, onSubmitted, defaultAddress }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Other",
    locationText: defaultAddress || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get("/complaints/categories").then((res) => setCategories(res.data.categories));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/complaints", form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit complaint");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-8" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {result ? (
          <div>
            <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center text-2xl mb-4">✅</div>
            <h3 className="font-display text-xl font-semibold mb-2">Complaint analyzed</h3>
            <p className="text-slate-300 text-sm mb-4">{result.message}</p>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2 text-sm">
              <p>
                <span className="text-slate-400">Detected root cause: </span>
                <span className="font-medium text-accent">{result.cluster.rootCauseLabel}</span>
              </p>
              <p>
                <span className="text-slate-400">People affected by this issue: </span>
                <span className="font-medium">{result.cluster.affectedUsers}</span>
              </p>
              <p>
                <span className="text-slate-400">Priority assigned: </span>
                <span className="font-medium">{result.cluster.priority}</span>
              </p>
            </div>
            <button onClick={onSubmitted} className="btn-primary w-full mt-5">
              View my complaints
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-display text-xl font-semibold mb-1">Report an issue</h3>
            <p className="text-slate-400 text-sm mb-5">
              Our AI will analyze your report, match it against related complaints, and infer the underlying root cause.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} required placeholder="e.g. Water leaking near Block A" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => update("description", e.target.value)} required placeholder="Describe what you observed, when, and any safety concerns..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={(e) => update("category", e.target.value)}>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input" value={form.locationText} onChange={(e) => update("locationText", e.target.value)} required placeholder="e.g. Block A" />
                </div>
              </div>
              {error && <p className="text-sm text-critical bg-critical/10 border border-critical/20 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Analyzing..." : "Submit complaint"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
