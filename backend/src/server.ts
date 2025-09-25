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

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174","https://exacodaqai-xdtb.onrender.com"],
  })
);
app.use(express.json());

// Routes
app.use("/debug", debugRouter);
app.use("/api/business", businessRouter);
app.use("/api/projects", projectsRouter);
app.use("/dashboard", dashboardRouter);
app.use(generateTestsRouter);
// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// ✅ Start server only once
(async () => {
  try {
    await connectDB();

    // 👇 Default to 5004 locally, or $PORT on Render
    const PORT = Number(process.env.PORT || 5004);

    console.log("🔑 OpenAI key prefix:", process.env.OPENAI_API_KEY?.slice(0, 8));

    app.listen(PORT, () => {
      console.log(`🚀 API listening on :${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();
