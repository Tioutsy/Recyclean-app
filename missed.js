import { Router } from "express";
import pool from "../db.js";

const router = Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
  next();
};

router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT date FROM missed_collections WHERE user_id = $1 ORDER BY date DESC",
      [req.session.userId]
    );
    res.json(result.rows.map(r => r.date));
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { date, zone } = req.body;
  if (!date) return res.status(400).json({ error: "date required" });
  try {
    await pool.query(
      "INSERT INTO missed_collections (user_id, date, zone) VALUES ($1,$2,$3) ON CONFLICT (user_id, date) DO NOTHING",
      [req.session.userId, date, zone || ""]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
