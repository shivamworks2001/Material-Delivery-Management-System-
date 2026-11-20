import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/auth";
import { digest } from "@/lib/security";
export async function POST(request: NextRequest) {
 if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
 const token = request.cookies.get("sunshine-session")?.value;
 if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } });
 const response = NextResponse.redirect(new URL("/login", process.env.APP_ORIGIN), 303);
 response.cookies.delete("sunshine-session");
 return response;
}
