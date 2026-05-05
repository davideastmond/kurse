import { verifyPassword } from "@/auth/password";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
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

      // Only query the DB on initial sign-in when role/id are not yet in the token.
      if (token.role && token.id) {
        return token;
      }

      const db = getDb();
      if (!db) {
        return token;
      }

      const [userInDb] = await db
        .select()
        .from(users)
        .where(eq(users.email, token.email))
        .limit(1);

      if (!userInDb) {
        return token;
      }

      return {
        ...token,
        id: userInDb.id,
        role: userInDb.role,
      };
    },
    async session({ session, token }) {
      session = {
        ...session,
        user: {
          id: token.id,
          email: token.email,
          role: token.role,
          name: token.name,
        },
      } as any;
      return session;
    },
  },
});
