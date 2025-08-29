// backend/src/routes/businessRoutes.ts
import { Router } from "express";
import { BusinessProcess } from "../models/BusinessProcess";

export const businessRouter = Router();

businessRouter.get("/", async (_req, res, next) => {
  try {
    const list = await BusinessProcess.find().sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (e) { next(e); }
});

businessRouter.post("/", async (req, res, next) => {
  try {
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ code: "E003", message: "Name is required" });
    const doc = await BusinessProcess.create({ name, description });
    res.status(201).json(doc);
  } catch (e) { next(e); }
});
