// frontend/src/pages/TestCase.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import StepButtons from "./StepButton";
import { useProject, Scenario, TestRunConfig } from "./ProjectContext";
import "./TestCases.css";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://exacoda-qai-q8up.onrender.com";

type UploadedFile = {
  _id?: string;
  filename: string;
  url?: string;
  mimeType?: string;
  version?: string;
  uploadedAt?: string;
};

export default function TestPage(): JSX.Element {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    projectName,
    uploadedFiles,
    scenarios: ctxScenarios,
    selectedScenario,
    setScenarios: setCtxScenarios,
    selectScenario,
    setTestRunConfig,
  } = useProject();

  // preview & UI state
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<UploadedFile | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSc, setEditSc] = useState<Scenario | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  //const [testRunConfig, setTestRunConfig] = useState<TestRunConfig | null>(null);



  // dropdown options + state
  const frameworkOptions = ["Jest", "Mocha", "Cypress", "Playwright", "JUnit"];
  const languageOptions = ["JavaScript", "TypeScript", "Python", "Java", "C#"];
  const [selectedFramework, setSelectedFramework] = useState<string | "">("");
  const [selectedLanguage, setSelectedLanguage] = useState<string | "">("");

  /**
   * Only refresh scenarios from the server if the context is empty.
   * This prevents overwriting the user's selected scenarios (from TestScenarios)
   * and avoids a flash where selected items are replaced by the server list.
   */
  // REPLACE the existing "fetch scenarios" useEffect with this block:
// debug: show renders and count of effects firing
const _renderId = React.useRef(0);
_renderId.current += 1;
console.log(`[TestCase] render #${_renderId.current}`);

// SAFE: fetch scenarios once per projectId and only set context if needed
useEffect(() => {
  console.log("[effect] safe fetch scenarios (projectId)", projectId);
  if (!projectId) return;

  // If context already has scenarios, do nothing
  if (Array.isArray(ctxScenarios) && ctxScenarios.length > 0) {
    console.log("[effect] ctxScenarios already present; skipping fetch");
    return;
  }

  let mounted = true;
  (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/scenarios`);
      if (!mounted) return;

      if (!res.ok) {
        console.warn("[effect] fetch scenarios returned not ok", res.status);
        // only set empty if context is empty to avoid repeated writes
        if ((!ctxScenarios || ctxScenarios.length === 0) && mounted) {
          setCtxScenarios([]);
        }
        return;
      }

      const json = await res.json();
      const list: Scenario[] = Array.isArray(json) ? json : json?.items ?? [];

      if (!mounted) return;

      // Only set if context is empty or differs in length (avoid unnecessary updates)
      const shouldSet =
        !Array.isArray(ctxScenarios) ||
        ctxScenarios.length === 0 ||
        ctxScenarios.length !== list.length;

      if (shouldSet) {
        console.log("[effect] setting ctxScenarios, count=", list.length);
        setCtxScenarios(list);
      } else {
        console.log("[effect] ctxScenarios already matches, not setting");
      }
    } catch (err) {
      console.warn("[effect] fetch scenarios failed:", err);
      if (mounted && (!ctxScenarios || ctxScenarios.length === 0)) {
        setCtxScenarios([]);
      }
    }
  })();

  return () => {
    mounted = false;
  };
// IMPORTANT: depend only on projectId
}, [projectId]);


  // helper to open preview
  const openTestCasePreview = (tc: Scenario) => {
    const fileId = tc.fileId ?? uploadedFiles?.[0]?._id;
    if (!fileId) {
      setPreviewFileUrl(null);
      setPreviewMeta(null);
      return;
    }
    const meta = (uploadedFiles || []).find((f) => f._id === fileId);
    if (meta) {
      setPreviewMeta(meta);
      setPreviewFileUrl(
        meta.url ?? `${API_BASE}/api/projects/${projectId}/files/${meta._id}`
      );
    } else {
      setPreviewMeta(null);
      setPreviewFileUrl(`${API_BASE}/api/projects/${projectId}/files/${fileId}`);
    }
  };

  // delete scenario
  const handleDeleteScenario = async (sc: Scenario) => {
    if (!projectId || !sc._id) return;
    if (!window.confirm("Delete this test case?")) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/scenarios/${sc._id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Delete failed: HTTP ${res.status} ${t}`);
      }
      // remove from context and clear primary if necessary
      setCtxScenarios((prev) => (prev || []).filter((x) => x._id !== sc._id));
      if (selectedScenario && selectedScenario._id === sc._id) {
        selectScenario(null);
      }
    } catch (err: any) {
      console.error("delete scenario error:", err);
      alert(err?.message || "Failed to delete scenario");
    }
  };

  // edit modal
  const openEditModal = (sc: Scenario) => {
    setEditSc({ ...sc });
    setEditing(true);
  };

  const saveEditedScenario = async () => {
    if (!projectId || !editSc || !editSc._id) return;
    setSavingEdit(true);
    try {
      const body = {
        title: editSc.title,
        description: editSc.description,
        steps: editSc.steps,
        expected_result: editSc.expected_result,
      };
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/scenarios/${editSc._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Save failed: HTTP ${res.status} ${t}`);
      }

      // update context list and primary if needed
      setCtxScenarios((prev) =>
        (prev || []).map((p) => (p._id === editSc._id ? { ...p, ...editSc } : p))
      );
      if (selectedScenario && selectedScenario._id === editSc._id) {
        selectScenario(editSc);
      }

      setEditing(false);
      setEditSc(null);
    } catch (err: any) {
      console.error("save edit error:", err);
      alert(err?.message || "Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  // regenerate scenarios from server (explicit action)
  const handleRegenerate = async () => {
    if (!projectId) return;
    setRegenerating(true);
    try {
      const refresh = await fetch(
        `${API_BASE}/api/projects/${projectId}/scenarios`
      );
      if (refresh.ok) {
        const rj = await refresh.json();
        const list: Scenario[] = Array.isArray(rj) ? rj : rj?.items ?? [];
        setCtxScenarios(list);
        if (selectedScenario && !list.find((s) => s._id === selectedScenario._id)) {
          selectScenario(null);
        }
      }
    } catch (err) {
      console.error("Regenerate error:", err);
      alert("Regenerate failed. See console.");
    } finally {
      setRegenerating(false);
    }
  };

  // primary scenario = selectedScenario
  const primaryScenario: Scenario | null = selectedScenario ?? null;

  // decide what to render: prefer ctxScenarios (user-chosen), fallback to primary
  const listToRender: Scenario[] =
    ctxScenarios && ctxScenarios.length > 0
      ? ctxScenarios
      : primaryScenario
      ? [primaryScenario]
      : [];

  // Apply button uses primary scenario by default
  const canApply = Boolean(primaryScenario && selectedFramework && selectedLanguage);

  // ----------------- NEW: checkbox selection state & helpers -----------------
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
  if (!listToRender || listToRender.length === 0) return;

  // Build new map
  const newMap: Record<string, boolean> = {};
  listToRender.forEach((s, i) => {
    const key = s._id ?? `idx-${i}`;
    newMap[key] = selected[key] ?? false; // keep existing checkbox state if possible
  });

  // Only update if keys actually changed
  const currentKeys = Object.keys(selected).join(",");
  const newKeys = Object.keys(newMap).join(",");

  if (currentKeys !== newKeys) {
    setSelected(newMap);
  }
}, [listToRender]); // ✅ depends only on listToRender


  const toggleSelect = (sid: string) =>
    setSelected((prev) => ({ ...prev, [sid]: !prev[sid] }));

  const anySelected = Object.values(selected).some(Boolean);
  // ---------------------------------------------------------------------------

  return (
    <div className="project-main testpage-root" style={{ minHeight: "100vh" }}>
      {/* header */}
      <div className="testpage-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2>{projectName ?? `Project ${projectId ?? ""}`}</h2>
          <p className="project-desc">Test Cases</p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => navigate(-1)}>
            Back
          </button>
          <button className="btn btn-primary" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <StepButtons />
      </div>

      {/* --- Dropdown controls (above the scenario list) --- */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-end",
          marginTop: 20,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", minWidth: 220 }}>
          <label style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
            Select framework
          </label>
          <select
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value)}
            className="form-input"
          >
            <option value="">— choose framework —</option>
            {frameworkOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", minWidth: 180 }}>
          <label style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
            Testing language
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="form-input"
          >
            <option value="">— choose language —</option>
            {languageOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!primaryScenario) {
                alert("Please select a primary scenario first.");
                return;
              }
              if (!selectedFramework || !selectedLanguage) {
                alert("Please choose both framework and language.");
                return;
              }
              // TODO: replace alert with API call or navigation as required
              alert(
                `Applying framework=${selectedFramework}, language=${selectedLanguage} to primary: ${primaryScenario.title}`
              );
            }}
            disabled={!canApply}
          >
            Apply
          </button>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        {/* If there are no scenarios, prompt user to choose one */}
        {listToRender.length === 0 ? (
          <div style={{ color: "#6b7280", marginBottom: 12 }}>
            <div>No scenario selected.</div>
            <div style={{ marginTop: 8 }}>
              <Link to={`/project/${projectId}/scenarios`} className="btn">
                Choose a scenario
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Render each selected scenario */}
            <div style={{ display: "grid", gap: 12 }}>
              {listToRender.map((sc, i) => {
                const isPrimary = primaryScenario && sc._id === primaryScenario._id;
                const key = sc._id ?? `idx-${i}`;
                return (
                  <section
                    key={key}
                    className={`selected-scenario-card ${isPrimary ? "primary" : ""}`}
                  >
                    <div className="selected-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* ---------- NEW: checkbox added next to title ---------- */}
                        <input
                          type="checkbox"
                          checked={!!selected[key]}
                          onChange={() => toggleSelect(key)}
                        />
                        <h3 style={{ margin: 0 }}>
                          {sc.title}{" "}
                          {isPrimary && (
                            <span style={{ fontSize: 12, color: "#10b981", marginLeft: 8 }}>(Primary)</span>
                          )}
                        </h3>
                        {/* ------------------------------------------------------ */}
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn" onClick={() => openTestCasePreview(sc)}>
                          Open
                        </button>
                        <button className="btn btn-edit" onClick={() => openEditModal(sc)}>
                          Edit
                        </button>
                        <button className="btn btn-delete" onClick={() => handleDeleteScenario(sc)}>
                          Delete
                        </button>
                        {!isPrimary && (
                          <button className="btn" onClick={() => selectScenario(sc)}>
                            Make primary
                          </button>
                        )}
                      </div>
                    </div>

                    {sc.steps && sc.steps.length > 0 && (
                      <ol className="steps-list" style={{ marginTop: 8 }}>
                        {sc.steps.map((st, idx) => (
                          <li key={idx}>{st}</li>
                        ))}
                      </ol>
                    )}

                    {sc.expected_result && (
                      <div className="expected" style={{ marginTop: 8 }}>
                        <strong>Expected:</strong> {sc.expected_result}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}

        <hr className="section-divider" />
      </div>

      {/* ----------------- NEW: Next button that stores checked scenarios ----------------- */}

<div style={{ marginTop: 20, textAlign: "center" }}>
  <button
    className="btn btn-primary"
    onClick={async () => {
      try {
        console.log("[Next] clicked");

        const chosen = listToRender.filter((s, i) => {
          const k = s._id ?? `idx-${i}`;
          return !!selected[k];
        });
        console.log("[Next] chosen count:", chosen.length);

        if (chosen.length === 0) {
          alert("Please select at least one test case.");
          return;
        }
        if (!selectedFramework || !selectedLanguage) {
          alert("Please select framework and language.");
          return;
        }

        // ensure we have the context setter
        if (typeof setTestRunConfig !== "function") {
          console.warn("[Next] setTestRunConfig is not a function - falling back to local navigation");
        }

        // Call the backend to generate tests
        console.log("[Next] calling backend generate-tests", {
          projectId,
          framework: selectedFramework,
          language: selectedLanguage,
          scenariosCount: chosen.length,
          uploadedFilesCount: (uploadedFiles || []).length,
        });

        const res = await fetch(`${API_BASE}/api/projects/${projectId}/generate-tests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            framework: selectedFramework,
            language: selectedLanguage,
            scenarios: chosen,
            uploadedFiles,
          }),
        });

        // parse safely
        let data: any = null;
        try {
          data = await res.json();
        } catch (errParse) {
          console.warn("[Next] response json parse failed:", errParse);
        }

        console.log("[Next] backend responded, ok:", res.ok, "status:", res.status, "data:", data);

        if (!res.ok) {
          // show server-provided message if available
          const msg = (data && (data.message || data.error || data.code)) || `Generate-tests failed (HTTP ${res.status})`;
          console.error("[Next] backend error:", msg);
          // continue to attempt to navigate only if we can still set context with no code
          // but inform user
          if (!confirm(`${msg}\n\nDo you want to proceed to the Test page anyway?`)) {
            return;
          }
        }

        const codeFromServer = data && (data.code ?? data.generated ?? data.result ?? null);
const codesFromServer = data && Array.isArray(data.codes) ? data.codes : null;

const configObj = {
  framework: selectedFramework,
  language: selectedLanguage,
  scenarios: chosen,
  uploadedFiles: uploadedFiles || [],
  ...(codesFromServer ? { codes: codesFromServer } : {}),
  ...(codeFromServer ? { code: String(codeFromServer) } : {}),
};


        // Save to context if setter exists
        try {
          if (typeof setTestRunConfig === "function") {
            setTestRunConfig(configObj as any);
            console.log("[Next] saved testRunConfig to context");
          } else {
            console.warn("[Next] setTestRunConfig not available in context");
          }
        } catch (errSet) {
          console.error("[Next] failed to setTestRunConfig:", errSet);
        }

        // navigate to test page
        console.log("[Next] navigating to /project/" + projectId + "/test");
        navigate(`/project/${projectId}/test`);
      } catch (err: any) {
        console.error("[Next] Unexpected error:", err);
        alert(err?.message || "Unexpected error when generating tests — see console.");
      }
    }}
    disabled={!anySelected}
  >
    Next →
  </button>
</div>

{/* ---------------------------------------------------------------------------------- */}


      {/* ---------------------------------------------------------------------------------- */}

      {/* Preview modal */}
      {previewFileUrl && (
        <div className="modal-overlay" onClick={() => { setPreviewFileUrl(null); setPreviewMeta(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600 }}>{previewMeta?.filename ?? "Preview"}</div>
              <button className="btn" onClick={() => { setPreviewFileUrl(null); setPreviewMeta(null); }}>Close</button>
            </div>
            <div style={{ height: "70vh", marginTop: 8 }}>
              {/\.pdf$/i.test(previewMeta?.filename || "") ||
              (previewMeta?.mimeType || "").includes("pdf") ? (
                <iframe src={previewFileUrl ?? undefined} title="preview" style={{ width: "100%", height: "100%" }} />
              ) : (previewMeta?.mimeType || "").startsWith("image") ? (
                <img src={previewFileUrl ?? undefined} alt="preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <div style={{ padding: 12 }}>
                  <a href={previewFileUrl ?? undefined} target="_blank" rel="noreferrer">Download file</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && editSc && (
        <div className="modal-overlay" onClick={() => { setEditing(false); setEditSc(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Test Case</h3>
            <label className="form-label">Title</label>
            <input className="form-input" value={editSc.title || ""} onChange={(e) => setEditSc({ ...editSc, title: e.target.value })} />
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} value={editSc.description || ""} onChange={(e) => setEditSc({ ...editSc, description: e.target.value })} />
            <label className="form-label">Steps (one per line)</label>
            <textarea
              className="form-textarea"
              rows={6}
              value={(editSc.steps || []).join("\n")}
              onChange={(e) => setEditSc({ ...editSc, steps: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
            />
            <label className="form-label">Expected Result</label>
            <textarea className="form-textarea" rows={2} value={editSc.expected_result || ""} onChange={(e) => setEditSc({ ...editSc, expected_result: e.target.value })} />
            <div className="modal-actions">
              <button className="btn" onClick={() => { setEditing(false); setEditSc(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEditedScenario} disabled={savingEdit}>{savingEdit ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
