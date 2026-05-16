import { getRedisClientConnected } from "@/app/utils/redis/redis-client";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      status: "error",
      message: "Request not allowed.",
    },
    { status: 403 },
  );
  let payload: JsonObject;

  try {
    const body = (await req.json()) as unknown;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Request body must be a JSON object.",
        },
        { status: 400 },
      );
    }

    payload = body as JsonObject;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid JSON body.",
      },
      { status: 400 },
    );
  }

  const key = `redis:test:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const ttlSeconds = 300;

  try {
    const redis = await getRedisClientConnected();

    await redis.set(key, JSON.stringify(payload), {
      EX: ttlSeconds,
    });

    const storedRaw = await redis.get(key);

    if (!storedRaw) {
      return NextResponse.json(
        {
          ok: false,
          message: "Write succeeded but read-back failed.",
        },
        { status: 500 },
      );
    }

    const storedValue = JSON.parse(storedRaw as string) as JsonObject;

    return NextResponse.json(
      {
        ok: true,
        key,
        ttlSeconds,
        storedValue,
      },
      { status: 200 },
    );
  } catch (error) {
    let message = "Unexpected error while testing Redis.";
    if (error instanceof Error) {
      message = (error as Error).message;
    }

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}
