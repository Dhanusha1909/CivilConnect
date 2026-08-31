import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-7xl mx-auto w-full px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center font-display font-bold text-ink text-sm">
            R
          </div>
          <span className="font-display font-semibold text-lg">RootCause<span className="text-accent">AI</span></span>
        </div>
        <div className="flex gap-3">
          <Link to="/login" className="btn-ghost text-sm">Log in</Link>
          <Link to="/register" className="btn-primary text-sm">Get started</Link>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-4xl mx-auto px-6 text-center py-20">
          <span className="badge bg-white/5 border border-white/10 text-slate-300 mb-6">
            AI-Based Root-Cause Discovery
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight mb-6">
            Thousands of complaints,<br /> one underlying <span className="text-accent">root cause</span>.
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
            RootCauseAI clusters differently-worded complaints, infers the real problem behind them,
            and ranks issues by actual impact — not just complaint volume — so officers fix what matters most.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/register" className="btn-primary">Report an issue</Link>
            <Link to="/login" className="btn-secondary">Officer sign in</Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-16 text-left">
            <Feature title="Semantic clustering" desc="NLP + TF-IDF similarity groups differently-worded complaints describing the same issue." />
            <Feature title="Impact scoring" desc="Severity × affected users × recurrence × urgency — not just complaint count." />
            <Feature title="Full traceability" desc="Citizens track status live; officers assign staff and resolve at the root-cause level." />
          </div>
        </div>
      </main>
    </div>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-slate-400">{desc}</p>
    </div>
  );
}
