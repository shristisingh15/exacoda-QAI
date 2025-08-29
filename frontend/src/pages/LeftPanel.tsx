import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../auth";
import "./LeftPanel.css" 

const LeftPanel: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    auth.logout();
    navigate("/login", { replace: true });
    window.location.reload();
  };

  // Function to check active route
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="sidebar">
      {/* Projects Section */}
      <div className="sidebar-header">
        <h3 className="sidebar-title">Projects</h3>
        <ul className="project-list">
          <li onClick={() => navigate("/project/1")}>Test Project</li>
          <li onClick={() => navigate("/project/2")}>Abhijit</li>
          <li onClick={() => navigate("/project/3")}>Oracle UI Demo</li>
          <li onClick={() => navigate("/project/4")}>Retail Loans Application</li>
        </ul>
      </div>

      {/* Navigation Section */}
      <div className="sidebar-nav">
        <ul>
          <li
            className={isActive("/dashboard") ? "active" : ""}
            onClick={() => navigate("/dashboard")}
          >
            📊 Dashboard
          </li>
          <li
            className={isActive("/projects") ? "active" : ""}
            onClick={() => navigate("/projects")}
          >
            📁 Projects
          </li>
          <li
            className={isActive("/upload") ? "active" : ""}
            onClick={() => navigate("/upload")}
          >
            ⬆️ Upload File
          </li>
          <li
            className={isActive("/results") ? "active" : ""}
            onClick={() => navigate("/results")}
          >
            📜 Results
          </li>
          <li
            className={isActive("/settings") ? "active" : ""}
            onClick={() => navigate("/settings")}
          >
            ⚙️ Settings
          </li>
        </ul>
      </div>

      {/* Footer Logout */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default LeftPanel;
