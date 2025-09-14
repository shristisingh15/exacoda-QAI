import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./db";
import { businessRouter } from "./routes/businessRoutes";
import { dashboardRouter } from "./routes/dashboard";
import { debugRouter } from "./routes/debug";
import { projectsRouter } from "./routes/projects";



const app = express();
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"], // allow both Vite ports
    credentials: true, // if you need cookies/auth headers
  })
);

app.use(express.json());
app.use("/debug", debugRouter);
app.use("/projects", projectsRouter); 
app.use("/api/business", businessRouter);
app.use("/projects", projectsRouter);
app.use("/api/projects", projectsRouter);


await connectDB();

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/business", businessRouter);   // business & loan processes
app.use("/dashboard", dashboardRouter);     // projects for dashboard

const port = Number(process.env.PORT || 5001);
console.log("🔑 OpenAI key prefix:", process.env.OPENAI_API_KEY?.slice(0, 8));
app.listen(port, () => console.log(`API listening on :${port}`));
