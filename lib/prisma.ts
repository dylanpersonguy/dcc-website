import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function resolveConnectionString(url: string): string {
  if (url.startsWith("prisma+postgres://")) {
    const match = url.match(/api_key=([A-Za-z0-9+/=_-]+)/);
    if (match) {
      try {
        const decoded = JSON.parse(Buffer.from(match[1], "base64").toString());
        if (decoded.databaseUrl) return decoded.databaseUrl;
      } catch { /* fall through */ }
    }
  }
  return url;
}

function createPrismaClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const connectionString = resolveConnectionString(raw);
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
