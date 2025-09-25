// frontend/src/pages/UploadDocuments.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "http://localhost:5000";

type Props = {
  setStep: (n: number) => void;
  projectId?: string;
};

export default function UploadDocuments({ setStep, projectId }: Props) {
  const [fileName, setFileName] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFile = async (file: File) => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const url = projectId
        ? `${API_BASE}/api/projects/${encodeURIComponent(projectId)}/regenerate`
        : `${API_BASE}/api/regenerate`;

      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      const data = await res.json();

      // Find first array result (be defensive about response shape)
      let matched: any[] = [];
      if (Array.isArray(data?.items)) matched = data.items;
      else if (Array.isArray(data?.relevantBusinessProcesses)) matched = data.relevantBusinessProcesses;
      else if (Array.isArray(data?.relevant)) matched = data.relevant;
      else {
        // fallback: take first array-valued property
        for (const k of Object.keys(data || {})) {
          if (Array.isArray((data as any)[k])) {
            matched = (data as any)[k];
            break;
          }
        }
      }

      // Persist to storage
      const serialized = JSON.stringify(matched || []);
      sessionStorage.setItem("relevantBusinessProcesses", serialized);
      localStorage.setItem("relevantBusinessProcesses", serialized);
      sessionStorage.setItem("uploadedDocument", JSON.stringify({ filename: file.name, savedAt: new Date().toISOString(), raw: data }));
      localStorage.setItem("uploadedDocument", JSON.stringify({ filename: file.name, savedAt: new Date().toISOString(), raw: data }));

      // Dispatch a same-tab event so FlowAnalysis updates immediately
      try {
        window.dispatchEvent(new CustomEvent("relevantBPUpdated", { detail: { relevant: matched, filename: file.name } }));
      } catch (e) {
        console.warn("Failed to dispatch custom event", e);
      }

      // move to step 2 and navigate to analysis page (HashRouter-safe)
      setStep(2);
      try {
        navigate(`/project/${projectId || ""}/analysis`, { state: { relevant: matched } });
      } catch (e) {
        console.warn("navigate() failed, falling back to hash navigation", e);
      }
      // fallback for HashRouter
      await new Promise((r) => setTimeout(r, 120));
      window.location.href = `#/project/${projectId || ""}/analysis`;
    } catch (err: any) {
      console.error("Upload/process error:", err);
      setError(err?.message || "Processing failed");
      alert("Processing failed — check console and network tab.");
    } finally {
      setProcessing(false);
    }
  };

  const onChooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    handleFile(f);
    // clear input afterwards
    e.currentTarget.value = "";
  };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <h3>Upload Documents</h3>
      <p>Accepted: PDF, DOCX, DOC, TXT</p>

      <div style={{ background: "#fff", padding: 20, borderRadius: 10 }}>
        <label htmlFor="uploadFile" style={{ display: "inline-block", padding: "10px 16px", background: "#22c55e", color: "#fff", borderRadius: 8, cursor: "pointer" }}>
          📂 Choose File
        </label>
        <input id="uploadFile" type="file" accept=".pdf,.doc,.docx,.txt" onChange={onChooseFile} style={{ display: "none" }} disabled={processing} />
        <div style={{ display: "inline-block", marginLeft: 12 }}>
          {fileName ? <strong>{fileName}</strong> : <span style={{ color: "#6b7280" }}>No file chosen</span>}
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={() => { if (fileName === "") alert("Choose a file first"); else alert("File already processing or processed"); }} disabled={processing} style={{ padding: "8px 12px", borderRadius: 6 }}>
            {processing ? "Processing…" : "Choose & Compare"}
          </button>
        </div>

        {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  );
}
