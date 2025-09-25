import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import StepButtons from "./StepButton";
import { useProject, Scenario } from "./ProjectContext";
import "./TestCases.css";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://exacoda-qai-q8up.onrender.com";

export default function TestPage(): JSX.Element {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { projectName, setScenarios: setCtxScenarios, testRunConfig } =
    useProject();

  const [regenerating, setRegenerating] = useState(false);

  // Dropdowns
  const frameworkOptions = ["Jest", "Mocha", "Cypress", "Playwright", "JUnit"];
  const languageOptions = ["JavaScript", "TypeScript", "Python", "Java", "C#"];
  const [selectedFramework, setSelectedFramework] = useState<string | "">("");
  const [selectedLanguage, setSelectedLanguage] = useState<string | "">("");

  useEffect(() => {
    if (testRunConfig?.framework) setSelectedFramework(testRunConfig.framework);
    if (testRunConfig?.language) setSelectedLanguage(testRunConfig.language);
  }, [testRunConfig]);

  return (
    <div className="project-main testpage-root" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div
        className="testpage-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <h2>{projectName ?? `Project ${projectId ?? ""}`}</h2>
          <p className="project-desc">Test Cases</p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => navigate(-1)}>
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            disabled={regenerating}
          >
            {regenerating ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ marginTop: 12 }}>
        <StepButtons />
      </div>

      {/* Dropdowns */}
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
      </div>

      {/* Generated test cases */}
      {testRunConfig?.codes && testRunConfig.codes.length > 0 ? (
        <div style={{ marginTop: 20 }}>
          {testRunConfig.codes.map((c: any, idx: number) => (
            <div
              key={c.scenarioId ?? idx}
              style={{
                background: "#f8fafc",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <h4 style={{ marginBottom: 8 }}>{c.title}</h4>
              <pre
                style={{
                  background: "#fff",
                  padding: 12,
                  borderRadius: 6,
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {c.code}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 20, color: "#6b7280" }}>
          No generated test cases yet. Go back to{" "}
          <Link to={`/project/${projectId}/scenarios`}>Test Scenarios</Link> and
          select some.
        </div>
      )}
    </div>
  );
}
