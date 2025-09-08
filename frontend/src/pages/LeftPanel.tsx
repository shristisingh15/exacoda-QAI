import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../auth";
import "./LeftPanel.css";

// import logo - update path if your asset is elsewhere
import logoSrc from "../assets/logo.png.jpeg";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

type Project = { _id: string; name: string; type?: string };
type ProjectFile = { _id: string; filename: string; version: string };

const LeftPanel: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsExpanded, setProjectsExpanded] = useState<boolean>(false); // collapsed by default
  const [expandedProject, setExpandedProject] = useState<string | null>(null); // single project's files open
  const [files, setFiles] = useState<Record<string, ProjectFile[]>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const handleLogout = () => {
    auth.logout();
    navigate("/login", { replace: true });
    window.location.reload();
  };

  const isActive = (path: string) => location.pathname.startsWith(path);
  const isProjectActive = (id: string) => location.pathname.startsWith(`/project/${id}`);

  // load projects
  async function loadProjects() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/projects?limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setProjects(Array.isArray(json.items) ? json.items : []);
    } catch (e: any) {
      setErr(e.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  // load files for a single project
  async function loadFiles(projectId: string) {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/files`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFiles((prev) => ({ ...prev, [projectId]: data }));
    } catch (e) {
      console.error("Failed to fetch files", e);
    }
  }

  // toggle a single project's file list
  const toggleProjectFiles = (projectId: string) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
    } else {
      setExpandedProject(projectId);
      if (!files[projectId]) loadFiles(projectId);
    }
  };

  // download a file
  const handleDownload = async (projectId: string, file: ProjectFile) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/files/${file._id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Error downloading file");
      console.error(e);
    }
  };

  useEffect(() => {
    loadProjects();
    // auto-sync when Dashboard broadcasts changes
    const onChanged = () => loadProjects();
    window.addEventListener("projects:changed", onChanged);
    return () => window.removeEventListener("projects:changed", onChanged);
  }, []);

  return (
    <div className="sidebar">
      {/* LOGO */}
      <div className="sidebar-logo" onClick={() => navigate("/dashboard")} role="button" aria-label="Go to dashboard">
        <img src={logoSrc} alt="Exacoda logo" />
      </div>

      {/* Navigation Section (top) */}
      <div className="sidebar-nav">
        <ul>
          <li
            className={isActive("/dashboard") ? "active" : ""}
            onClick={() => navigate("/dashboard")}
          >
            <span className="nav-left">📊 Dashboard</span>
          </li>

          <li
            className={isActive("/upload") ? "active" : ""}
            onClick={() => navigate("/upload")}
          >
            <span className="nav-left">⬆️ Upload File</span>
          </li>

          <li
            className={isActive("/results") ? "active" : ""}
            onClick={() => navigate("/results")}
          >
            <span className="nav-left">📜 Results</span>
          </li>

          <li
            className={isActive("/settings") ? "active" : ""}
            onClick={() => navigate("/settings")}
          >
            <span className="nav-left">⚙️ Settings</span>
          </li>
        </ul>
      </div>

      {/* Projects toggle row (below Settings) */}
      <div
        className={`projects-toggle-row ${projectsExpanded ? "open" : ""}`}
        onClick={() => {
          // if collapsing the whole projects area, also close any open project's files
          if (projectsExpanded) setExpandedProject(null);
          setProjectsExpanded((v) => !v);
        }}
        role="button"
        aria-expanded={projectsExpanded}
      >
        <span className="projects-label">📁 Projects</span>
        <span className={`projects-chev ${projectsExpanded ? "open" : ""}`} aria-hidden>
          ▶
        </span>
      </div>

      {/* Collapsible Projects list */}
      {projectsExpanded && (
        <div className="sidebar-projects">
          <ul className="project-list">
            {loading && <li className="muted">Loading…</li>}
            {err && <li className="error">{err}</li>}
            {!loading && !err && projects.length === 0 && (
              <li className="muted">No projects yet</li>
            )}

            {!loading &&
              !err &&
              projects.map((p) => (
                <li key={p._id} className="project-row">
                  <button
                    className={`project-name ${isProjectActive(p._id) ? "active" : ""}`}
                    onClick={() => navigate(`/project/${p._id}`)}
                    title="Open project"
                  >
                    {p.name}
                  </button>

                  {/* small caret to expand files */}
                  <button
                    className={`project-expand ${expandedProject === p._id ? "open" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProjectFiles(p._id);
                    }}
                    aria-expanded={expandedProject === p._id}
                    title="Show versions/files"
                  >
                    ▸
                  </button>

                  {/* file list (toggle) */}
                  {expandedProject === p._id && files[p._id] && (
                    <ul className="file-list">
                      {files[p._id].map((f) => (
                        <li
                          key={f._id}
                          className="file-item"
                          onClick={() => handleDownload(p._id, f)}
                          title={`Download ${f.filename}`}
                        >
                          <span className="file-version">{f.version}</span>
                          <span className="file-name"> {f.filename}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}

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
