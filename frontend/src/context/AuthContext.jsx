import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("rootcauseai_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("rootcauseai_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem("rootcauseai_user", JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem("rootcauseai_token");
        localStorage.removeItem("rootcauseai_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function login(token, userObj) {
    localStorage.setItem("rootcauseai_token", token);
    localStorage.setItem("rootcauseai_user", JSON.stringify(userObj));
    setUser(userObj);
  }

  function logout() {
    localStorage.removeItem("rootcauseai_token");
    localStorage.removeItem("rootcauseai_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
