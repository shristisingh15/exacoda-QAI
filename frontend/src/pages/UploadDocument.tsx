import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

type ProjectFile = {
  _id: string;
  filename: string;
  version: string;
  uploadedAt: string;
};

export default function UploadDocument() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // fetch uploaded file history
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/projects/${id}/files`);
        if (!res.ok) throw new Error(`Failed to load files: ${res.status}`);
        const data = await res.json();
        setFiles(data);
      } catch (err: any) {
        console.error("❌ Load files failed:", err);
        setError(err?.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // handle Choose File -> works like regenerate
  // handle Choose File (new: generate business processes)
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  setError(null);
  const file = e.target.files?.[0];
  if (!file || !id) return;

  setUploading(true);
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/projects/${id}/generate-bp`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Upload failed: ${txt || res.status}`);
    }
    const json = await res.json();
    console.log("generate-bp returned:", json);

    // redirect to flow analysis (it will fetch from Mongo)
    navigate(`/project/${id}/analysis`);
  } catch (err: any) {
    console.error("generate-bp failed:", err);
    setError(err?.message || "Upload failed");
  } finally {
    setUploading(false);
  }
};


  return (
    <div className="project-page">
      <div className="project-header">
        <h2>Upload Document</h2>
        <p className="muted">Upload a document to analyze against business processes.</p>
      </div>

      {/* Upload card */}
      <div className="upload-card">
        <button
          className="btn btn-primary"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Processing…" : "Choose File"}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileChange}
        />
      </div>

      {/* Error */}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {/* History section */}
      <div className="history-section">
        <h3>History</h3>
        {loading ? (
          <p>Loading…</p>
        ) : files.length === 0 ? (
          <p>No documents uploaded yet.</p>
        ) : (
          <ul>
            {files.map((f) => (
              <li key={f._id}>
                <strong>{f.filename}</strong> ({f.version}) –{" "}
                {new Date(f.uploadedAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
