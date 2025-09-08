// src/pages/UploadDocuments.tsx
import React, { useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "http://localhost:5000";

type UploadDocumentsProps = {
  setStep: (n: number) => void;
  projectId?: string | undefined;
};

export default function UploadDocuments({ setStep, projectId }: UploadDocumentsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filenamePreview, setFilenamePreview] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setFilenamePreview(f ? f.name : "");
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please choose a file before uploading.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // If projectId is present, upload to project-specific endpoint
      const uploadUrl = projectId
        ? `${API_BASE}/projects/${projectId}/upload`
        : `${API_BASE}/api/upload`;

      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed (HTTP ${res.status}) ${txt}`);
      }

      // optionally parse response
      // const json = await res.json();

      // On success go to Flow Analysis
      setStep(2);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err?.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Upload Documents</h3>
        {projectId && (
          <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
            Uploading for project: <strong>{projectId}</strong>
          </p>
        )}
      </div>

      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          boxShadow: "0 6px 22px rgba(0,0,0,0.06)",
        }}
      >
        <p style={{ marginTop: 0, color: "#374151" }}>
          Drop your files here or choose a file to upload. Accepted: PDF, DOC, DOCX, TXT.
        </p>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <label
            htmlFor="uploadFile"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              borderRadius: 8,
              background: "#22c55e",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            📂 Choose File
          </label>
          <input
            id="uploadFile"
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            style={{ display: "none" }}
            disabled={isUploading}
          />

          <div style={{ flex: 1 }}>
            <div style={{ minHeight: 20 }}>
              {filenamePreview ? (
                <span style={{ color: "#111827", fontWeight: 600 }}>{filenamePreview}</span>
              ) : (
                <span style={{ color: "#6b7280" }}>No file chosen</span>
              )}
            </div>
            {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: isUploading ? "#94d3a2" : "#3b82f6",
              color: "#fff",
              border: "none",
              cursor: isUploading ? "default" : "pointer",
            }}
          >
            {isUploading ? "Uploading…" : "Upload & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
