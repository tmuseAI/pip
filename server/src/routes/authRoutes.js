const express = require("express");
const rateLimit = require("express-rate-limit");
const { hashPassword, verifyPassword } = require("../utils/password");
const { prisma } = require("../utils/prisma");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase();
}

function validateCredentials(username, password) {
  if (!username || username.length < 3 || username.length > 32) {
    return "Username must be 3-32 characters.";
  }
  if (!password || password.length < 8 || password.length > 72) {
    return "Password must be 8-72 characters.";
  }
  return null;
}

router.use(authLimiter);

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
}

router.post("/register", async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || "");
  const validationError = validateCredentials(username, password);
  if (validationError) return res.status(400).json({ error: validationError });

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing) {
    return res.status(409).json({ error: "Username already exists." });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username, passwordHash },
    select: { id: true, username: true },
  });
  req.session.userId = String(user.id);
  await saveSession(req);
  return res.status(201).json({ user: { id: String(user.id), username: user.username } });
});

router.post("/login", async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || "");
  const validationError = validateCredentials(username, password);
  if (validationError) return res.status(400).json({ error: validationError });

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  req.session.userId = String(user.id);
  await saveSession(req);
  return res.json({ user: { id: String(user.id), username: user.username } });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("trackstat.sid");
    res.status(204).send();
  });
});

router.get("/me", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsedId = Number(userId);
  if (!Number.isInteger(parsedId)) return res.status(401).json({ error: "Unauthorized" });
  const user = await prisma.user.findUnique({
    where: { id: parsedId },
    select: { id: true, username: true },
  });
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  return res.json({ user: { id: String(user.id), username: user.username } });
});

module.exports = router;
