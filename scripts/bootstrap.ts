import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/security";
const db = new PrismaClient();
async function main() {
 const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
 const password = process.env.ADMIN_PASSWORD;
 if (!email || !password || password.length < 12) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in the environment.");
 if (await db.user.count({ where: { role: "ADMIN" } })) throw new Error("An administrator already exists. Use team management.");
 await db.user.create({ data: { email, name: process.env.ADMIN_NAME || "Administrator", role: "ADMIN", passwordHash: hashPassword(password) } });
 console.log("Administrator created.");
}
main().finally(() => db.$disconnect());
