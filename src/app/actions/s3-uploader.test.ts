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
});

describe("uploadToS3", () => {
  it("uploads a tiny SVG file", async () => {
    const file = new File(["<svg/>"], "icon.svg", {
      type: "image/svg+xml",
    });
    const formData = new FormData();

    formData.set("file", file);

    const result = await uploadToS3(formData);

    expect(result).toEqual({
      url: "https://public.example.com/uploads/1234567890-icon.svg",
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
        Key: expect.stringMatching(/^uploads\/1234567890-icon\.svg$/),
        ContentType: "image/svg+xml",
      }),
    );
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
