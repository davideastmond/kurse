"use client";

import { registerUserAction } from "@/app/actions/auth";
import {
  initialSignupActionState,
  type SignupActionState,
} from "@/app/auth/signup/definitions";
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

function Alert({ state }: { state: SignupActionState }) {
  if (!state.message) return null;

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-success/40 bg-success/15 px-4 py-3 text-sm text-foreground">
        {state.message}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-danger/40 bg-danger/15 px-4 py-3 text-sm text-foreground">
        {state.message}
      </div>
    );
  }

  return null;
}

export function SignupForm() {
  const [state, action, isPending] = useActionState(
    registerUserAction,
    initialSignupActionState,
  );

  return (
    <form action={action} className="space-y-5" noValidate>
      <Alert state={state} />

      <div>
        <label htmlFor="name" className="text-sm font-semibold">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          className={getInputClasses(Boolean(state.fieldErrors?.name))}
          aria-invalid={Boolean(state.fieldErrors?.name)}
          aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
          required
        />
        {state.fieldErrors?.name ? (
          <p id="name-error" className="mt-1.5 text-sm text-danger">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>

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
            state.fieldErrors?.email ? "email-error" : undefined
          }
          required
        />
        {state.fieldErrors?.email ? (
          <p id="email-error" className="mt-1.5 text-sm text-danger">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="text-sm font-semibold">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            className={getInputClasses(Boolean(state.fieldErrors?.password))}
            aria-invalid={Boolean(state.fieldErrors?.password)}
            aria-describedby={
              state.fieldErrors?.password ? "password-error" : undefined
            }
            required
          />
          {state.fieldErrors?.password ? (
            <p id="password-error" className="mt-1.5 text-sm text-danger">
              {state.fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-semibold">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            className={getInputClasses(
              Boolean(state.fieldErrors?.confirmPassword),
            )}
            aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
            aria-describedby={
              state.fieldErrors?.confirmPassword
                ? "confirm-password-error"
                : undefined
            }
            required
          />
          {state.fieldErrors?.confirmPassword ? (
            <p
              id="confirm-password-error"
              className="mt-1.5 text-sm text-danger"
            >
              {state.fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          className="font-semibold text-primary hover:underline"
          href="/auth/signin"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
