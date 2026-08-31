import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import Navbar from "../components/Navbar.jsx";
import { PriorityBadge, StatusBadge } from "../components/StatusBadge.jsx";

const STEPS = ["Pending", "Clustered", "Assigned", "In Progress", "Resolved"];

export default function ComplaintDetail() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/complaints/${id}`).then((res) => {
      setComplaint(res.data.complaint);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="text-center text-slate-400 mt-20">Loading...</p>
      </div>
    );
  }
  if (!complaint) return null;

  const cluster = complaint.cluster;
  const currentStepIndex = STEPS.indexOf(complaint.status === "Rejected" ? "Pending" : complaint.status);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/citizen" className="text-sm text-slate-400 hover:text-accent mb-6 inline-block">
          ← Back to my complaints
        </Link>

        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
            <h1 className="font-display text-xl font-semibold">{complaint.title}</h1>
            <StatusBadge status={complaint.status} />
          </div>
          <p className="text-slate-300 mb-4">{complaint.description}</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <span>📍 {complaint.locationText}</span>
            <span>🏷️ {complaint.category}</span>
            <span>🗓️ {new Date(complaint.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Tracking timeline */}
        <div className="card p-6 mb-6">
          <h2 className="font-display font-semibold mb-5">Status tracking</h2>
          <div className="flex items-center mb-8">
            {STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                      i <= currentStepIndex ? "bg-accent border-accent text-ink" : "border-white/20 text-slate-500"
                    }`}
                  >
                    {i < currentStepIndex ? "✓" : i + 1}
                  </div>
                  <span className={`text-[11px] mt-2 text-center ${i <= currentStepIndex ? "text-slate-200" : "text-slate-500"}`}>
                    {step}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 -mt-5 ${i < currentStepIndex ? "bg-accent" : "bg-white/10"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="space-y-3">
            {[...complaint.statusHistory].reverse().map((h, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                <div>
                  <p className="font-medium">
                    {h.status} <span className="text-slate-500 font-normal">· {new Date(h.at).toLocaleString()}</span>
                  </p>
                  {h.note && <p className="text-slate-400">{h.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Root cause context */}
        {cluster && (
          <div className="card p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h2 className="font-display font-semibold">Root cause context</h2>
              <PriorityBadge priority={cluster.priority} />
            </div>
            <p className="text-slate-300 mb-4">{cluster.rootCauseExplanation}</p>
            <div className="grid grid-cols-3 gap-3 text-sm mb-4">
              <MiniStat label="Affected people" value={cluster.affectedUsers} />
              <MiniStat label="Impact score" value={cluster.impactScore} />
              <MiniStat label="Cluster status" value={cluster.status} />
            </div>
            {cluster.assignedStaff?.name && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm">
                <p>
                  <span className="text-slate-400">Assigned staff: </span>
                  <span className="font-medium">{cluster.assignedStaff.name}</span>
                </p>
                {cluster.dueDate && (
                  <p className="mt-1">
                    <span className="text-slate-400">Expected resolution by: </span>
                    <span className="font-medium">{new Date(cluster.dueDate).toDateString()}</span>
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-4">
              This issue was identified by RootCauseAI as part of a broader problem affecting multiple residents in your area,
              rather than being handled as an isolated complaint.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
      <p className="text-lg font-display font-semibold">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
