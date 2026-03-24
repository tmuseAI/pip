const { prisma } = require("../utils/prisma");

async function requireAuth(req, res, next) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedId = Number(userId);
  if (!Number.isInteger(parsedId)) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: parsedId },
    select: { id: true, username: true },
  });
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.user = user;
  return next();
}

module.exports = requireAuth;
