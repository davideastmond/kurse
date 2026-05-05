import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export function getDashboardPathForRole(role: string | null | undefined) {
  return role === "ADMIN" ? "/admin/dashboard" : "/user/dashboard";
}

export async function getDashboardPathForEmail(
  email: string | null | undefined,
) {
  if (!email) {
    return getDashboardPathForRole(undefined);
  }

  const db = getDb();
  if (!db) {
    return getDashboardPathForRole(undefined);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return getDashboardPathForRole(user?.role);
}
