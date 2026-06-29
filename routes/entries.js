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
      "SELECT * FROM entries WHERE user_id = $1 ORDER BY created_at DESC",
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { type, value, category, note, ai_item_name, ai_confidence } = req.body;
  if (!type || !category) return res.status(400).json({ error: "type and category required" });
  try {
    const safeValue = type === "photo" ? "[photo]" : (value || "");
    const result = await pool.query(
      "INSERT INTO entries (user_id, type, value, category, note, ai_item_name, ai_confidence) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [req.session.userId, type, safeValue, category, note || "", ai_item_name || "", ai_confidence || ""]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/bulk", requireAuth, async (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ error: "entries array required" });
  try {
    const inserted = [];
    for (const e of entries) {
      const { type, value, category, note } = e;
      if (!type || !category) continue;
      const safeValue = type === "photo" ? "[photo]" : (value || "");
      const result = await pool.query(
        "INSERT INTO entries (user_id, type, value, category, note) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        [req.session.userId, type, safeValue, category, note || ""]
      );
      inserted.push(result.rows[0]);
    }
    res.json(inserted);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await pool.query("DELETE FROM entries WHERE id = $1 AND user_id = $2", [id, req.session.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
