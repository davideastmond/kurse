import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("redis", () => ({
  createClient: createClientMock,
}));

import { getRedisClient, getRedisClientConnected } from "./redis-client";

type MockRedisClient = {
  isOpen: boolean;
  connect: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};

function makeClient(overrides: Partial<MockRedisClient> = {}): MockRedisClient {
  return {
    isOpen: false,
    connect: vi.fn(async () => undefined),
    on: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.REDIS_URL;
  globalThis.__kurseRedisClient = undefined;
});

describe("getRedisClient", () => {
  it("throws when REDIS_URL is missing", () => {
    expect(() => getRedisClient()).toThrowError("REDIS_URL is not configured.");
  });

  it("creates and caches a redis client", () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const client = makeClient();
    createClientMock.mockReturnValue(client);

    const result = getRedisClient();

    expect(result).toBe(client);
    expect(createClientMock).toHaveBeenCalledWith({
      url: "redis://localhost:6379",
    });
    expect(client.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(globalThis.__kurseRedisClient).toBe(client);
  });

  it("reuses cached global redis client", () => {
    const existingClient = makeClient();
    globalThis.__kurseRedisClient = existingClient;

    const result = getRedisClient();

    expect(result).toBe(existingClient);
    expect(createClientMock).not.toHaveBeenCalled();
  });
});

describe("getRedisClientConnected", () => {
  it("connects client when it is not open", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const client = makeClient({ isOpen: false });
    createClientMock.mockReturnValue(client);

    const result = await getRedisClientConnected();

    expect(result).toBe(client);
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it("does not reconnect when client is already open", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const client = makeClient({ isOpen: true });
    createClientMock.mockReturnValue(client);

    const result = await getRedisClientConnected();

    expect(result).toBe(client);
    expect(client.connect).not.toHaveBeenCalled();
  });
});
