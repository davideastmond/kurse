"use client";
import { useEffect, useMemo, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

const brandStops = [
  { key: "50", className: "bg-brand-50", textClass: "text-slate-900" },
  { key: "100", className: "bg-brand-100", textClass: "text-slate-900" },
  { key: "200", className: "bg-brand-200", textClass: "text-slate-900" },
  { key: "300", className: "bg-brand-300", textClass: "text-slate-900" },
  { key: "400", className: "bg-brand-400", textClass: "text-slate-900" },
  { key: "500", className: "bg-brand-500", textClass: "text-white" },
  { key: "600", className: "bg-brand-600", textClass: "text-white" },
  { key: "700", className: "bg-brand-700", textClass: "text-white" },
  { key: "800", className: "bg-brand-800", textClass: "text-white" },
  { key: "900", className: "bg-brand-900", textClass: "text-white" },
];

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
    return;
  }

  root.setAttribute("data-theme", mode);
}

export default function DesignShowcasePage() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  const themeLabel = useMemo(() => {
    if (themeMode === "system") return "System preference";
    if (themeMode === "light") return "Light mode";
    return "Dark mode";
  }, [themeMode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-32 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-success/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-104 w-104 rounded-full bg-warning/15 blur-3xl" />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 md:px-10 md:py-16">
        <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_20px_80px_rgba(0,0,0,0.09)]">
          <div className="grid gap-8 p-8 md:grid-cols-[1.3fr_0.9fr] md:p-10">
            <div className="space-y-5">
              <p className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                Kurse Design Lab
              </p>
              <h1 className="text-4xl leading-tight font-semibold tracking-tight md:text-6xl">
                Accessible <span className="text-primary">Modern Theme</span>{" "}
                System
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                A showcase of your Tailwind v4 tokens, modern typography, and
                semantic color pairing for learning interfaces.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setThemeMode(mode)}
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                      themeMode === mode
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-surface-foreground hover:bg-muted",
                    ].join(" ")}
                  >
                    {mode[0].toUpperCase() + mode.slice(1)}
                  </button>
                ))}
                <span className="text-sm text-muted-foreground">
                  Preview: {themeLabel}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/50 p-5">
              <h2 className="text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                Typography
              </h2>
              <div className="mt-4 space-y-4">
                <p className="text-3xl leading-none font-semibold">
                  Manrope Heading 32
                </p>
                <p className="text-base leading-7 text-muted-foreground">
                  This paragraph demonstrates readable body rhythm for lesson
                  descriptions, prompts, and dashboard guidance.
                </p>
                <p className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-muted-foreground">
                  JetBrains Mono: const passingScore = 70;
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Primary
            </p>
            <div className="mt-3 rounded-xl bg-primary p-4 text-primary-foreground">
              <p className="font-semibold">Call to Action</p>
              <p className="text-sm opacity-90">
                Buttons, links, active states
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Success
            </p>
            <div className="mt-3 rounded-xl border border-success/30 bg-success/15 p-4 text-foreground">
              <p className="font-semibold">Progress Complete</p>
              <p className="text-sm text-muted-foreground">
                Used for positive outcomes
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-5 md:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Alerts
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-sm">
                Warning token for time-limited evaluations
              </div>
              <div className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm">
                Danger token for failed submissions or destructive actions
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-border bg-surface p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              Brand Scale
            </h2>
            <p className="text-sm text-muted-foreground">
              Use lower values for backgrounds, higher for emphasis.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {brandStops.map((tone) => (
              <div
                key={tone.key}
                className={`${tone.className} ${tone.textClass} rounded-xl border border-black/5 p-4 shadow-sm dark:border-white/10`}
              >
                <p className="text-xs font-semibold tracking-[0.15em] uppercase">
                  Brand {tone.key}
                </p>
                <p className="mt-4 text-sm font-medium">bg-brand-{tone.key}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-surface p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Component Previews
          </h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-5">
              <h3 className="text-sm font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Buttons
              </h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                  Primary Action
                </button>
                <button className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-surface-foreground hover:bg-muted">
                  Secondary
                </button>
                <button className="rounded-full border border-danger/40 bg-danger/15 px-5 py-2.5 text-sm font-semibold text-foreground">
                  Destructive
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5">
              <h3 className="text-sm font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Card
              </h3>
              <article className="mt-4 rounded-xl border border-border bg-surface p-4">
                <p className="text-sm text-muted-foreground">Lesson 4 of 12</p>
                <p className="mt-2 text-lg font-semibold">
                  Accessibility in Interface Design
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Contrast, focus states, and semantic color use aligned with
                  WCAG guidance.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
