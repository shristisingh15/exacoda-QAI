import mongoose from "mongoose";

const businessProcessSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

export type BusinessProcessDoc = mongoose.InferSchemaType<typeof businessProcessSchema>;
export const BusinessProcess = mongoose.model<BusinessProcessDoc>("BusinessProcess", businessProcessSchema);
