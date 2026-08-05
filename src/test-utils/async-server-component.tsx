/**
 * Shared test utilities for async Next.js server components.
 *
 * USAGE IN TEST FILES
 * -------------------
 * Each test file still needs its own top-level vi.mock() calls (Vitest hoists
 * them). Use the exported factories as the second argument so the
 * implementations stay in one place:
 *
 *   import {
 *     nextLinkFactory,
 *     nextNavigationFactory,
 *     renderServerComponent,
 *     setupAfterEach,
 *   } from "@/test-utils/async-server-component";
 *
 *   vi.mock("next/link", nextLinkFactory);
 *   vi.mock("next/navigation", nextNavigationFactory);
 *
 *   setupAfterEach();
 *
 *   // Render an async server component:
 *   const { screen } = await renderServerComponent(<MyPage />);
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock factories — pass these as the second arg to vi.mock()
// ---------------------------------------------------------------------------

/** Replaces next/link <Link> with a plain <a> element. */
export function nextLinkFactory() {
  return {
    default: ({
      children,
      href,
      ...props
    }: {
      children: React.ReactNode;
      href: string;
      [key: string]: unknown;
    }) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  };
}

/** Stubs next/navigation's redirect and useRouter. */
export function nextNavigationFactory() {
  return {
    redirect: vi.fn(),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    })),
    usePathname: vi.fn(() => "/"),
    useSearchParams: vi.fn(() => new URLSearchParams()),
  };
}

// ---------------------------------------------------------------------------
// afterEach helper
// ---------------------------------------------------------------------------

/**
 * Registers an afterEach that calls cleanup() and vi.clearAllMocks().
 * Call this once at the top level of your test file.
 */
export function setupAfterEach() {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

/**
 * Awaits an async server component JSX element and renders it with
 * @testing-library/react. Returns the same object as render().
 *
 * @example
 *   const result = await renderServerComponent(Page({ searchParams }));
 */
export async function renderServerComponent(
  componentPromise: Promise<React.ReactElement> | React.ReactElement,
) {
  const resolved = await componentPromise;
  return render(resolved);
}
