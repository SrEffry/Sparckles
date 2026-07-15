// Singleton de Prisma Client (Prisma 7 con driver adapter para PostgreSQL).
// Evita crear múltiples conexiones en dev por el hot-reload de Next.
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;

function crearCliente() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.__sparklesPrisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__sparklesPrisma = prisma;
}
