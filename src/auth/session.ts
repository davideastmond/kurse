import { auth } from "@/auth/auth";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
] as const;

const DECRYPTION_ERROR_MARKERS = [
  "jwtsessionerror",
  "no matching decryption secret",
  "jwedecryptionfailed",
  "jweinvalid",
] as const;

async function clearSessionCookies() {
  try {
    const cookieStore = await cookies();

    for (const name of SESSION_COOKIE_NAMES) {
      cookieStore.delete(name);
    }
  } catch {
    // Ignore cookie mutation failures in read-only rendering contexts.
  }
}

function collectErrorText(error: unknown): string {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return [
      error.name,
      error.message,
      collectErrorText((error as Error & { cause?: unknown }).cause),
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    return [
      collectErrorText(record.message),
      collectErrorText(record.type),
      collectErrorText(record.code),
      collectErrorText(record.name),
      collectErrorText(record.cause),
    ]
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function isSessionDecryptError(error: unknown) {
  const combined = collectErrorText(error).toLowerCase();
  return DECRYPTION_ERROR_MARKERS.some((marker) => combined.includes(marker));
}

export async function getSessionSafely() {
  try {
    return await auth();
  } catch (error) {
    if (isSessionDecryptError(error)) {
      await clearSessionCookies();
      return null;
    }

    throw error;
  }
}
