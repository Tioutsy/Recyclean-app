import { Router } from "express";

const router = Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
  next();
};

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.messages) return res.status(400).json({ error: "Invalid request" });
    body.model = "gpt-4o";
    body.max_tokens = Math.min(body.max_tokens || 300, 500);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Classification failed" });
  }
});

export default router;
