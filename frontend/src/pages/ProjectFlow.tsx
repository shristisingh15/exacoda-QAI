// frontend/src/pages/ProjectFlow.tsx
import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./projectflow.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const ProjectFlow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  async function handleFile(file: File) {
    if (!id) return;
    setErr(null);

    // basic validation
    if (file.size > MAX_BYTES) {
      setErr("File too large. Max 10MB.");
      return;
    }
    if (ALLOWED.length && !ALLOWED.includes(file.type)) {
      // allow some browsers that miss mimetype for txt
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
      const res = await fetch(`${API_BASE}/projects/${id}/upload`, {
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
    // LeftPanel is rendered globally from App.tsx. No sidebar here.
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

      {/* Project Header */}
      <h2>Project: {id}</h2>
      <p>
        This is the flow view for <b>{id}</b>.
      </p>

      {/* Stepper */}
      <div className="stepper">
        <div className="stepper-step">
          <div className="circle active">1</div>
          <span>Upload Documents</span>
        </div>
        <div className="stepper-step">
          <div className="circle inactive">2</div>
          <span>Flow Analysis</span>
        </div>
        <div className="stepper-step">
          <div className="circle inactive">3</div>
          <span>Test Scenarios</span>
        </div>
        <div className="stepper-step">
          <div className="circle inactive">4</div>
          <span>Test Cases</span>
        </div>
        <div className="stepper-step">
          <div className="circle inactive">5</div>
          <span>Test</span>
        </div>
      </div>

      {/* Upload Section */}
      <div className="upload-container">
        <div className="upload-box">
          <h3>Upload Documents</h3>
          <p>Upload your functional requirements, specifications, or user stories</p>

          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={onPick}
            disabled={uploading}
            aria-label="Choose a document to upload"
          />

          {fileName && <p style={{ marginTop: 6 }}>Selected: <b>{fileName}</b></p>}
          {uploading && <p>Uploading…</p>}
          {err && <p style={{ color: "crimson" }}>{err}</p>}

          <p>Drop your files here</p>
          <p>Supports PDF, DOC, DOCX, TXT files up to 10MB</p>

          {/* Presentational button (actual upload happens on input change) */}
          <button type="button" disabled>
            Choose File
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectFlow;
