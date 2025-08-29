import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MdExpandMore, MdExpandLess } from "react-icons/md";
import "./projectflow.css";

const ProjectFlow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Hardcoded projects with versions
  const projects = [
    { name: "Test Project", versions: ["v1.0", "v2.0"] },
    { name: "Abhijit", versions: ["v1.0", "v2.0"] },
    { name: "Oracle UI Demo", versions: ["v1.0", "v2.0"] },
    { name: "Retail Loans Application", versions: ["v1.0", "v2.0"] },
  ];

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Side Panel */}
      <div className="project-sidebar">
        <h3 className="sidebar-title">Projects</h3>
        <ul className="sidebar-projects">
          {projects.map((proj) => (
            <li key={proj.name} className="sidebar-project-item">
              <div
                className="sidebar-project-header"
                onClick={() =>
                  setExpandedProject(
                    expandedProject === proj.name ? null : proj.name
                  )
                }
              >
                <span>{proj.name}</span>
                {expandedProject === proj.name ? (
                  <MdExpandLess />
                ) : (
                  <MdExpandMore />
                )}
              </div>
              {/* Show versions only if project is expanded */}
              {expandedProject === proj.name && (
                <ul className="sidebar-versions">
                  {proj.versions.map((ver, idx) => (
                    <li key={idx} className="sidebar-version-item">
                      {ver}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Project Content */}
      <div className="project-main">
        {/* Topbar */}
        <div className="topbar">
          <Link to="/dashboard">← Back to Projects</Link>
          <div className="topbar-actions">
            <button>Settings</button>
            <button>Logout</button>
          </div>
        </div>

        {/* Project Header */}
        <h2>Project: {id}</h2>
        <p>This is the flow view for <b>{id}</b>.</p>

        {/* Stepper */}
        <div className="stepper">
          <div className="stepper-step">
            <div className="circle active">1</div>
            <span>Upload Documents</span>
          </div>
          <div className="stepper-step">
            <div className="circle inactive">2</div>
            <span>Flow Analysis</span>
          </div>
          <div className="stepper-step">
            <div className="circle inactive">3</div>
            <span>Test Scenarios</span>
          </div>
          <div className="stepper-step">
            <div className="circle inactive">4</div>
            <span>Test Cases</span>
          </div>
          <div className="stepper-step">
            <div className="circle inactive">5</div>
            <span>Test</span>
          </div>
        </div>

        {/* Upload Section */}
        <div className="upload-container">
          <div className="upload-box">
            <h3>Upload Documents</h3>
            <p>Upload your functional requirements, specifications, or use stories</p>
            <input type="file" />
            <p>Drop your files here</p>
            <p>Supports PDF, DOC, DOCX, TXT files up to 10MB</p>
            <button>Choose File</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectFlow;
