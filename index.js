import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, readFileSync } from "fs";
import pool from "./db.js";
import authRoutes from "./routes/auth.js";
import entriesRoutes from "./routes/entries.js";
import missedRoutes from "./routes/missed.js";
import scheduleRoutes from "./routes/schedule.js";
import classifyRoutes from "./routes/classify.js";
import adminRoutes from "./routes/admin.js";
import prospectsRoutes from "./routes/prospects.js";
import pushRoutes from "./routes/push.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Initialize database schema
try {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("Database schema initialized");
} catch (e) {
  console.error("Database schema init error:", e);
}

const PgSession = connectPgSimple(session);
app.use(cors({
  origin: [
    "https://recyclean-app.vercel.app",
    "https://recyclean-qm4vse2co-recyclean1.vercel.app",
    "https://recyclean-app-git-main-recyclean1.vercel.app"
  ],
  credentials: true
}));

app.use(express.json({ limit: "5mb" }));

app.use(session({
  store: new PgSession({ pool, tableName: "session" }),
  secret: process.env.SESSION_SECRET || "fallback-secret-change-me",
  resave: false,
  saveUninitialized: false,
  sameSite: "lax",
}));

app.use("/api/auth", authRoutes);
app.use("/api/entries", entriesRoutes);
app.use("/api/missed", missedRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/classify", classifyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/prospects", prospectsRoutes);
app.use("/api/push", pushRoutes);

app.get("/api/health", (_, res) => res.json({ ok: true }));

const distPath = join(__dirname, "../dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/{*path}", (_, res) => res.sendFile(join(distPath, "index.html")));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
