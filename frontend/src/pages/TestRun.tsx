// frontend/src/pages/TestRun.tsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import StepButtons from "./StepButton";
import { useProject } from "./ProjectContext";
import "./TestCases.css";
import "./testrun.css";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://exacoda-qai-q8up.onrender.com";

type Scenario = {
  _id?: string;
  title: string;
  description?: string;
  steps?: string[];
  expected_result?: string;
  fileId?: string;
};

type UploadedFile = {
  _id?: string;
  filename: string;
  url?: string;
  mimeType?: string;
  version?: string;
  uploadedAt?: string;
};

type GeneratedCode = {
  scenarioId?: string;
  title: string;
  code: string;
};

type TestRunConfig = {
  framework: string | null;
  language: string | null;
  scenarios: Scenario[];
  uploadedFiles: UploadedFile[];
  code?: string | null;          // old style (single block)
  codes?: GeneratedCode[] | null; // new style (array of blocks)
} | null;

type RunResult = {
  _id: string;
  title: string;
  passed: boolean;
  durationMs?: number;
  details?: string;
};

export default function TestRunPage(): JSX.Element {
  const { id: projectId } = useParams<{ id: string }>();
  const { projectName, ...rest } = useProject() as any;

  const ctxAny = rest as any;
  const initialConfig: TestRunConfig =
    ctxAny?.testRunConfig ?? ctxAny?.testRun ?? null;

  const [config, setConfig] = useState<TestRunConfig>(initialConfig);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config && initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  const framework = config?.framework ?? null;
  const language = config?.language ?? null;
  const chosenScenarios = Array.isArray(config?.scenarios) ? config.scenarios : [];
  const uploadedFiles = Array.isArray(config?.uploadedFiles) ? config.uploadedFiles : [];

  const canRun = Boolean(framework && language && chosenScenarios.length > 0);

  const runTests = async () => {
    if (!projectId) {
      setError("Missing project id");
      return;
    }
    if (!canRun) {
      setError("Select framework, language and at least one scenario before running tests.");
      return;
    }

    setError(null);
    setRunning(true);
    setResults(null);

    try {
      const resp = await fetch(`${API_BASE}/api/projects/${projectId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          framework,
          language,
          scenarios: chosenScenarios,
          uploadedFiles,
          code: config?.code ?? null,
        }),
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        const msg = (data && (data.message || data.error)) || `Run failed (HTTP ${resp.status})`;
        throw new Error(msg);
      }

      if (Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        setResults(data?.results || data?.items || []);
      }
    } catch (err: any) {
      console.error("Run failed:", err);
      setError(err?.message || String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="project-main testpage-root" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div className="testpage-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Link to="/dashboard" style={{ display: "inline-block", marginBottom: 8 }}>← Back to Projects</Link>
          <h2>{projectName ?? `Project ${projectId ?? ""}`}</h2>
          <p className="project-desc">Test Run</p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/project/${projectId}`} className="btn">Project</Link>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <StepButtons />
      </div>

      <hr className="section-divider" />

      {/* Run controls */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8 }}>
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Framework</div>
          <div style={{ marginTop: 6, fontWeight: 600 }}>{framework ?? "— not selected —"}</div>
        </div>

        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Language</div>
          <div style={{ marginTop: 6, fontWeight: 600 }}>{language ?? "— not selected —"}</div>
        </div>

        <div style={{ minWidth: 320 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Selected scenarios</div>
          <div style={{ marginTop: 6 }}>
            {chosenScenarios.length === 0 ? (
              <span style={{ color: "#6b7280" }}>No scenarios selected</span>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {chosenScenarios.map((s, i) => (
                  <li key={s._id ?? `${i}`}>{s.title}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ marginLeft: "auto" }}>
          <button
            className="btn btn-primary"
            onClick={runTests}
            disabled={!canRun || running}
          >
            {running ? "Running…" : "Run tests"}
          </button>
        </div>
      </div>

      {/* Generated code preview */}
      {Array.isArray(config?.codes) && config.codes.length > 0 ? (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 8 }}>Generated test code</h3>
          {config.codes.map((c, idx) => (
            <div key={c.scenarioId || idx} style={{ marginBottom: 20 }}>
              <h4>{c.title}</h4>
              <pre
                style={{
                  background: "#f7fafc",
                  padding: 12,
                  borderRadius: 8,
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {c.code}
              </pre>
            </div>
          ))}
        </div>
      ) : config?.code ? (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 8 }}>Generated test code</h3>
          <pre style={{ background: "#f7fafc", padding: 12, borderRadius: 8, overflowX: "auto", whiteSpace: "pre-wrap" }}>
            {config.code}
          </pre>
        </div>
      ) : null}

      {/* Results */}
      <div style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 8 }}>Results</h3>

        {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}
        {running && <div>Running tests…</div>}

        {!running && results === null && (
          <div style={{ color: "#6b7280" }}>No run results yet. Click “Run tests”.</div>
        )}

        {!running && Array.isArray(results) && results.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 12 }}>
              <strong>Summary:</strong> {results.filter((r) => r.passed).length}/{results.length} passed
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {results.map((r) => (
                <div key={r._id} style={{ padding: 12, borderRadius: 8, background: r.passed ? "#ecfdf5" : "#fff7f7", border: "1px solid #e6e6e6" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: r.passed ? "#10b981" : "#ef4444" }}>
                      {r.passed ? "PASSED" : "FAILED"}
                    </div>
                  </div>
                  <div style={{ marginTop: 8, color: "#374151" }}>{r.details}</div>
                  {typeof r.durationMs === "number" && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                      Duration: {r.durationMs} ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ height: 60 }} />
    </div>
  );
}
