import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { adminEmails } from "@/lib/env";

export type Role = "user" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type AppSession = {
  user: SessionUser;
};

export async function getSession(): Promise<AppSession | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  return {
    user: {
      id: s.user.id,
      email: s.user.email,
      name: s.user.name,
      role: ((s.user as { role?: Role }).role ?? "user") as Role,
    },
  };
}

export async function requireSession(): Promise<AppSession> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

// Both platform admins (Isabelle + Emile) are in this allowlist and are
// auto-promoted to `admin` at signup. This is also the unconditional bypass.
export function isAdminEmail(email: string): boolean {
  return adminEmails.includes(email.toLowerCase());
}

export function effectiveRole(session: AppSession): Role {
  if (isAdminEmail(session.user.email)) return "admin";
  return session.user.role;
}

// Guard for the /admin surface. Non-admins are sent home.
export async function requireAdmin(): Promise<AppSession> {
  const s = await requireSession();
  if (effectiveRole(s) !== "admin") redirect("/");
  return s;
}

// Admin gate for API/route handlers. Returns the session for admins, or a
// 403 Response to return immediately. Usage:
//   const gate = await requireAdminApi();
//   if (gate instanceof Response) return gate;
export async function requireAdminApi(): Promise<AppSession | Response> {
  const s = await requireSession();
  if (effectiveRole(s) !== "admin") {
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  }
  return s;
}
