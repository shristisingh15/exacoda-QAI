import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import ProjectFlow from "./pages/ProjectFlow";
import LeftPanel from "./pages/LeftPanel";
import LoginPage from "./pages/Login";
import { auth } from "./auth";

// ✅ Pull API base from .env (set VITE_API_BASE=http://localhost:5001)
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

// ✅ BusinessList with loading+error and .env-based URL
function BusinessList() {
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/business`, {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!ignore) setProcesses(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!ignore) setError(e?.message || "Failed to fetch data");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Business Processes</h2>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && (processes.length === 0 ? (
        <p>No processes found.</p>
      ) : (
        <ul>
          {processes.map((p: any) => (
            <li key={p._id}>
              <strong>{p.name}</strong> – {p.description}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

// ✅ PrivateRoute wrapper (kept as-is, uses your existing auth singleton)
function PrivateRoute({ children }: { children: JSX.Element }) {
  return auth.isLoggedIn() ? children : <Navigate to="/login" replace />;
}

function AppLayout() {
  const location = useLocation();
  const isProjectPage = location.pathname.startsWith("/project");
  const isLoginPage = location.pathname === "/login";

  return (
    <div style={{ display: "flex" }}>
      {/* Show LeftPanel except on login and project pages */}
      {!isProjectPage && !isLoginPage && <LeftPanel />}

      <div style={{ flex: 1 }}>
        <Routes>
          {/* Default route → Login */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/project/:id"
            element={
              <PrivateRoute>
                <ProjectFlow />
              </PrivateRoute>
            }
          />
          {/* Protected route for Mongo data */}
          <Route
            path="/business"
            element={
              <PrivateRoute>
                <BusinessList />
              </PrivateRoute>
            }
          />

          {/* Catch-all → Login */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
