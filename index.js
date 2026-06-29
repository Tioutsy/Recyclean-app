import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
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

// Create prospects table on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS prospects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    zone_id TEXT NOT NULL,
    locality TEXT DEFAULT '',
    locality_covered BOOLEAN DEFAULT TRUE,
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
  )
`).catch(e => console.error("prospects table init error:", e));

// Add locality columns to existing tables (safe no-op on new tables)
pool.query(`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS locality TEXT DEFAULT ''`).catch(()=>{});
pool.query(`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS locality_covered BOOLEAN DEFAULT TRUE`).catch(()=>{});

// Push subscriptions table
pool.query(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
  )
`).catch(e => console.error("push_subscriptions table init error:", e));

const PgSession = connectPgSimple(session);

app.use(express.json({ limit: "5mb" }));

app.use(cors({
  origin: [
    "https://recyclean-app.vercel.app",
    "https://recyclean-qm4vse2co-recyclean1.vercel.app",
    "https://recyclean-app-git-main-recyclean1.vercel.app"
  ],
  credentials: true
}));

app.use(session({
  store: new PgSession({ pool, tableName: "session" }),
  secret: process.env.SESSION_SECRET || "fallback-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
  },
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
