// src/models/Scenario.ts
import mongoose from "mongoose";

const ScenarioSchema = new mongoose.Schema({
  projectId: { type: String, required: true, index: true },
  businessProcessId: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessProcess" }, // 🔹 new
  businessProcessName: { type: String }, // 🔹 optional, useful for grouping in UI
  title: { type: String, required: true },
  description: { type: String },
  steps: { type: [String], default: [] },
  expected_result: { type: String },
  createdAt: { type: Date, default: Date.now },
  source: { type: String, default: "manual" }, // 🔹 you were setting this in the route
});

export const Scenario =
  mongoose.models.Scenario || mongoose.model("Scenario", ScenarioSchema);
export default Scenario;
