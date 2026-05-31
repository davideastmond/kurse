import { verifyPassword } from "@/auth/password";
import { getDb } from "@/db";
import { organizationMemberships, organizations, users } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1),
});

const authSecret = process.env.NEXT_AUTH_SECRET;

if (!authSecret) {
  throw new Error(
    "NEXT_AUTH_SECRET environment variable is not set. Please set it to a secure random string.",
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const db = getDb();
        if (!db) {
          return null;
        }

        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            passwordHash: users.passwordHash,
          })
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .limit(1);

        if (!user) {
          return null;
        }

        const isValidPassword = verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );
        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token }) {
      if (!token?.email) {
        return token;
      }

      const db = getDb();
      if (!db) {
        return token;
      }

      let nextToken = token;

      // Only query role/id once, then persist in JWT.
      if (!nextToken.role || !nextToken.id) {
        const [userInDb] = await db
          .select({
            id: users.id,
            role: users.role,
          })
          .from(users)
          .where(eq(users.email, nextToken.email))
          .limit(1);

        if (userInDb) {
          nextToken = {
            ...nextToken,
            id: userInDb.id,
            role: userInDb.role,
          };
        }
      }

      if (!nextToken.id) {
        return nextToken;
      }

      if (
        typeof nextToken.currentOrganizationId === "undefined" ||
        typeof nextToken.currentOrganizationRole === "undefined"
      ) {
        const [activeMembership] = await db
          .select({
            organizationId: organizationMemberships.organizationId,
            role: organizationMemberships.role,
          })
          .from(organizationMemberships)
          .innerJoin(
            organizations,
            eq(organizationMemberships.organizationId, organizations.id),
          )
          .where(
            and(
              eq(organizationMemberships.userId, nextToken.id),
              eq(organizationMemberships.state, "ACTIVE"),
              eq(organizations.status, "ACTIVE"),
            ),
          )
          .orderBy(asc(organizationMemberships.createdAt))
          .limit(1);

        nextToken = {
          ...nextToken,
          currentOrganizationId: activeMembership?.organizationId ?? null,
          currentOrganizationRole: activeMembership?.role ?? null,
        };
      }

      return nextToken;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          id: token.id,
          email: token.email,
          role: token.role,
          name: token.name,
          currentOrganizationId: token.currentOrganizationId ?? null,
          currentOrganizationRole: token.currentOrganizationRole ?? null,
        },
      } as typeof session;
    },
  },
});

type OrganizationMembershipRow = {
  organizationId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  state: "ACTIVE" | "REVOKED";
};

export async function getOrganizationMembershipForUser(input: {
  organizationId: string;
  userId: string;
}): Promise<OrganizationMembershipRow | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [membership] = await db
    .select({
      organizationId: organizationMemberships.organizationId,
      role: organizationMemberships.role,
      state: organizationMemberships.state,
    })
    .from(organizationMemberships)
    .innerJoin(
      organizations,
      eq(organizationMemberships.organizationId, organizations.id),
    )
    .where(
      and(
        eq(organizationMemberships.organizationId, input.organizationId),
        eq(organizationMemberships.userId, input.userId),
        eq(organizations.status, "ACTIVE"),
      ),
    )
    .limit(1);

  return membership ?? null;
}

export async function requireOrganizationAdminOrOwner(input: {
  organizationId: string;
  userId: string;
}): Promise<
  { ok: true; role: "OWNER" | "ADMIN" } | { ok: false; message: string }
> {
  const membership = await getOrganizationMembershipForUser(input);

  if (!membership || membership.state !== "ACTIVE") {
    return {
      ok: false,
      message: "You are not a member of this organization.",
    };
  }

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    return {
      ok: false,
      message: "You need admin access for this organization.",
    };
  }

  return {
    ok: true,
    role: membership.role,
  };
}
