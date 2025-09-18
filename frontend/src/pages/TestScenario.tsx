// frontend/src/pages/TestScenarios.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import StepButtons from "./StepButton";
import { useProject, Scenario } from "./ProjectContext"; // ✅ use context
import "./testscenario.css";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://exacoda-qai-q8up.onrender.com";

type ProjectDetails = {
  _id?: string;
  name?: string;
  description?: string;
  [k: string]: any;
};

export default function TestScenariosPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { setScenarios: setCtxScenarios, selectScenario } = useProject();

  const [projectDetails, setProjectDetails] =
    useState<ProjectDetails | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [projectErr, setProjectErr] = useState<string | null>(null);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [scenariosErr, setScenariosErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // fetch project meta
  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    (async () => {
      setLoadingProject(true);
      setProjectErr(null);
      try {
        const res = await fetch(`${API_BASE}/api/projects/${id}`, {
          signal: ac.signal,
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${t}`);
        }
        const json = await res.json();
        setProjectDetails(json || null);
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setProjectErr(e.message || "Failed to load project");
      } finally {
        setLoadingProject(false);
      }
    })();
    return () => ac.abort();
  }, [id]);

  // fetch scenarios
  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    (async () => {
      setLoadingScenarios(true);
      setScenariosErr(null);
      try {
        const res = await fetch(
          `${API_BASE}/api/projects/${id}/scenarios`,
          { signal: ac.signal }
        );
        if (!res.ok) {
          if (res.status === 404) {
            setScenarios([]);
            setLoadingScenarios(false);
            return;
          }
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${t}`);
        }
        const json = await res.json();
        const list: Scenario[] = Array.isArray(json) ? json : json?.items ?? [];
        setScenarios(list);
        const map: Record<string, boolean> = {};
        list.forEach((s) => (map[s._id!] = false));
        setSelected(map);
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setScenariosErr(e.message || "Failed to load scenarios");
      } finally {
        setLoadingScenarios(false);
      }
    })();
    return () => ac.abort();
  }, [id]);

  // selection helpers
  const toggleSelect = (sid: string) =>
    setSelected((prev) => ({ ...prev, [sid]: !prev[sid] }));
  const allSelected =
    scenarios.length > 0 && scenarios.every((s) => selected[s._id!]);
  const anySelected = Object.values(selected).some(Boolean);
  const toggleSelectAll = () => {
    if (allSelected) {
      const cleared: Record<string, boolean> = {};
      scenarios.forEach((s) => (cleared[s._id!] = false));
      setSelected(cleared);
    } else {
      const all: Record<string, boolean> = {};
      scenarios.forEach((s) => (all[s._id!] = true));
      setSelected(all);
    }
  };

  // Next button → save selected scenarios to context and navigate
  const handleNext = () => {
    if (!id) return;
    const chosen = scenarios.filter((s) => selected[s._id!]);
    if (chosen.length === 0) {
      alert("Please select at least one test scenario.");
      return;
    }
    // update context
    setCtxScenarios(chosen);
    selectScenario(chosen[0]); // pick first as "primary"
    // go to test cases page
    navigate(`/project/${id}/testcases`);
  };

  const tiles = useMemo(() => scenarios, [scenarios]);

  return (
    <div
      className="project-page test-scenarios-root"
      style={{ minHeight: "100vh" }}
    >
      {/* Topbar */}
      <div className="topbar">
        <Link to="/dashboard">← Back to Projects</Link>
        <div className="topbar-actions">
          <button type="button">Settings</button>
          <button
            type="button"
            onClick={() => (window.location.href = "/login")}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="project-header">
        <h2>
          {projectDetails?.name ||
            (loadingProject ? "Loading…" : "Test Scenarios")}
        </h2>

        {projectDetails?.description ? (
          <p className="muted">{projectDetails.description}</p>
        ) : (
          <p className="muted">Test scenarios for the selected project.</p>
        )}

        {projectErr && <p style={{ color: "crimson" }}>{projectErr}</p>}
      </div>

      {/* Stepper */}
      <StepButtons />

      <hr className="section-divider" />

      {/* Controls */}
      <div className="controls-row">
        <button className="scenario-btn">＋ New Scenario</button>
        <button className="scenario-btn">Bulk Actions</button>

        <div className="controls-right">
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            <span>Select all</span>
          </label>

          <div className="selected-counter">
            {anySelected
              ? `${Object.values(selected).filter(Boolean).length} selected`
              : "0 selected"}
          </div>
        </div>
      </div>

      {/* Tiles grid */}
      <div className="tiles-wrap">
        {loadingScenarios ? (
          <p>Loading scenarios…</p>
        ) : scenariosErr ? (
          <p style={{ color: "crimson" }}>{scenariosErr}</p>
        ) : tiles.length === 0 ? (
          <div className="empty-state">
            <p>
              No test scenarios yet. Click “Regenerate Scenarios” or “New
              Scenario” to create some.
            </p>
          </div>
        ) : (
          <div className="tiles-grid">
            {tiles.map((s, idx) => (
              <article key={s._id} className="tile-card">
                <div className="tile-header">
                  <label className="tile-select">
                    <input
                      type="checkbox"
                      checked={!!selected[s._id!]}
                      onChange={() => toggleSelect(s._id!)}
                    />
                  </label>
                  <h3 className="tile-title">
                    {idx + 1}. {s.title}
                  </h3>
                
                </div>

                {s.description && (
                  <p className="tile-desc">{s.description}</p>
                )}

                {s.steps && s.steps.length > 0 && (
                  <ol className="tile-steps">
                    {s.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>
                )}

                {s.expected_result && (
                  <div className="tile-expected">
                    <strong>Expected:</strong> {s.expected_result}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Next button */}
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <button
          className="btn btn-primary"
          onClick={handleNext}
          disabled={!anySelected}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
