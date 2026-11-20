import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Shell } from "@/components/shell";
import { UserManager } from "@/components/user-manager";
export default async function Users() {
 const actor = await requireUser();
 if (actor.role !== "ADMIN") redirect("/");
 const users = await db.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true }, orderBy: { createdAt: "desc" } });
 return <Shell name={actor.name} role={actor.role}><p className="eyebrow">ADMINISTRATION</p><h1>Team & access</h1><p className="muted">Give your team the right access to their work.</p><UserManager users={users}/></Shell>;
}
