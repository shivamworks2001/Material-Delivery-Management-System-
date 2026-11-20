import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers, hashPassword, userInput } from "@/lib/security";
export async function POST(request: Request) {
 if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 const actor = await currentUser();
 if (!actor) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
 if (!canManageUsers(actor.role)) return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
 const body = await request.json().catch(() => null);
 const parsed = userInput.safeParse(body);
 if (!parsed.success) return NextResponse.json({ error: "Check all fields. Passwords must contain 12–128 characters." }, { status: 400 });
 const id = typeof body.id === "string" ? body.id : undefined;
 const { password, ...data } = parsed.data;
 if (!id && !password) return NextResponse.json({ error: "Password required" }, { status: 400 });
 if (id === actor.id && (!data.active || data.role !== "ADMIN")) return NextResponse.json({ error: "You cannot deactivate or demote your own account." }, { status: 400 });
 try {
 await db.$transaction(async tx => {
 const user = id ? await tx.user.update({ where: { id }, data: { ...data, ...(password ? { passwordHash: hashPassword(password) } : {}) } }) : await tx.user.create({ data: { ...data, passwordHash: hashPassword(password!) } });
 if (id) await tx.session.deleteMany({ where: { userId: id } });
 await tx.auditLog.create({ data: { actorId: actor.id, targetId: user.id, action: id ? "USER_UPDATED" : "USER_CREATED" } });
 });
 return NextResponse.json({ ok: true });
 } catch { return NextResponse.json({ error: "Unable to save. Check that the email is unique and the user still exists." }, { status: 409 }); }
}
