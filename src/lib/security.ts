import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";
export const roles = ["ADMIN", "OFFICE", "DELIVERY"] as const;
export const userInput = z.object({ name: z.string().trim().min(2).max(100), email: z.email().max(254).transform(v => v.toLowerCase()), role: z.enum(roles), active: z.boolean(), password: z.string().min(12).max(128).optional() });
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function hashPassword(value: string) {
 const salt = randomBytes(16).toString("hex");
 return salt + ":" + scryptSync(value, salt, 64).toString("hex");
}
export function verifyPassword(value: string, encoded: string) {
 const [salt, hash] = encoded.split(":");
 if (!salt || !hash) return false;
 const expected = Buffer.from(hash, "hex");
 const actual = scryptSync(value, salt, 64);
 return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const canManageUsers = (role: string) => role === "ADMIN";
