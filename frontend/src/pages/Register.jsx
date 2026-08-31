import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const [role, setRole] = useState("citizen");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    department: "",
    officerCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { ...form, role });
      login(res.data.token, res.data.user);
      navigate(role === "officer" ? "/officer" : "/citizen");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center font-display font-bold text-ink text-xl mb-4">
            R
          </div>
          <h1 className="font-display text-2xl font-semibold">Create your account</h1>
          <p className="text-slate-400 text-sm mt-1">Join RootCauseAI</p>
        </div>

        <div className="card p-6">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 mb-6">
            {["citizen", "officer"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-2 rounded-lg text-sm font-medium capitalize transition ${
                  role === r ? "bg-accent text-ink" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Optional" />
            </div>

            {role === "citizen" ? (
              <div>
                <label className="label">Default address / locality</label>
                <input className="input" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="e.g. Block A, North Campus" />
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Department</label>
                  <input className="input" value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="e.g. Public Works" />
                </div>
                <div>
                  <label className="label">Officer signup code</label>
                  <input className="input" value={form.officerCode} onChange={(e) => update("officerCode", e.target.value)} placeholder="Provided by admin" required />
                </div>
              </>
            )}

            {error && <p className="text-sm text-critical bg-critical/10 border border-critical/20 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
