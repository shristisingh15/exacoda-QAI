// frontend/src/pages/UploadDocument.tsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./ProjectFlow.css";

const API_BASE = import.meta.env.VITE_API_BASE || "https://exacoda-qai-q8up.onrender.com";

type Doc = {
  _id?: string;
  id?: string;
  name?: string;
  filename?: string;
  url?: string;
  createdAt?: string;
  scenarios?: any[]; // may include generated scenarios
  testCases?: any[]; // may include generated test cases
  testScenariosCount?: number;
  testCasesCount?: number;
  [k: string]: any;
};

export default function UploadDocumentPage() {
  const { id } = useParams<{ id: string }>(); // project id (if route contains it)
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Map a backend document object to our UI-friendly Doc
  const mapDoc = (d: any, idx: number): Doc => ({
    _id: d._id || d.id || `doc-${idx}`,
    id: d._id || d.id || undefined,
    name: d.name || d.filename || d.title || `Document ${idx + 1}`,
    filename: d.filename || d.name || undefined,
    url: d.url || d.downloadUrl || d.fileUrl || undefined,
    createdAt: d.createdAt || d.created_at || undefined,
    scenarios: Array.isArray(d.scenarios) ? d.scenarios : undefined,
    testCases: Array.isArray(d.testCases) ? d.testCases : undefined,
    testScenariosCount: typeof d.testScenariosCount === "number" ? d.testScenariosCount : undefined,
    testCasesCount: typeof d.testCasesCount === "number" ? d.testCasesCount : undefined,
    ...d,
  });

  // Try multiple plausible endpoints for listing documents for this project
  const fetchProjectDocs = async (projectId?: string) => {
    setLoading(true);
    setErr(null);
    if (!projectId) {
      setDocs([]);
      setLoading(false);
      return;
    }

    const tryEndpoints = [
      `${API_BASE}/api/projects/${projectId}/documents`,
      `${API_BASE}/api/projects/${projectId}/files`,
      `${API_BASE}/api/documents?projectId=${projectId}`,
      `${API_BASE}/api/documents/project/${projectId}`,
      `${API_BASE}/api/documents`,
    ];

    for (const ep of tryEndpoints) {
      try {
        const res = await fetch(ep);
        if (!res.ok) continue;
        const json = await res.json();
        // Response shapes may vary
        const arr = json?.items || json?.data || json?.documents || json || [];
        if (Array.isArray(arr)) {
          const mapped = arr.map(mapDoc);
          setDocs(mapped);
          setLoading(false);
          return;
        }
      } catch (e) {
        // try next endpoint
        continue;
      }
    }

    // If nothing matched
    setDocs([]);
    setErr("No documents found (or endpoints returned unexpected shapes).");
    setLoading(false);
  };

  useEffect(() => {
    fetchProjectDocs(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // utility to extract counts robustly
  const getScenariosCount = (d: Doc) =>
    typeof d.testScenariosCount === "number"
      ? d.testScenariosCount
      : Array.isArray(d.scenarios)
      ? d.scenarios.length
      : 0;

  const getTestCasesCount = (d: Doc) =>
    typeof d.testCasesCount === "number" ? d.testCasesCount : Array.isArray(d.testCases) ? d.testCases.length : 0;

  // Upload handler: POST to generate business/test artifacts (common endpoints tried)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setErr(null);

    // Try sensible upload endpoints
    const tryEndpoints = [
      `${API_BASE}/api/projects/${id}/upload-document`,
      `${API_BASE}/api/projects/${id}/upload`,
      `${API_BASE}/api/projects/${id}/generate-bp`, // sometimes upload+generate are same
      `${API_BASE}/api/documents/upload`,
    ];

    let success = false;
    let lastError: any = null;

    for (const ep of tryEndpoints) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        // if backend expects projectId in body, include it
        if (id) fd.append("projectId", id);

        const res = await fetch(ep, {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          lastError = `HTTP ${res.status} @ ${ep}`;
          continue;
        }

        // On success, refresh doc list and stop
        success = true;
        // some endpoints return the created doc(s)
        try {
          await res.json();
        } catch (e) {
          // ignore JSON parse errors
        }
        break;
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    if (!success) {
      setErr(`Upload failed. Last error: ${String(lastError)}`);
    } else {
      // refresh docs
      await fetchProjectDocs(id);
    }

    setUploading(false);
  };

  return (
    <div className="project-page upload-document">
      <div className="topbar">
        <Link to="/dashboard">← Back to Projects</Link>
      </div>

      <div className="project-header">
        <h2>Upload Documents</h2>
        <p className="muted">Upload project documents. Generated scenarios & test cases will be shown here.</p>
      </div>

      {/* TABLE: Documents | scenarios count | test cases count */}
      <div className="card" style={{ padding: 16, marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>Documents</h3>

        {loading ? (
          <p>Loading documents…</p>
        ) : err ? (
          <p style={{ color: "crimson" }}>{err}</p>
        ) : docs.length === 0 ? (
          <p style={{ color: "#374151" }}>No documents uploaded yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="simple-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>Document</th>
                  <th style={{ textAlign: "right", padding: "8px 12px" }}>Scenarios</th>
                  <th style={{ textAlign: "right", padding: "8px 12px" }}>Test Cases</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d, idx) => (
                  <tr key={d._id || d.id || idx} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "10px 12px" }}>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noreferrer">
                          {d.name}
                        </a>
                      ) : (
                        <span>{d.name}</span>
                      )}
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {d.filename ? d.filename : d.createdAt ? new Date(d.createdAt).toLocaleString() : null}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{getScenariosCount(d)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{getTestCasesCount(d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CHOOSE FILE CARD (below the table) */}
      <div className="card" style={{ padding: 20, textAlign: "center" }}>
        <h4 style={{ marginTop: 0 }}>Upload a document</h4>
        <p className="muted">Supported: .pdf, .doc, .docx, .txt</p>

        <div style={{ marginTop: 12 }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept=".pdf,.doc,.docx,.txt"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await handleFileUpload(file);
              // clear the input so same file can be uploaded again if needed
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Choose file"}
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <small className="muted">
            After upload the document will be processed to generate business processes, scenarios and test cases.
          </small>
        </div>
      </div>
    </div>
  );
}
