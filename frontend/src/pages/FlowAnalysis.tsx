// frontend/src/pages/FlowAnalysis.tsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./ProjectFlow.css";
import StepButtons from "./StepButton";

const API_BASE = import.meta.env.VITE_API_BASE || "https://exacoda-qai-q8up.onrender.com";

type BP = {
  _id: string;
  name: string;
  description?: string;
  priority?: string;
  createdAt?: string;
  [k: string]: any;
};

type ProjectDetails = {
  _id?: string;
  name?: string;
  description?: string;
  [k: string]: any;
};

export default function FlowAnalysis() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<BP[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [loadingProject, setLoadingProject] = useState<boolean>(false);
  const [projectErr, setProjectErr] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);

  // ✅ map API data → UI BP
  const mapToBP = (arr: any[]) =>
    arr.map((p: any, idx: number) => ({
      _id: p._id || p.id || `bp-${idx}`,
      name: p.name || "Untitled",
      description: p.description || "",
      priority: p.priority || "Medium",
      ...p,
    }));

  // ✅ fetch project details
  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    (async () => {
      setLoadingProject(true);
      setProjectErr(null);
      try {
        const res = await fetch(`${API_BASE}/api/projects/${id}`, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setProjectDetails(json || null);
      } catch (e: any) {
        if (e?.name !== "AbortError") setProjectErr(e?.message ?? "Failed to load project");
      } finally {
        setLoadingProject(false);
      }
    })();
    return () => ac.abort();
  }, [id]);

  // ✅ fetch matched business processes from Mongo
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`${API_BASE}/api/business/matched/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled && json?.items) {
          const mapped = mapToBP(json.items);
          setItems(mapped);
          setSelectedIds({});
        }
      } catch (err: any) {
        if (!cancelled) setErr(err?.message || "Failed to load matched processes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ✅ selection helpers
  const toggleSelect = (bpId: string) => {
    setSelectedIds((s) => ({ ...s, [bpId]: !s[bpId] }));
  };
  const allSelected = items.length > 0 && items.every((p) => selectedIds[p._id]);
  const anySelected = Object.values(selectedIds).some(Boolean);
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds({});
    } else {
      const map: Record<string, boolean> = {};
      for (const p of items) map[p._id] = true;
      setSelectedIds(map);
    }
  };

  const handleGenerateScenarios = async () => {
    if (!id) return;
    const bpIds = Object.keys(selectedIds).filter((k) => selectedIds[k]);
    if (bpIds.length === 0) {
      alert("Select at least one business process first.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${id}/generate-scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bpIds }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      navigate(`/project/${id}/scenarios`);
    } catch (e: any) {
      alert(e?.message || "Failed to generate scenarios");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="project-page flow-analysis">
      <div className="topbar">
        <Link to="/dashboard">← Back to Projects</Link>
        <div className="topbar-actions">
          <button>Settings</button>
          <button onClick={() => (window.location.href = "/login")}>Logout</button>
        </div>
      </div>

      <div className="project-header">
        <h2>{projectDetails?.name || (loadingProject ? "Loading…" : "Flow Analysis")}</h2>
        {projectDetails?.description ? (
          <p className="muted">{projectDetails.description}</p>
        ) : (
          <p className="muted">Flow view for the selected project.</p>
        )}
        {projectErr && <p style={{ color: "crimson" }}>{projectErr}</p>}
      </div>

      <StepButtons />
      <hr className="section-divider" />

      <div className="controls-row">
        <button
          className="btn btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          {loading ? "Processing…" : "Regenerate with File"}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept=".pdf,.doc,.docx,.txt"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !id) return;

            const formData = new FormData();
            formData.append("file", file);

            try {
              const res = await fetch(`${API_BASE}/api/projects/${id}/generate-bp`, {
                method: "POST",
                body: formData,
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              await res.json();
              // reload matched processes
              const matched = await fetch(`${API_BASE}/api/business/matched/${id}`);
              const json = await matched.json();
              const mapped = mapToBP(json.items || []);
              setItems(mapped);
            } catch (err: any) {
              alert(err?.message || "Failed to regenerate");
            }
          }}
        />

        <label className="select-all">
          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
          <span>Select all</span>
        </label>

        <div className="selected-count">
          {anySelected
            ? `${Object.values(selectedIds).filter(Boolean).length} selected`
            : "0 selected"}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleGenerateScenarios}
          disabled={!anySelected || generating}
          style={{ marginLeft: 12 }}
        >
          {generating ? "Generating…" : "Next"}
        </button>
      </div>

      {items && items.length > 0 && (
        <div style={{ marginTop: 12, marginBottom: 12, color: "#064e3b" }}>
          Showing <strong>{items.length}</strong> relevant business process(es).
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : err ? (
        <p style={{ color: "crimson" }}>{err}</p>
      ) : items.length === 0 ? (
        <div style={{ padding: 28, textAlign: "center", color: "#374151" }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>
            No relevant business processes found.
          </p>
          <p style={{ marginBottom: 12 }}>
            Please go to Upload Documents and choose a file to generate processes.
          </p>
        </div>
      ) : (
        <div className="bp-grid">
          {items.map((bp, index) => (
            <article key={bp._id} className="bp-card">
              <div className="bp-card-header">
                <h3 className="bp-title">{index + 1}. {bp.name}</h3>
                <span className={`bp-badge ${String(bp.priority || "Medium").toLowerCase()}`}>
                  {bp.priority || "Medium"}
                </span>
              </div>
              <p className="bp-desc">{bp.description || "No description"}</p>
              <div className="bp-actions">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!selectedIds[bp._id]}
                    onChange={() => toggleSelect(bp._id)}
                  />
                  <span>Select</span>
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
