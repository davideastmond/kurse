import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock, s3ClientMock, putObjectCommandMock } = vi.hoisted(() => ({
  sendMock: vi.fn(async () => ({})),
  s3ClientMock: vi.fn(function S3ClientMock(this: unknown) {
    return { send: sendMock };
  }),
  putObjectCommandMock: vi.fn(function PutObjectCommandMock(
    this: unknown,
    input: unknown,
  ) {
    return { input };
  }),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: s3ClientMock,
  PutObjectCommand: putObjectCommandMock,
}));

const { getSessionSafelyMock } = vi.hoisted(() => ({
  getSessionSafelyMock: vi.fn(),
}));

vi.mock("@/auth/session", () => ({
  getSessionSafely: getSessionSafelyMock,
}));

import { uploadToS3 } from "./s3-uploader";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(1234567890);

  process.env.CLOUD_FLARE_S3_ENDPOINT =
    "https://example.r2.cloudflarestorage.com";
  process.env.CLOUD_FLARE_ACCESS_KEY_ID = "access-key";
  process.env.CLOUD_FLARE_SECRET_ACCESS_KEY = "secret-key";
  process.env.BUCKET_NAME = "kurse";
  process.env.CLOUD_FLARE_PUBLIC_ACCESS_DEV_URL = "https://public.example.com";
  vi.stubEnv("NODE_ENV", "development");
  getSessionSafelyMock.mockResolvedValue({
    user: {
      id: "admin-user-id",
      role: "ADMIN",
    },
  });
});

describe("uploadToS3", () => {
  it("uploads a PNG file for an authorized admin", async () => {
    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const file = new File([pngHeader], "cover.png", {
      type: "image/png",
    });
    const formData = new FormData();

    formData.set("file", file);

    const result = await uploadToS3(formData);

    expect(result).toEqual({
      url: "https://public.example.com/uploads/1234567890-cover.png",
    });
    expect(s3ClientMock).toHaveBeenCalledWith({
      endpoint: process.env.CLOUD_FLARE_S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUD_FLARE_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUD_FLARE_SECRET_ACCESS_KEY,
      },
      region: "auto",
    });
    expect(putObjectCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "kurse",
        Key: expect.stringMatching(/^uploads\/1234567890-cover\.png$/),
        ContentType: "image/png",
      }),
    );
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("rejects upload when the user is not an admin", async () => {
    getSessionSafelyMock.mockResolvedValueOnce({
      user: {
        id: "student-user-id",
        role: "STUDENT",
      },
    });

    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const file = new File([pngHeader], "cover.png", {
      type: "image/png",
    });
    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadToS3(formData);

    expect(result).toEqual({
      error: "You are not authorized to upload files.",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects SVG uploads", async () => {
    const file = new File(["<svg/>"], "icon.svg", {
      type: "image/svg+xml",
    });
    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadToS3(formData);

    expect(result).toEqual({
      error: "SVG uploads are not allowed.",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });
});
