import { drizzle } from "drizzle-orm/neon-http";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!dbInstance) {
    dbInstance = drizzle(process.env.DATABASE_URL);
  }

  return dbInstance;
}
