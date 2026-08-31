import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../api/axios.js";
import Navbar from "../components/Navbar.jsx";
import { PriorityBadge, StatusBadge } from "../components/StatusBadge.jsx";

const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export default function OfficerDashboard() {
  const [clusters, setClusters] = useState([]);
  const [summary, setSummary] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = {};
    if (priorityFilter) params.priority = priorityFilter;
    if (statusFilter) params.status = statusFilter;
    const [clustersRes, summaryRes] = await Promise.all([
      api.get("/clusters", { params }),
      api.get("/clusters/stats/summary"),
    ]);
    setClusters(clustersRes.data.clusters);
    setSummary(summaryRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorityFilter, statusFilter]);

  const chartData = (summary?.priorityCounts || []).map((p) => ({ name: p._id, count: p.count }));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold">Root Cause Intelligence Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Issues ranked by Impact Score = Severity × Affected Users × Recurrence × Urgency
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total root causes" value={summary.totalClusters} />
            <StatCard label="Open" value={summary.open} />
            <StatCard label="Assigned" value={summary.assigned} accent />
            <StatCard label="In progress" value={summary.inProgress} />
            <StatCard label="Resolved" value={summary.resolved} />
          </div>
        )}

        {chartData.length > 0 && (
          <div className="card p-6 mb-8">
            <h2 className="font-display font-semibold mb-4">Root causes by priority</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#5eead4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap mb-5">
          <h2 className="font-display font-semibold text-lg mr-auto">Prioritized issues</h2>
          <select className="input w-auto text-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select className="input w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {["Open", "Assigned", "In Progress", "Resolved"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : clusters.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">No root-cause clusters match these filters yet.</div>
        ) : (
          <div className="space-y-3">
            {clusters.map((c) => (
              <Link
                to={`/officer/clusters/${c._id}`}
                key={c._id}
                className="card p-5 flex items-start justify-between gap-4 hover:border-accent/30 transition group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-slate-500">Impact score: {c.impactScore}</span>
                  </div>
                  <h3 className="font-medium group-hover:text-accent transition">{c.rootCauseLabel}</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {c.complaints.length} linked complaint(s) · {c.affectedUsers} people affected · {c.category}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-display font-semibold">{c.impactScore}</p>
                  <p className="text-xs text-slate-500">impact score</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="card p-4">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className={`text-2xl font-display font-semibold mt-1 ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}
