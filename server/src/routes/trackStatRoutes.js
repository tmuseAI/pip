const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const { prisma } = require("../utils/prisma");

const router = express.Router();

function sanitizeTrackStatPayload(payload = {}) {
  return {
    name: String(payload.name || "").trim(),
    updatedAtLabel: payload.updatedAtLabel ? String(payload.updatedAtLabel) : "Just now",
    level: Number(payload.level || 0),
    bounty: Number(payload.bounty || 0),
    beli: Number(payload.beli || 0),
    fragments: Number(payload.fragments || 0),
    sea: Number(payload.sea || 1),
    tierCur: Number(payload.tierCur || 0),
    tierMax: Number(payload.tierMax || 10),
    raceTag: payload.raceTag ? String(payload.raceTag) : "Human",
    melees: Array.isArray(payload.melees) ? payload.melees.map(String) : [],
    awakenedKeys: Array.isArray(payload.awakenedKeys) ? payload.awakenedKeys.map(String) : [],
    equippedFruit: payload.equippedFruit ? String(payload.equippedFruit) : "None",
    equippedMastery: Number(payload.equippedMastery || 0),
    legendaryTags: Array.isArray(payload.legendaryTags) ? payload.legendaryTags.map(String) : [],
    mythicalTags: Array.isArray(payload.mythicalTags) ? payload.mythicalTags.map(String) : [],
    pulled: payload.pulled ? String(payload.pulled) : "Not Pulled",
    specialItems: Array.isArray(payload.specialItems) ? payload.specialItems.map(String) : [],
    online: Boolean(payload.online),
  };
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  const rows = await prisma.trackStat.findMany({
    where: { ownerId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  const data = rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    updatedAt: r.updatedAtLabel,
    level: r.level,
    bounty: Number(r.bounty),
    beli: Number(r.beli),
    fragments: r.fragments,
    sea: r.sea,
    tierCur: r.tierCur,
    tierMax: r.tierMax,
    raceTag: r.raceTag,
    melees: r.melees || [],
    awakenedKeys: r.awakenedKeys || [],
    equippedFruit: r.equippedFruit,
    equippedMastery: r.equippedMastery,
    legendaryTags: r.legendaryTags || [],
    mythicalTags: r.mythicalTags || [],
    pulled: r.pulled,
    specialItems: r.specialItems || [],
    online: !!r.online,
  }));
  return res.json({ data });
});

router.post("/", async (req, res) => {
  const payload = sanitizeTrackStatPayload(req.body);
  if (!payload.name) return res.status(400).json({ error: "Name is required." });

  const created = await prisma.trackStat.create({
    data: {
      ownerId: req.user.id,
      ...payload,
    },
    select: { id: true },
  });
  return res.status(201).json({ id: String(created.id) });
});

router.put("/:id", async (req, res) => {
  const payload = sanitizeTrackStatPayload(req.body);
  if (!payload.name) return res.status(400).json({ error: "Name is required." });
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

  const existing = await prisma.trackStat.findFirst({
    where: { id, ownerId: req.user.id },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Not found." });

  await prisma.trackStat.update({
    where: { id },
    data: payload,
  });
  return res.json({ ok: true });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  const existing = await prisma.trackStat.findFirst({
    where: { id, ownerId: req.user.id },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Not found." });
  await prisma.trackStat.delete({ where: { id } });
  return res.status(204).send();
});

module.exports = router;
