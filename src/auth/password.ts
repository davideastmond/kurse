import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(rawPassword: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(rawPassword, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(rawPassword: string, storedHash: string) {
  const [salt, persistedHash] = storedHash.split(":");
  if (!salt || !persistedHash) {
    return false;
  }

  const expected = Buffer.from(persistedHash, "hex");
  const derived = scryptSync(rawPassword, salt, 64);

  if (expected.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(expected, derived);
}
