import { Router } from "express";
import webpush from "web-push";
import pool from "../db.js";

const router = Router();

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_CONTACT = `mailto:${process.env.ADMIN_EMAIL || "admin@recyclean.mu"}`;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);
} else {
  console.warn("VAPID keys not configured — push notifications disabled");
}

function requireAdmin(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: "Non autorisé" });
  if (!req.session?.isAdmin) return res.status(403).json({ error: "Accès refusé" });
  next();
}

// GET /api/push/vapid-public-key — public, needed by browser to subscribe
router.get("/vapid-public-key", (req, res) => {
  if (!VAPID_PUBLIC) return res.status(503).json({ error: "Push non configuré" });
  res.json({ key: VAPID_PUBLIC });
});

// POST /api/push/subscribe — admin only
router.post("/subscribe", requireAdmin, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: "Subscription invalide" });
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, subscription)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET subscription = EXCLUDED.subscription`,
      [req.session.userId, subscription.endpoint, JSON.stringify(subscription)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/push/unsubscribe — admin only
router.post("/unsubscribe", requireAdmin, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await pool.query(
      "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2",
      [req.session.userId, endpoint]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Shared helper — call from other routes to push to all admins ──────────
export async function sendAdminPush(payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    const { rows } = await pool.query(
      `SELECT ps.endpoint, ps.subscription
       FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE u.is_admin = TRUE`
    );
    const message = typeof payload === "string" ? payload : JSON.stringify(payload);
    for (const row of rows) {
      try {
        await webpush.sendNotification(JSON.parse(row.subscription), message);
      } catch (e) {
        // 404/410 = subscription expired → remove it
        if (e.statusCode === 404 || e.statusCode === 410) {
          await pool.query(
            "DELETE FROM push_subscriptions WHERE endpoint = $1",
            [row.endpoint]
          ).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error("sendAdminPush error:", e.message);
  }
}

export default router;
