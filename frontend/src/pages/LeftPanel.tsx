import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../auth";
import "./LeftPanel.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

type Project = { _id: string; name: string; type?: string };

const LeftPanel: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const handleLogout = () => {
    auth.logout();
    navigate("/login", { replace: true });
    window.location.reload();
  };

  const isActive = (path: string) => location.pathname.startsWith(path);
  const isProjectActive = (id: string) => location.pathname.startsWith(`/project/${id}`);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/projects?limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json(); // { items, total }
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e: any) {
      setErr(e.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // auto-sync when Dashboard broadcasts changes
    const onChanged = () => load();
    window.addEventListener("projects:changed", onChanged);
    return () => window.removeEventListener("projects:changed", onChanged);
  }, []);

  return (
    <div className="sidebar">
      {/* Projects Section */}
      <div className="sidebar-header">
        <h3 className="sidebar-title">Projects</h3>

        <ul className="project-list">
          {loading && <li className="muted">Loading…</li>}
          {err && <li className="error">{err}</li>}

          {!loading && !err && items.length === 0 && (
            <li className="muted">No projects yet</li>
          )}

          {!loading &&
            !err &&
            items.map((p) => (
              <li
                key={p._id}
                className={isProjectActive(p._id) ? "active" : ""}
                title={p.name}
                onClick={() => navigate(`/project/${p._id}`)}
              >
                {p.name}
              </li>
            ))}
        </ul>
      </div>

      {/* Navigation Section */}
      <div className="sidebar-nav">
        <ul>
          <li
            className={isActive("/dashboard") ? "active" : ""}
            onClick={() => navigate("/dashboard")}
          >
            📊 Dashboard
          </li>
          <li
            className={isActive("/projects") ? "active" : ""}
            onClick={() => navigate("/projects")}
          >
            📁 Projects
          </li>
          <li
            className={isActive("/upload") ? "active" : ""}
            onClick={() => navigate("/upload")}
          >
            ⬆️ Upload File
          </li>
          <li
            className={isActive("/results") ? "active" : ""}
            onClick={() => navigate("/results")}
          >
            📜 Results
          </li>
          <li
            className={isActive("/settings") ? "active" : ""}
            onClick={() => navigate("/settings")}
          >
            ⚙️ Settings
          </li>
        </ul>
      </div>

      {/* Footer Logout */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default LeftPanel;
