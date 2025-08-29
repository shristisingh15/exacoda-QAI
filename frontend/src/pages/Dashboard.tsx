import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

interface Project {
  _id?: string;
  name: string;
  description: string;
  type: string;
  date: string;
  step: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [formProject, setFormProject] = useState<Project>({
    name: "",
    description: "",
    type: "Web",
    date: new Date().toISOString().split("T")[0],
    step: "1/1",
  });

  // ✅ Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/business");
        const data = await res.json();
        setProjects(data);
      } catch (error) {
        console.error("❌ Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // ✅ Handle input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormProject({ ...formProject, [e.target.name]: e.target.value });
  };

  // ✅ Add project
  const handleAddProject = async () => {
    if (!formProject.name || !formProject.description) return;
    try {
      const res = await fetch("http://localhost:5001/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formProject),
      });
      const data = await res.json();
      setProjects([...projects, data]);
      closeModal();
    } catch (error) {
      console.error("❌ Error adding project:", error);
    }
  };

  // ✅ Update project
  const handleUpdateProject = async () => {
    if (!editingProject?._id) return;
    try {
      const res = await fetch(`http://localhost:5001/api/business/${editingProject._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formProject),
      });
      const updated = await res.json();
      setProjects(projects.map((p) => (p._id === updated._id ? updated : p)));
      closeModal();
    } catch (error) {
      console.error("❌ Error updating project:", error);
    }
  };

  // ✅ Delete project
  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await fetch(`http://localhost:5001/api/business/${id}`, { method: "DELETE" });
      setProjects(projects.filter((p) => p._id !== id));
    } catch (error) {
      console.error("❌ Error deleting project:", error);
    }
  };

  // ✅ Modal helpers
  const openAddModal = () => {
    setEditingProject(null);
    setFormProject({
      name: "",
      description: "",
      type: "Web",
      date: new Date().toISOString().split("T")[0],
      step: "1/1",
    });
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormProject(project);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProject(null);
  };

  return (
    <div className="dashboard">
      <div className="main-content">
        {/* Top header */}
        <div className="top-header">
          <span className="logo">🧪</span>
          <h1>TestFlow AI</h1>
        </div>

        {/* Page title */}
        <div className="page-header">
          <h2>Test Projects</h2>
          <p>Manage your automated testing projects and workflows</p>
        </div>

        {/* Controls row */}
        <div className="controls">
          <input type="text" placeholder="Search projects..." className="search-bar" />
          <select className="filter-dropdown">
            <option>All Types</option>
            <option>Web</option>
            <option>Mobile</option>
            <option>UI-Testing</option>
          </select>
          <button className="new-project-btn" onClick={openAddModal}>
            + New Project
          </button>
        </div>

        {/* Projects grid */}
        {loading ? (
          <p>Loading projects...</p>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <div key={project._id} className="project-card">
                <div className="project-header" onClick={() => navigate(`/project/${project._id}`)}>
                  <h4>{project.name}</h4>
                  <p>{project.type}</p>
                </div>
                <p className="description">{project.description}</p>
                <div className="project-footer">
                  <div className="date">📅 {project.date}</div>
                  <div className="step">Step {project.step}</div>
                </div>
                <div className="actions">
                  <button onClick={() => openEditModal(project)}>✏️ Edit</button>
                  <button onClick={() => handleDeleteProject(project._id!)}>🗑️ Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>{editingProject ? "Edit Project" : "Create New Project"}</h3>
              <input
                type="text"
                name="name"
                placeholder="Project Name"
                value={formProject.name}
                onChange={handleChange}
              />
              <textarea
                name="description"
                placeholder="Project Description"
                value={formProject.description}
                onChange={handleChange}
              />
              <select name="type" value={formProject.type} onChange={handleChange}>
                <option>Web</option>
                <option>Mobile</option>
                <option>UI-Testing</option>
                <option>API</option>
                <option>AI</option>
              </select>
              <input
                type="date"
                name="date"
                value={formProject.date}
                onChange={handleChange}
              />
              {editingProject ? (
                <button className="save-btn" onClick={handleUpdateProject}>
                  Update
                </button>
              ) : (
                <button className="save-btn" onClick={handleAddProject}>
                  Save
                </button>
              )}
              <button className="cancel-btn" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
