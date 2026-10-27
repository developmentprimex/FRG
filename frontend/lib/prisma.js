import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
const cachedPrisma = globalForPrisma.prisma;
// Hot reload can retain an instance created before new models were generated.
const hasCurrentModels = cachedPrisma && Object.values(Prisma.ModelName).every(
  (name) => cachedPrisma[name[0].toLowerCase() + name.slice(1)] !== undefined,
);

if (cachedPrisma && !hasCurrentModels) {
  void cachedPrisma.$disconnect().catch(() => {});
}

export const prisma =
  (hasCurrentModels && cachedPrisma) ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
