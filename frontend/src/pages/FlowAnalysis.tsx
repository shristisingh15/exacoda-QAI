// frontend/src/pages/FlowAnalysis.tsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./ProjectFlow.css";
import StepButtons from "./StepButton"; // shared stepper buttons

const API_BASE = import.meta.env.VITE_API_BASE || "https://exacoda-qai-q8up.onrender.com";

type BP = {
  _id: string;
  name: string;
  description?: string;
  priority?: string;
  createdAt?: string;
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

  const [items, setItems] = useState<BP[]>([]);
  const [previousItems, setPreviousItems] = useState<BP[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [editing, setEditing] = useState<BP | null>(null);
  const [form, setForm] = useState<Partial<BP>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // project header state (replace showing project id)
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [loadingProject, setLoadingProject] = useState<boolean>(false);
  const [projectErr, setProjectErr] = useState<string | null>(null);

  // selection state
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);

  // fetch processes on load
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`${API_BASE}/api/business?limit=100`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        const list: BP[] = (json.items || []).slice(0, 100);
        setItems(list);
        setSelectedIds({});
      } catch (e: any) {
        setErr(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // fetch project details for header (replace ID display)
  useEffect(() => {
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
  }, [id]);

  // edit helpers
  const openEdit = (bp: BP) => {
    setEditing(bp);
    setForm({
      name: bp.name,
      description: bp.description || "",
      priority: bp.priority || "Medium",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const res = await fetch(`${API_BASE}/api/business/${editing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          priority: form.priority,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: BP = await res.json();
      setItems((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      setEditing(null);
    } catch (e: any) {
      alert(e.message || "Failed to update");
    }
  };

  // delete helpers
  const doDelete = async (bpId: string) => {
    const res = await fetch(`${API_BASE}/api/business/${bpId}`, { method: "DELETE" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${text}`);
    }
  };

  const handleDelete = async (bpId: string) => {
    if (!bpId) return;
    const ok = window.confirm("Are you sure you want to delete this business process?");
    if (!ok) return;

    try {
      const before = items;
      setItems((prev) => prev.filter((x) => x._id !== bpId));
      setSelectedIds((s) => {
        const copy = { ...s };
        delete copy[bpId];
        return copy;
      });

      await doDelete(bpId);
    } catch (e: any) {
      alert(e?.message || "Failed to delete");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Object.keys(selectedIds).filter((k) => selectedIds[k]);
    if (ids.length === 0) return;
    const ok = window.confirm(`Delete ${ids.length} selected item(s)?`);
    if (!ok) return;

    const before = items;
    setItems((prev) => prev.filter((p) => !ids.includes(p._id)));
    setSelectedIds({});

    const errors: string[] = [];
    for (const bpId of ids) {
      try {
        await doDelete(bpId);
      } catch (e: any) {
        errors.push(e?.message || `Failed deleting ${bpId}`);
      }
    }

    if (errors.length > 0) {
      alert(`Failed to delete ${errors.length} items:\n` + errors.join("\n"));
      setItems(before);
    }
  };

  // regenerate handler
  const handleFilePicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    try {
      setLoading(true);
      setPreviousItems(items);

      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API_BASE}/api/projects/${id}/regenerate`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text}`);
      }
      const data = await res.json();

      setItems(data.items || []);
      alert(`Matched ${data.matchedCount} relevant business processes`);
    } catch (err: any) {
      alert(err.message || "Failed to regenerate");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // selection helpers
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

  // Generate scenarios
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
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text}`);
      }
      await res.json();
      // after success, go to scenarios page
      navigate(`/project/${id}/scenarios`);
    } catch (e: any) {
      alert(e?.message || "Failed to generate scenarios");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="project-page flow-analysis">
      {/* Topbar */}
      <div className="topbar">
        <Link to="/dashboard">← Back to Projects</Link>
        <div className="topbar-actions">
          <button>Settings</button>
          <button onClick={() => (window.location.href = "/login")}>Logout</button>
        </div>
      </div>

      {/* Header — show project name instead of ID */}
      <div className="project-header">
        <h2>{projectDetails?.name || (loadingProject ? "Loading…" : "Flow Analysis")}</h2>
        {projectDetails?.description ? (
          <p className="muted">{projectDetails.description}</p>
        ) : (
          <p className="muted">Flow view for the selected project.</p>
        )}
        {projectErr && <p style={{ color: "crimson" }}>{projectErr}</p>}
      </div>

      {/* Stepper */}
      <StepButtons />

      {/* Divider */}
      <hr className="section-divider" />

      {/* Action Controls */}
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
          onChange={handleFilePicked}
        />

        <button
          className="btn"
          disabled={!previousItems.length}
          onClick={() => {
            if (previousItems.length > 0) {
              setItems(previousItems);
              setPreviousItems([]);
              alert("Reverted to previous business processes");
            }
          }}
        >
          Reset
        </button>

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
          className="btn btn-delete-sm"
          onClick={handleBulkDelete}
          disabled={!anySelected}
        >
          Delete
        </button>

        {/* Generate Test Scenarios button */}
        <button
          className="btn btn-primary"
          onClick={handleGenerateScenarios}
          disabled={!anySelected || generating}
          style={{ marginLeft: 12 }}
        >
          {generating ? "Generating…" : "Next"}
        </button>
      </div>

      {/* Items */}
      {loading ? (
        <p>Loading…</p>
      ) : err ? (
        <p style={{ color: "crimson" }}>{err}</p>
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

                <button className="btn btn-edit" onClick={() => openEdit(bp)}>Edit</button>
                <button className="btn btn-delete" onClick={() => handleDelete(bp._id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Business Process</h3>
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />

            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={4} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority || "Medium"} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={saveEdit}>Save</button>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
