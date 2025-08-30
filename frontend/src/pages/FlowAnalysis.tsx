// frontend/src/pages/FlowAnalysis.tsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./projectflow.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

type BP = {
  _id: string;
  name: string;
  description?: string;
  priority?: string;
  createdAt?: string;
};

export default function FlowAnalysis() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<BP[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // edit modal state
  const [editing, setEditing] = useState<BP | null>(null);
  const [form, setForm] = useState<Partial<BP>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`${API_BASE}/api/business?limit=10`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        const list: BP[] = (json.items || []).slice(0, 10);
        setItems(list);
      } catch (e: any) {
        setErr(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // open edit
  const openEdit = (bp: BP) => {
    setEditing(bp);
    setForm({
      name: bp.name,
      description: bp.description || "",
      priority: bp.priority || "Medium",
    });
  };

  // save edit
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
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${t}`);
      }
      const updated: BP = await res.json();
      setItems((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      setEditing(null);
    } catch (e: any) {
      alert(e.message || "Failed to update");
    }
  };

  return (
    <div className="project-page">
      <div className="topbar">
        <Link to="/dashboard">← Back to Projects</Link>
        <div className="topbar-actions">
          <button>Settings</button>
          <button onClick={() => (window.location.href = "/login")}>Logout</button>
        </div>
      </div>

      <div className="project-header">
        <h2>Flow Analysis</h2>
        <p className="muted">Project ID: {id}</p>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : err ? (
        <p style={{ color: "crimson" }}>{err}</p>
      ) : (
        <div className="bp-grid">
          {items.map((bp) => (
            <article key={bp._id} className="bp-card">
              <div className="bp-card-header">
                <h3 className="bp-title">{bp.name}</h3>
                <span className={`bp-badge ${String(bp.priority || "Medium").toLowerCase()}`}>
                  {bp.priority || "Medium"}
                </span>
              </div>
              <p className="bp-desc">{bp.description || "No description"}</p>
              <div className="bp-actions">
                <button
                  className="btn btn-edit"
                  onClick={() => openEdit(bp)}
                  aria-label={`Edit ${bp.name}`}
                >
                  ✏️ Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Edit Business Process</h3>

            <label className="form-label">Name</label>
            <input
              className="form-input"
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={form.priority || "Medium"}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
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
