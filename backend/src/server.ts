// src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./db.js";
import { businessRouter } from "./routes/businessRoutes.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { debugRouter } from "./routes/debug.js";
import { projectsRouter } from "./routes/projects.js";
import generateTestsRouter from "./routes/generateTestCases.js";

const app = express();

// ------------------- CORS (env-driven) -------------------
// Read allowed frontend origins from env (comma-separated)
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Default dev origins
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];

// Combine and dedupe
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...FRONTEND_ORIGINS]));

// Debug log
console.log("Allowed CORS origins:", allowedOrigins);

// Use CORS with dynamic origin function that DOES NOT throw
app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-side tools (curl) — no origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // not allowed -> don't throw an error, just deny
      console.warn(`CORS: rejecting origin ${origin}`);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ------------------- Other middleware -------------------
app.use(helmet());
app.use(express.json());

// Routes
app.use("/debug", debugRouter);
app.use("/api/business", businessRouter);
app.use("/api/projects", projectsRouter);
app.use("/dashboard", dashboardRouter);
app.use(generateTestsRouter);

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Start server
(async () => {
  try {
    await connectDB();
    const PORT = Number(process.env.PORT || 5004);
    console.log("🔑 OpenAI key prefix:", process.env.OPENAI_API_KEY?.slice(0, 8) ?? "(none)");
    app.listen(PORT, () => {
      console.log(`🚀 API listening on :${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();
