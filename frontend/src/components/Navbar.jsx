import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-surface/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to={user ? (user.role === "officer" ? "/officer" : "/citizen") : "/"} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center font-display font-bold text-ink text-sm">
            R
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">RootCause<span className="text-accent">AI</span></span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-slate-400 leading-tight capitalize">{user.role}</p>
            </div>
            <button onClick={handleLogout} className="btn-secondary text-sm">
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
