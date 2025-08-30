import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true },   // UI "name"
    description: { type: String, default: "" },
    projectType: { type: String, default: "Web" },   // UI "type"
    date:        { type: String },                   // store as yyyy-mm-dd string
    progress:    { type: Number, default: 0 }        // UI "step" (e.g., 60)
  },
  { timestamps: false }
);

export type ProjectDoc = mongoose.InferSchemaType<typeof projectSchema>;

// 3rd arg pins the exact collection name:
export const Project = mongoose.model<ProjectDoc>("Project", projectSchema, "projects");
