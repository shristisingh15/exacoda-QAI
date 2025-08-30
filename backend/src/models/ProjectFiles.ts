import mongoose from "mongoose";

const projectFileSchema = new mongoose.Schema({
  projectId: { type: mongoose.Types.ObjectId, required: true, ref: "Project" },
  filename:  { type: String, required: true },
  original:  { type: String, required: true },
  size:      { type: Number, required: true },
  mimetype:  { type: String, required: true },
  uploadedAt:{ type: Date, default: Date.now },
});

export type ProjectFileDoc = mongoose.InferSchemaType<typeof projectFileSchema>;
export const ProjectFile = mongoose.model<ProjectFileDoc>("ProjectFile", projectFileSchema, "projectFiles");
