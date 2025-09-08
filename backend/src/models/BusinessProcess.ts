import mongoose from "mongoose";

const bpSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    priority: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"], // 🔹 allowed values
      default: "Medium",                           // 🔹 default if not provided
    },
    createdAt: { type: Date, default: Date.now },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" }, // 🔹 optional: link BP to a project
  },
  { timestamps: false }
);

export type BusinessProcessDoc = mongoose.InferSchemaType<typeof bpSchema>;
export const BusinessProcess = mongoose.model<BusinessProcessDoc>(
  "BusinessProcess",
  bpSchema,
  "businessProcesses"
);
