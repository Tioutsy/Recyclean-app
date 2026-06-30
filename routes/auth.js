import { Router } from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";

const router = Router();

router.post("/signup", async (req, res) => {
  const { email, password, name, zone } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name, zone) VALUES ($1, $2, $3, $4) RETURNING id, email, name, zone",
      [email.toLowerCase().trim(), hash, name || "", zone || ""]
    );
    const user = result.rows[0];
    const isAdmin = user.email === (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    req.session.userId = user.id;
req.session.isAdmin = isAdmin;

req.session.save((err) => {
  if (err) {
    console.error("Session save error:", err);
    return res.status(500).json({ error: "Session error" });
  }

  res.json({ user: { ...user, isAdmin } });
});
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Email already registered" });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid email or password" });
    const isAdmin = user.email === (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    req.session.userId = user.id;
req.session.isAdmin = isAdmin;

req.session.save((err) => {
  if (err) {
    console.error("Session save error:", err);
    return res.status(500).json({ error: "Session error" });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      zone: user.zone,
      isAdmin,
    },
  });
});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
  try {
    const result = await pool.query("SELECT id, email, name, zone FROM users WHERE id = $1", [req.session.userId]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "User not found" });
    const isAdmin = user.email === (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    res.json({ user: { ...user, isAdmin } });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
  const { name, zone } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET name = $1, zone = $2 WHERE id = $3 RETURNING id, email, name, zone",
      [name || "", zone || "", req.session.userId]
    );
    const user = result.rows[0];
    const isAdmin = user.email === (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    res.json({ user: { ...user, isAdmin } });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
