import mongoose from "mongoose";

const bpSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

export type BusinessProcessDoc = mongoose.InferSchemaType<typeof bpSchema>;
export const BusinessProcess = mongoose.model<BusinessProcessDoc>("BusinessProcess", bpSchema, "businessProcesses");
