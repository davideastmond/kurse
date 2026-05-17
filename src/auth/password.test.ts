import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password helpers", () => {
  it("verifies the original password against its hash", () => {
    const rawPassword = "abc123";
    const storedHash = hashPassword(rawPassword);

    expect(verifyPassword(rawPassword, storedHash)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const storedHash = hashPassword("abc123");

    expect(verifyPassword("abc124", storedHash)).toBe(false);
  });

  it("rejects malformed stored hashes", () => {
    expect(verifyPassword("abc123", "invalid-format")).toBe(false);
  });
});
