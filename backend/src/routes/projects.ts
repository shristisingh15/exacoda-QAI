// backend/src/routes/project.ts
import { Router } from "express";
import { Project } from "../models/Project";
import multer from "multer";
import path from "path";
import fs from "fs";
import { ProjectFile } from "../models/ProjectFiles";


export const projectsRouter = Router();

/** Map Mongo doc -> UI shape used by the frontend */
function toUI(p: any) {
  return {
    _id: String(p._id),
    name: p.projectName,
    description: p.description ?? "",
    type: p.projectType ?? "Web",
    date: p.date ?? "",
    step: typeof p.progress === "number" ? `${p.progress}%` : "0%",
  };
}
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * GET /projects
 * Query:
 *   q     - search by projectName/description
 *   limit - default 12
 */
projectsRouter.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.max(parseInt(String(req.query.limit || "12"), 10), 1);

    const filter = q
      ? {
          $or: [
            { projectName: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const raw = await Project.find(filter).sort({ _id: -1 }).limit(limit).lean();
    res.json({ items: raw.map(toUI), total: raw.length });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /projects/:id
 * Returns a single project in UI shape
 */
projectsRouter.get("/:id", async (req, res, next) => {
  try {
    const doc = await Project.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "not found" });
    res.json(toUI(doc));
  } catch (e) {
    next(e);
  }
});

/**
 * POST /projects
 * Body (UI shape):
 *   { name, description, type, date, step }  // step like "60%"
 * Stores DB shape: { projectName, description, projectType, date, progress }
 */
projectsRouter.post("/", async (req, res, next) => {
  try {
    const { name, description, type, date, step } = req.body || {};
    if (!name) return res.status(400).json({ message: "name is required" });

    const progress =
      typeof step === "string" ? Number(step.match(/\d+/)?.[0] || 0) : 0;

    const created = await Project.create({
      projectName: name,
      description: description ?? "",
      projectType: type ?? "Web",
      date: date ?? new Date().toISOString().split("T")[0],
      progress,
    });

    res.status(201).json(toUI(created));
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /projects/:id
 * Accepts UI shape fields; only provided keys are updated.
 */
projectsRouter.put("/:id", async (req, res, next) => {
  try {
    const { name, description, type, date, step } = req.body || {};

    const update: Record<string, any> = {};
    if (name !== undefined) update.projectName = name;
    if (description !== undefined) update.description = description;
    if (type !== undefined) update.projectType = type;
    if (date !== undefined) update.date = date;
    if (step !== undefined) {
      update.progress =
        typeof step === "string" ? Number(step.match(/\d+/)?.[0] || 0) : 0;
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "not found" });

    res.json(toUI(updated));
  } catch (e) {
    next(e);
  }
});

// POST /projects/:id/upload  (multipart form: field "file")
projectsRouter.post("/:id/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file is required" });

    // Optional: store metadata
    await ProjectFile.create({
      projectId: req.params.id,
      filename:  req.file.filename,
      original:  req.file.originalname,
      size:      req.file.size,
      mimetype:  req.file.mimetype,
    });

    return res.status(201).json({ ok: true, file: req.file.filename });
  } catch (e) {
    next(e);
  }
});


/**
 * DELETE /projects/:id
 */
projectsRouter.delete("/:id", async (req, res, next) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
