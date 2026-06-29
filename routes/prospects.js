import { Router } from "express";
import pool from "../db.js";
import { sendAdminPush } from "./push.js";

const router = Router();

// ── Edit this list to open/close zones for new prospect registrations ──
const VALID_ZONES = ["zone_a","zone_b","zone_c","zone_d","zone_e"];

function requireAdmin(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: "Non autorisé" });
  if (!req.session?.isAdmin) return res.status(403).json({ error: "Accès refusé" });
  next();
}

// POST /api/prospects — public, no auth required
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, address, zone_id, locality, locality_covered, message } = req.body;
    if (!name || !email || !phone || !address || !zone_id || !locality) {
      return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis." });
    }
    if (!VALID_ZONES.includes(zone_id)) {
      return res.status(400).json({ error: "Cette zone n'est pas encore disponible." });
    }
    const existing = await pool.query(
      "SELECT id FROM prospects WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Une demande avec cet email existe déjà." });
    }
    const result = await pool.query(
      `INSERT INTO prospects (name, email, phone, address, zone_id, locality, locality_covered, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`,
      [name.trim(), email.toLowerCase().trim(), phone.trim(), address.trim(),
       zone_id, (locality||"").trim(), locality_covered !== false, (message || "").trim()]
    );
    // Fire-and-forget push notification to all admins
    const zone = zone_id.replace("zone_", "Zone ").toUpperCase();
    sendAdminPush({
      title: "🌱 Nouvelle demande Recyclean!",
      body: `${name.trim()} · ${(locality||"").trim()||zone} souhaite s'abonner.`,
      tag: "recyclean-prospect",
      url: "/",
    }).catch(() => {});

    res.json({ ok: true, id: result.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/prospects/count — admin only, returns pending prospect count
router.get("/count", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM prospects WHERE status = 'pending'"
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/prospects — admin only, all prospects
router.get("/", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM prospects ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// PATCH /api/prospects/:id — admin only, update status
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending","contacted","approved","rejected"].includes(status)) {
      return res.status(400).json({ error: "Statut invalide." });
    }
    await pool.query(
      "UPDATE prospects SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

export default router;
