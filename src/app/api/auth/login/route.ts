import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/auth";
import { digest, hashPassword, verifyPassword } from "@/lib/security";
const dummy = hashPassword(randomBytes(32).toString("hex"));
export async function POST(request: Request) {
 if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
 const origin = process.env.APP_ORIGIN!;
 const form = await request.formData();
 const email = String(form.get("email") ?? "").trim().toLowerCase();
 const password = String(form.get("password") ?? "");
 const failure = () => NextResponse.redirect(new URL("/login?error=1", origin), 303);
 if (!email || email.length > 254 || !password || password.length > 128) return failure();
 const key = digest(email);
 const now = new Date();
 await db.loginAttempt.deleteMany({ where: { key, resetAt: { lt: now } } });
 const attempt = await db.loginAttempt.upsert({ where: { key }, create: { key, attempts: 1, resetAt: new Date(Date.now() + 900000) }, update: { attempts: { increment: 1 } } });
 if (attempt.attempts > 10) return failure();
 const user = await db.user.findUnique({ where: { email } });
 const valid = verifyPassword(password, user?.passwordHash ?? dummy);
 if (!user?.active || !valid) return failure();
 const token = randomBytes(32).toString("hex");
 const expires = new Date(Date.now() + 8 * 3600000);
 await db.$transaction([
 db.session.create({ data: { tokenHash: digest(token), userId: user.id, expiresAt: expires } }),
 db.auditLog.create({ data: { actorId: user.id, action: "LOGIN", targetId: user.id } }),
 ]);
 const response = NextResponse.redirect(new URL("/", origin), 303);
 response.cookies.set("sunshine-session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires });
 return response;
}
