import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Reuse Prisma client in dev to avoid connection explosion during hot reload.
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: [{ emit: "event", level: "query" }, "error", "warn"],
  });

if (process.env.DEBUG_AUTH === "true") {
  (prisma as any).$on("query", (e: any) => {
    console.log("PRISMA QUERY:", e.query, e.params);
  });
}

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
