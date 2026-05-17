import { createClient } from "redis";

type KurseRedisClient = ReturnType<typeof createClient>;

declare global {
  var __kurseRedisClient: KurseRedisClient | undefined;
}

function getRedisUrl() {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error("REDIS_URL is not configured.");
  }

  return url;
}

export function getRedisClient() {
  if (globalThis.__kurseRedisClient) {
    return globalThis.__kurseRedisClient;
  }

  const client = createClient({
    url: getRedisUrl(),
  });

  client.on("error", (error) => {
    console.error("Redis client error:", error);
  });

  globalThis.__kurseRedisClient = client;

  return client;
}

export async function getRedisClientConnected() {
  const client = getRedisClient();

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}
