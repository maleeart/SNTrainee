import { auth } from "./auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

export function isProfileComplete(user: { name?: string | null; role: string; level?: string | null; school?: string | null }): boolean {
  if (!user.name?.trim()) return false;
  if (user.role === "STUDENT") return !!(user.level && user.school?.trim());
  return true;
}

export function homeFor(role: Role): string {
  switch (role) {
    case "ADMIN":
    case "EXECUTIVE":
      return "/admin";
    case "MENTOR":
      return "/mentor";
    default:
      return "/dashboard";
  }
}

/** Require a logged-in session; optionally restrict to given roles. */
export async function requireUser(roles?: Role[]) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (roles && !roles.includes(session.user.role)) redirect(homeFor(session.user.role));
  return session.user;
}
