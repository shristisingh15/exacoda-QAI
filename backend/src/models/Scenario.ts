// src/models/Scenario.ts
import mongoose from "mongoose";

const ScenarioSchema = new mongoose.Schema({
  projectId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  steps: { type: [String], default: [] },
  expected_result: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Scenario = mongoose.models.Scenario || mongoose.model("Scenario", ScenarioSchema);
export default Scenario;
