import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = db;

export type Block = { id: string; role: string; org: string; period: string; tags: string[]; bullets: string[] };
export async function getProfile() {
  return db.profile.upsert({
    where: { handle: "meron" }, update: {},
    create: { handle: "meron", name: "Your Name", headline: "Technical Project Manager" },
  });
}
