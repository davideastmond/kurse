"use client";

import { signInUserAction } from "@/app/actions/auth";
import {
  initialSigninActionState,
  type SigninActionState,
} from "@/app/auth/signin/definitions";
import Link from "next/link";
import { useActionState } from "react";

function getInputClasses(hasError?: boolean) {
  return [
    "mt-2 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
    hasError ? "border-danger/60" : "border-border",
  ].join(" ");
}

function Alert({ state }: { state: SigninActionState }) {
  if (state.status !== "error" || !state.message) {
    return null;
  }

  return (
    <div className="rounded-xl border border-danger/40 bg-danger/15 px-4 py-3 text-sm text-foreground">
      {state.message}
    </div>
  );
}

export function SigninForm() {
  const [state, action, isPending] = useActionState(
    signInUserAction,
    initialSigninActionState,
  );

  return (
    <form action={action} className="space-y-5" noValidate>
      <Alert state={state} />

      <div>
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className={getInputClasses(Boolean(state.fieldErrors?.email))}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={
            state.fieldErrors?.email ? "signin-email-error" : undefined
          }
          required
        />
        {state.fieldErrors?.email ? (
          <p id="signin-email-error" className="mt-1.5 text-sm text-danger">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-semibold">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className={getInputClasses(Boolean(state.fieldErrors?.password))}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={
            state.fieldErrors?.password ? "signin-password-error" : undefined
          }
          required
        />
        {state.fieldErrors?.password ? (
          <p id="signin-password-error" className="mt-1.5 text-sm text-danger">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link
          className="font-semibold text-primary hover:underline"
          href="/auth/signup"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
