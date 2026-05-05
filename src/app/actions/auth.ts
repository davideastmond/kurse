"use server";

import type { SigninActionState } from "@/app/auth/signin/definitions";
import type { SignupActionState } from "@/app/auth/signup/definitions";
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
        message: "An account with that email already exists.",
        fieldErrors: {
          email: "Use a different email or sign in.",
        },
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
    const redirectTo = await getDashboardPathForEmail(parsed.data.email);

    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
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
