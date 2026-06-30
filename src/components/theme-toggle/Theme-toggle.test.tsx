// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import ThemeToggle from "./Theme-toggle";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

describe("ThemeToggle", () => {
  it("loads saved theme and applies it", async () => {
    window.localStorage.setItem("theme", "dark");

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeTruthy();
    expect(screen.getByText("Theme: dark")).toBeTruthy();
  });

  it("toggles theme and persists selection", async () => {
    window.localStorage.setItem("theme", "light");

    render(<ThemeToggle />);

    const button = await screen.findByRole("button", {
      name: "Switch to dark mode",
    });

    fireEvent.click(button);

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem("theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeTruthy();
  });
});
