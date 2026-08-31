import React from "react";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import CitizenDashboard from "./pages/CitizenDashboard.jsx";
import ComplaintDetail from "./pages/ComplaintDetail.jsx";
import OfficerDashboard from "./pages/OfficerDashboard.jsx";
import ClusterDetail from "./pages/ClusterDetail.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/citizen"
        element={
          <ProtectedRoute role="citizen">
            <CitizenDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/complaints/:id"
        element={
          <ProtectedRoute role="citizen">
            <ComplaintDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/officer"
        element={
          <ProtectedRoute role="officer">
            <OfficerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/clusters/:id"
        element={
          <ProtectedRoute role="officer">
            <ClusterDetail />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
