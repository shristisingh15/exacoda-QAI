import { Router } from "express";
import mongoose from "mongoose";
import { BusinessProcess } from "../models/BusinessProcess";
import { LoanProcess } from "../models/LoanProcess";

export const debugRouter = Router();

debugRouter.get("/db", async (_req, res) => {
  const conn = mongoose.connection;
  const dbName = conn.name; // active database name

  const bpCount = await conn.collection("businessProcesses").countDocuments().catch(() => null);
  const lpCount = await conn.collection("loanProcesses").countDocuments().catch(() => null);
  const projCount = await conn.collection("projects").countDocuments().catch(() => null);

  return res.json({
    dbName,
    models: {
      BusinessProcessModelCollection: BusinessProcess.collection.name,
      LoanProcessModelCollection: LoanProcess.collection.name,
    },
    counts: {
      businessProcesses: bpCount,
      loanProcesses: lpCount,
      projects: projCount,
    },
  });
});
