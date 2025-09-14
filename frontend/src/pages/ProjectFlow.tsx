// frontend/src/pages/ProjectFlow.tsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./ProjectFlow.css";
import StepButtons from "./StepButton"; // ⬅️ shared stepper buttons

const API_BASE = import.meta.env.VITE_API_BASE || "https://exacoda-qai-q8up.onrender.com";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

type ProjectDetails = {
  _id?: string;
  name?: string;
  description?: string;
  [k: string]: any;
};

const ProjectFlow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  // NEW: project details state
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [loadingProject, setLoadingProject] = useState<boolean>(false);
  const [projectErr, setProjectErr] = useState<string | null>(null);

  useEffect(() => {
    // fetch project details when id available
    if (!id) return;
    const ac = new AbortController();
    (async () => {
      setLoadingProject(true);
      setProjectErr(null);
      try {
        const res = await fetch(`${API_BASE}/api/projects/${id}`, { signal: ac.signal });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${t}`);
        }
        const json = await res.json();
        setProjectDetails(json || null);
      } catch (e: any) {
        if (e?.name !== "AbortError") setProjectErr(e.message || "Failed to load project");
      } finally {
        setLoadingProject(false);
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleFile(file: File) {
    if (!id) return;
    setErr(null);

    // basic validation
    if (file.size > MAX_BYTES) {
      setErr("File too large. Max 10MB.");
      return;
    }
    if (ALLOWED.length && !ALLOWED.includes(file.type)) {
      const nameOk = /\.(pdf|docx?|txt)$/i.test(file.name);
      if (!nameOk) {
        setErr("Unsupported file type. Use PDF, DOC, DOCX, or TXT.");
        return;
      }
    }

    const fd = new FormData();
    fd.append("file", file);

    try {
      setUploading(true);
      const res = await fetch(`${API_BASE}/api/projects/${id}/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text}`);
      }
      // success → go to Flow Analysis
      navigate(`/project/${id}/analysis`, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    void handleFile(file);
  };

  return (
    <div className="project-page" style={{ minHeight: "100vh" }}>
      {/* Topbar */}
      <div className="topbar">
        <Link to="/dashboard">← Back to Projects</Link>
        <div className="topbar-actions">
          <button type="button">Settings</button>
          <button type="button" onClick={() => (window.location.href = "/login")}>
            Logout
          </button>
        </div>
      </div>

      {/* Project Header — SHOW PROJECT NAME instead of ID */}
      <h2>{projectDetails?.name || (loadingProject ? "Loading…" : "Untitled Project")}</h2>
      {projectDetails?.description ? (
        <p className="muted">{projectDetails.description}</p>
      ) : (
        <p className="muted">This is the flow view for the selected project.</p>
      )}

      {/* NEW: show error if project fetch failed */}
      {projectErr && <p style={{ color: "crimson" }}>{projectErr}</p>}

      {/* 🔹 Stepper Buttons (constant across pages) */}
      <StepButtons />

      {/* Upload Section */}
      <div className="upload-container">
        <div className="upload-box">
          <h3>Upload Documents</h3>
          <p>Upload your functional requirements, specifications, or user stories</p>

          {fileName && (
            <p style={{ marginTop: 6 }}>
              Selected: <b>{fileName}</b>
            </p>
          )}
          {uploading && <p>Uploading…</p>}
          {err && <p style={{ color: "crimson" }}>{err}</p>}

          <p>Drop your files here</p>
          <p>Supports PDF, DOC, DOCX, TXT files up to 10MB</p>

          {/* styled choose file button + hidden input */}
          <label htmlFor="projectFile" className="file-upload-btn">📂 Choose File</label>
          <input
            id="projectFile"
            type="file"
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={onPick}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectFlow;
