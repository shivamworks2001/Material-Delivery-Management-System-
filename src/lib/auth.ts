import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { digest } from "./security";
export async function currentUser() {
 const token = (await cookies()).get("sunshine-session")?.value;
 if (!token) return null;
 const session = await db.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } });
 if (!session || session.expiresAt < new Date() || !session.user.active) return null;
 return session.user;
}
export async function requireUser() {
 const user = await currentUser();
 if (!user) redirect("/login");
 return user;
}
export function sameOrigin(request: Request) {
 return !!process.env.APP_ORIGIN && request.headers.get("origin") === process.env.APP_ORIGIN;
}
