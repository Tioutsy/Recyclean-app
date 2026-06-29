import { Router } from "express";
import pool from "../db.js";

const router = Router();

const requireAdmin = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  if (!req.session.isAdmin && adminEmail) return res.status(403).json({ error: "Admin only" });
  next();
};

router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const [users, entries, missed, byCategory, byZone, recentMissed, topUsers] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users"),
      pool.query("SELECT COUNT(*) FROM entries"),
      pool.query("SELECT COUNT(*) FROM missed_collections"),
      pool.query("SELECT category, COUNT(*) as count FROM entries GROUP BY category ORDER BY count DESC"),
      pool.query(`
        SELECT u.zone, COUNT(DISTINCT u.id) as users, COUNT(e.id) as entries
        FROM users u
        LEFT JOIN entries e ON e.user_id = u.id
        WHERE u.zone IS NOT NULL AND u.zone != ''
        GROUP BY u.zone ORDER BY entries DESC
      `),
      pool.query(`
        SELECT mc.date, mc.zone, u.email, u.name
        FROM missed_collections mc
        JOIN users u ON u.id = mc.user_id
        ORDER BY mc.created_at DESC LIMIT 20
      `),
      pool.query(`
        SELECT u.id, u.email, u.name, u.zone, COUNT(e.id) as entry_count, u.created_at
        FROM users u
        LEFT JOIN entries e ON e.user_id = u.id
        GROUP BY u.id ORDER BY entry_count DESC LIMIT 20
      `),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalEntries: parseInt(entries.rows[0].count),
      totalMissed: parseInt(missed.rows[0].count),
      byCategory: byCategory.rows,
      byZone: byZone.rows,
      recentMissed: recentMissed.rows,
      topUsers: topUsers.rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.name, u.zone, u.created_at,
             COUNT(DISTINCT e.id) as entry_count,
             COUNT(DISTINCT mc.id) as missed_count
      FROM users u
      LEFT JOIN entries e ON e.user_id = u.id
      LEFT JOIN missed_collections mc ON mc.user_id = u.id
      GROUP BY u.id ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/missed", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT mc.id, mc.date, mc.zone, mc.created_at, u.email, u.name, u.zone as user_zone
      FROM missed_collections mc
      JOIN users u ON u.id = mc.user_id
      ORDER BY mc.date DESC, mc.created_at DESC
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/entries", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, e.type, e.category, e.note, e.ai_item_name, e.ai_confidence, e.created_at,
             u.email, u.name, u.zone
      FROM entries e
      JOIN users u ON u.id = e.user_id
      ORDER BY e.created_at DESC LIMIT 200
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
