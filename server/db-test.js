const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function test() {
  try {
    const users = await prisma.user.findMany();
    console.log(users);
  } catch (e) {
    console.error("DB TEST ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
