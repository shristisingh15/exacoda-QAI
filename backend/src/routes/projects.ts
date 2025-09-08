import { Router } from "express";
import multer from "multer";
import OpenAI from "openai";
import mammoth from "mammoth";
import { Project } from "../models/Project";
import { ProjectFile } from "../models/ProjectFiles";
import { BusinessProcess } from "../models/BusinessProcess";
import { Scenario } from "../models/Scenario";

export const projectsRouter = Router();

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

/** Convert DB project doc -> UI shape */
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

/**
 * GET /projects
 */
projectsRouter.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.max(Number(req.query.limit || 12), 1);

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

/**
 * POST /projects/:id/upload
 */
projectsRouter.post("/:id/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file is required" });

    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: "project not found" });

    const count = await ProjectFile.countDocuments({ projectId: req.params.id });
    const version = `v${count + 1}.0`;

    const saved = await ProjectFile.create({
      projectId: req.params.id,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
      uploadedAt: new Date(),
      version,
    });

    console.log("✅ File uploaded:", saved.filename, saved.version);

    return res.status(201).json({
      ok: true,
      fileId: saved._id,
      filename: saved.filename,
      version: saved.version,
    });
  } catch (err: any) {
    console.error("❌ Upload failed:", err);
    return res.status(500).json({ message: "Upload failed", error: String(err.message || err) });
  }
});

/**
 * GET /projects/:id/files
 */
projectsRouter.get("/:id/files", async (req, res, next) => {
  try {
    const files = await ProjectFile.find({ projectId: req.params.id })
      .sort({ uploadedAt: 1 })
      .lean();

    res.json(
      files.map((f) => ({
        _id: f._id,
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size,
        version: f.version,
        uploadedAt: f.uploadedAt,
      }))
    );
  } catch (e) {
    next(e);
  }
});

/**
 * GET /projects/:id/files/:fileId
 */
projectsRouter.get("/:id/files/:fileId", async (req, res, next) => {
  try {
    const file = await ProjectFile.findOne({
      _id: req.params.fileId,
      projectId: req.params.id,
    });

    if (!file) return res.status(404).json({ message: "file not found" });

    res.set({
      "Content-Type": file.mimetype,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    });
    res.send(file.data);
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
    await ProjectFile.deleteMany({ projectId: req.params.id });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/**
 * POST /projects/:id/regenerate
 */
projectsRouter.post("/:id/regenerate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, message: "file is required" });
    console.log("📂 Regenerate triggered with file:", req.file.originalname, "mimetype:", req.file.mimetype);

    // ---- Extraction helper ----
    async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
      try {
        const { default: pdfParse } = await import("pdf-parse-fixed");
        const pdf = await pdfParse(buffer);
        if (pdf?.text && pdf.text.trim().length > 0) {
          console.log("📄 extracted via pdf-parse-fixed, length:", pdf.text.length);
          return pdf.text;
        }
      } catch (err: any) {
        console.warn("⚠️ pdf-parse-fixed failed:", err?.message || err);
      }
      // fallback: salvage
      const raw = buffer.toString("utf8");
      const cleaned = raw.replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ");
      const truncated = cleaned.slice(0, 200000);
      console.log("📄 extracted via buffer-salvage, length:", truncated.length);
      return truncated;
    }

    // ---- Extract content ----
    let content = "";
    const name = req.file.originalname || "";
    const mimetype = req.file.mimetype || "";

    if (mimetype === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
      content = await extractTextFromPdfBuffer(req.file.buffer);
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.toLowerCase().endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      content = result?.value || "";
    } else {
      content = req.file.buffer.toString("utf8");
    }

    console.log("📄 Extracted content length:", content.length);

    // ---- Find candidate processes ----
    const id = req.params.id;
    let processes: any[] = await BusinessProcess.find({
      $or: [{ projectId: id }, { applicationId: id }, { processId: id }],
    }).lean();

    if (!processes || processes.length === 0) {
      processes = await BusinessProcess.find({}).limit(200).lean();
      console.warn("⚠️ Falling back to ALL business processes. Count:", processes.length);
    }

    if (processes.length === 0) {
      return res.json({ ok: true, matchedCount: 0, items: [], note: "No business processes found" });
    }

    // ---- Local fallback scorer ----
    const tokenize = (text: string) =>
      Array.from(
        new Set(
          (text || "")
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 2)
        )
      );
    const docTokens = tokenize(content);
    function scoreOverlap(bpText: string) {
      const bpTokens = tokenize(bpText);
      let common = 0;
      const bpSet = new Set(bpTokens);
      for (const t of docTokens) if (bpSet.has(t)) common++;
      return common / Math.max(1, bpTokens.length);
    }

    // ---- Build LLM prompt ----
    const bpListStr = processes
      .map((bp, i) => `${i + 1}. id=${bp._id} name="${bp.name}" desc="${(bp.description || "").slice(0, 200)}" priority=${bp.priority || "Medium"}`)
      .join("\n");

    const docSnippet = content.length > 9000 ? content.slice(0, 9000) : content;
    const prompt = `You are a precise assistant. Given the document below and a list of BUSINESS PROCESSES, RETURN A JSON ARRAY OF THE RELEVANT PROCESSES (by id).

Rules:
- Strict JSON only.
- Each object: "_id", "name", "description", "priority".
- If none clearly match, return top 3 likely matches instead.

DOCUMENT:
"""${docSnippet}"""

BUSINESS PROCESSES:
${bpListStr}
`;

    console.log("🤖 Sending prompt to OpenAI…");

    // ---- Call OpenAI ----
    let aiText = "";
    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 1500,
      });
      aiText = response.choices?.[0]?.message?.content || "";
      console.log("🔹 Raw OpenAI output (trim):", aiText.slice(0, 400));
    } catch (err: any) {
      console.error("❌ OpenAI call failed:", err);
    }

    // ---- Parse JSON ----
    let items: any[] = [];
    let parsed = false;
    if (aiText) {
      try {
        const fenceMatch = aiText.match(/```json([\s\S]*?)```/i);
        const jsonText = fenceMatch ? fenceMatch[1].trim() : aiText.trim();
        items = JSON.parse(jsonText || "[]");
        parsed = true;
      } catch (err) {
        console.warn("⚠️ JSON parse failed:", err);
      }
    }

    // ---- Build final full relevance list ----
    // Compute score for every process
    const scoredAll = processes.map((bp) => {
      const text = `${bp.name} ${bp.description || ""}`;
      return { bp, score: scoreOverlap(text) };
    });

    // Map model-returned items (if any) to DB processes and mark them
    const aiIds = new Set<string>();
    const mappedAiItems: any[] = [];
    if (parsed && Array.isArray(items)) {
      for (const it of items) {
        // try to match by _id first, then by name
        let p = processes.find((bp) => String(bp._id) === String(it._id));
        if (!p && it.name) {
          p = processes.find((bp) => (bp.name || "").toLowerCase() === String(it.name).toLowerCase());
        }
        if (p) {
          aiIds.add(String(p._id));
          const s = scoredAll.find((x) => String(x.bp._id) === String(p._id));
          mappedAiItems.push({
            _id: String(p._id),
            name: p.name,
            description: p.description,
            priority: p.priority || "Medium",
            _score: s ? s.score : 0,
            _filledFrom: "openai",
          });
        } else {
          // keep the raw item if it didn't map (so user can inspect)
          mappedAiItems.push({ ...it, _filledFrom: "openai_unmapped" });
        }
      }
    }

    // Add remaining processes that have positive score (or zero if you want everything)
    const remaining = scoredAll
      .filter((s) => !aiIds.has(String(s.bp._id)) && s.score > 0) // include positive scored ones
      .map((s) => ({
        _id: String(s.bp._id),
        name: s.bp.name,
        description: s.bp.description,
        priority: s.bp.priority || "Medium",
        _score: s.score,
        _filledFrom: "local_score",
      }));

    // Optionally: also include zero-score processes if you truly want ALL; currently we include only score>0
    // If you want to include everything, replace the filter above with: .filter(s => !aiIds.has(String(s.bp._id)))

    // Combine mapped AI items first, then remaining, and sort by _score desc
    const finalItems = [...mappedAiItems, ...remaining].sort((a: any, b: any) => {
      const sa = typeof a._score === "number" ? a._score : 0;
      const sb = typeof b._score === "number" ? b._score : 0;
      return sb - sa;
    });

    const branch = parsed ? "openai_plus_local" : "local_only";

    console.log(`✅ Branch used: ${branch}, count: ${finalItems.length}`);
    return res.json({ ok: true, branch, matchedCount: finalItems.length, items: finalItems, raw: aiText });
  } catch (e: any) {
    console.error("❌ Regenerate failed:", e);
    return res.status(500).json({ ok: false, message: "Regenerate failed", error: String(e.message || e) });
  }
});


//
// POST /projects/:id/generate-scenarios
// - body: { bpIds: string[], prompt?: string }
// - returns: saved scenario docs
//
projectsRouter.post("/:id/generate-scenarios", upload.none(), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { bpIds, prompt: promptOverride } = req.body || {};

    if (!projectId) return res.status(400).json({ ok: false, message: "projectId required" });
    if (!Array.isArray(bpIds) || bpIds.length === 0) {
      return res.status(400).json({ ok: false, message: "bpIds array required" });
    }

    // load the selected business processes
    const bps = await BusinessProcess.find({ _id: { $in: bpIds } }).lean();
    if (!bps || bps.length === 0) {
      return res.status(400).json({ ok: false, message: "No business processes found for given ids" });
    }

    // load project and most recent uploaded file (if any)
    const project = await Project.findById(projectId).lean();
    const latestFile = await ProjectFile.findOne({ projectId }).sort({ uploadedAt: -1 }).lean();

    // helper: extract text from a buffer (reuse approach from regenerate)
    async function extractTextFromBuffer(buffer: Buffer, filename = "", mimetype = ""): Promise<string> {
      try {
        if (mimetype === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
          const { default: pdfParse } = await import("pdf-parse-fixed");
          const pdf = await pdfParse(buffer);
          if (pdf?.text && pdf.text.trim().length > 0) return pdf.text;
        } else if (
          mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          filename.toLowerCase().endsWith(".docx")
        ) {
          const result = await mammoth.extractRawText({ buffer });
          if (result?.value) return result.value;
        }
      } catch (err) {
        // fallthrough to fallback
        console.warn("extractTextFromBuffer helper: primary extract failed:", (err as Error).message || err);
      }
      // fallback: raw utf8 salvage, cleaned
      const raw = buffer.toString("utf8");
      const cleaned = raw.replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ");
      return cleaned.slice(0, 200000);
    }

    const docText = latestFile ? await extractTextFromBuffer(latestFile.data, latestFile.filename, latestFile.mimetype) : "";

    // build LLM prompt
    const bpLines = bps
      .map((b, i) => `${i + 1}. id=${b._id} name="${b.name}" desc="${(b.description || "").slice(0, 300)}"`)
      .join("\n");

    const docSnippet = docText ? (docText.length > 8000 ? docText.slice(0, 8000) : docText) : "";

    const instructions = [
      `You are an expert QA engineer. Given the project info as documents and a list of selected BUSINESS PROCESSES, generate atleast 5 business scenario , testable manual test scenarios.`,
      `Output: a JSON array only. Each element must be an object with keys: "title" (string), "description" (string), "steps" (array of strings), "expected_result" (string).`,
      `Do not include any commentary; return valid JSON only.`,
    ].join("\n\n");

    const promptParts = [
      `Project: ${project?.projectName || projectId}`,
      project?.description ? `Project description: ${project.description}` : undefined,
      docSnippet ? `Document excerpt:\n"""${docSnippet}"""` : undefined,
      "Selected business processes:",
      bpLines,
      instructions,
      promptOverride ? `Additional instructions:\n${promptOverride}` : undefined,
    ].filter(Boolean).join("\n\n");

    console.log("generate-scenarios: sending prompt to OpenAI (truncated preview):", promptParts.slice(0, 800));

    // call OpenAI via your existing client
    let aiText = "";
    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: promptParts }],
        temperature: 0.1,
        max_tokens: 1500,
      });
      aiText = response.choices?.[0]?.message?.content || "";
      console.log("generate-scenarios: raw AI output length:", aiText.length);
    } catch (err: any) {
      console.error("generate-scenarios: OpenAI call failed:", err);
      return res.status(502).json({ ok: false, message: "OpenAI call failed", error: String(err?.message || err) });
    }

    // try parsing JSON robustly
    let parsed: any[] = [];
    try {
      // strip fenced blocks if present
      const fenceMatch = aiText.match(/```json([\s\S]*?)```/i);
      const jsonText = fenceMatch ? fenceMatch[1].trim() : aiText.trim();
      parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error("Parsed value is not an array");
    } catch (err) {
      // try to find first [ ... ] block
      const start = aiText.indexOf("[");
      const end = aiText.lastIndexOf("]");
      if (start >= 0 && end > start) {
        try {
          const sub = aiText.slice(start, end + 1);
          parsed = JSON.parse(sub);
        } catch (err2) {
          console.warn("generate-scenarios: secondary JSON parse failed:", err2);
        }
      }
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn("generate-scenarios: failed to parse scenarios from AI. Returning AI raw output for debugging.");
      return res.status(500).json({ ok: false, message: "Failed to parse scenarios from OpenAI", raw: aiText });
    }

    // sanitize and save scenarios
    const docsToInsert = parsed.map((s: any) => {
      return {
        projectId,
        title: s.title || s.name || "Untitled scenario",
        description: s.description || s.summary || "",
        steps: Array.isArray(s.steps) ? s.steps.map(String) : (s.steps ? [String(s.steps)] : []),
        expected_result: s.expected_result || s.expectedResult || s.expected || "",
        source: "ai",
      };
    });

    const inserted = await Scenario.insertMany(docsToInsert);

    return res.json({ ok: true, count: inserted.length, scenarios: inserted });
  } catch (err: any) {
    console.error("generate-scenarios: unexpected error:", err);
    return res.status(500).json({ ok: false, message: "Internal server error", error: String(err?.message || err) });
  }
});

//
// GET /projects/:id/scenarios
//
projectsRouter.get("/:id/scenarios", async (req, res) => {
  try {
    const items = await Scenario.find({ projectId: req.params.id }).sort({ createdAt: -1 }).lean();
    return res.json({ items });
  } catch (err: any) {
    console.error("get scenarios error:", err);
    return res.status(500).json({ ok: false, message: "Failed to load scenarios", error: String(err?.message || err) });
  }
});


/**
 * GET /projects/test/openai
 */
projectsRouter.get("/test/openai", async (req, res) => {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say hello from backend" }],
    });
    res.json({ ok: true, reply: response.choices[0]?.message?.content || "No reply" });
  } catch (err: any) {
    res.status(500).json({ error: String(err.message || err) });
  }
});
