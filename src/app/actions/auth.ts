"use server";

import type { SigninActionState } from "@/app/auth/signin/definitions";
import type { SignupActionState } from "@/app/auth/signup/definitions";
import { getRedisClientConnected } from "@/app/utils/redis/redis-client";
import { signIn } from "@/auth/auth";
import {
  getDashboardPathForEmail,
  getDashboardPathForRole,
} from "@/auth/dashboard";
import { hashPassword } from "@/auth/password";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { z } from "zod";

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name."),
    email: z.email("Enter a valid email address.").transform((v) => v.trim()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password is too long."),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

const signinSchema = z.object({
  email: z.email("Enter a valid email address.").transform((v) => v.trim()),
  password: z.string().min(1, "Enter your password."),
});

const SIGNIN_RATE_LIMIT_WINDOW_SECONDS = 5 * 60;
const SIGNIN_RATE_LIMIT_MAX_ATTEMPTS = 8;

async function evaluateSignInRateLimit(normalizedEmail: string) {
  try {
    const redis = await getRedisClientConnected();
    const key = `signin:attempts:${normalizedEmail}`;

    const attempts = await redis.incr(key);

    if (attempts === 1) {
      await redis.expire(key, SIGNIN_RATE_LIMIT_WINDOW_SECONDS);
    }

    if (attempts > SIGNIN_RATE_LIMIT_MAX_ATTEMPTS) {
      const ttl = await redis.ttl(key);

      return {
        allowed: false as const,
        retryAfterSeconds:
          typeof ttl === "number" && ttl > 0
            ? ttl
            : SIGNIN_RATE_LIMIT_WINDOW_SECONDS,
      };
    }

    return { allowed: true as const };
  } catch (error) {
    console.error("Sign-in rate limit check failed, continuing:", error);
    return { allowed: true as const };
  }
}

export async function registerUserAction(
  _previousState: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Fix the highlighted fields and try again.",
      fieldErrors: {
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      },
    };
  }

  const db = getDb();
  if (!db) {
    return {
      status: "error",
      message: "Database is not configured. Set DATABASE_URL and retry.",
    };
  }

  const name = parsed.data.name;
  const normalizedEmail = parsed.data.email.toLowerCase();
  const passwordHash = hashPassword(parsed.data.password);

  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return {
        status: "error",
        message: "Could not create your account right now. Please try again.",
      };
    }

    await db.insert(users).values({
      name,
      email: normalizedEmail,
      passwordHash,
      role: "STUDENT",
    });
  } catch (error) {
    console.error("Signup failed", error);
    return {
      status: "error",
      message: "Could not create your account right now. Please try again.",
    };
  }

  await signIn("credentials", {
    email: normalizedEmail,
    password: parsed.data.password,
    redirectTo: getDashboardPathForRole("STUDENT"),
  });

  return {
    status: "success",
    message: "Your account is ready. Redirecting...",
  };
}

export async function signInUserAction(
  _previousState: SigninActionState,
  formData: FormData,
): Promise<SigninActionState> {
  const parsed = signinSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Fix the highlighted fields and try again.",
      fieldErrors: {
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      },
    };
  }

  try {
    const normalizedEmail = parsed.data.email.toLowerCase();
    const rateLimit = await evaluateSignInRateLimit(normalizedEmail);

    if (!rateLimit.allowed) {
      const retryMessage =
        rateLimit.retryAfterSeconds < 60
          ? `Too many sign-in attempts. Please wait ${rateLimit.retryAfterSeconds}s and try again.`
          : "Too many sign-in attempts. Please wait a few minutes and try again.";

      return {
        status: "error",
        message: retryMessage,
      };
    }

    const redirectTo = await getDashboardPathForEmail(parsed.data.email);

    await signIn("credentials", {
      email: normalizedEmail,
      password: parsed.data.password,
      redirectTo,
    });

    return {
      status: "idle",
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "Invalid email or password.",
        fieldErrors: {
          email: "Check your credentials.",
          password: "Check your credentials.",
        },
      };
    }

    throw error;
  }
}
