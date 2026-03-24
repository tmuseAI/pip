const { prisma } = require("../utils/prisma");

async function connectDb() {
  await prisma.$connect();
}

module.exports = { connectDb, prisma };
