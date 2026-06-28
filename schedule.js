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
      "SELECT mode, region_id, custom_start FROM user_schedules WHERE user_id = $1",
      [req.session.userId]
    );
    res.json(result.rows[0] || null);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { mode, region_id, custom_start } = req.body;
  if (!mode) return res.status(400).json({ error: "mode required" });
  try {
    await pool.query(
      `INSERT INTO user_schedules (user_id, mode, region_id, custom_start, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (user_id) DO UPDATE SET mode=$2, region_id=$3, custom_start=$4, updated_at=NOW()`,
      [req.session.userId, mode, region_id || null, custom_start || null]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
