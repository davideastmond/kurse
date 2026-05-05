"use server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_CONTENT_TYPE_PREFIXES = ["video/", "image/", "audio/"];

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function joinUrl(baseUrl: string, objectKey: string) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedKey = objectKey.startsWith("/")
    ? objectKey.slice(1)
    : objectKey;

  return `${normalizedBase}/${normalizedKey}`;
}

export async function uploadToS3(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "No valid file provided" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "File exceeds maximum allowed size of 10 MB" };
  }

  const isAllowedType = ALLOWED_CONTENT_TYPE_PREFIXES.some((prefix) =>
    file.type.startsWith(prefix),
  );
  if (!isAllowedType) {
    return { error: "File type not allowed. Only video, image, and audio files are accepted." };
  }

  const endpoint = process.env.CLOUD_FLARE_S3_ENDPOINT;
  const accessKeyId = process.env.CLOUD_FLARE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUD_FLARE_SECRET_ACCESS_KEY;
  const bucketName = process.env.BUCKET_NAME;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
    return { error: "Missing required S3 configuration" };
  }

  const client = new S3Client({
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    region: "auto",
  });

  try {
    const objectKey = `uploads/${Date.now()}-${sanitizeFileName(file.name)}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: file.type || "application/octet-stream",
        ContentLength: fileBuffer.byteLength,
      }),
    );

    // For r2.dev public URLs, the domain is already bucket-scoped.
    const publicBaseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.CLOUD_FLARE_PUBLIC_ACCESS_PROD_URL
        : process.env.CLOUD_FLARE_PUBLIC_ACCESS_DEV_URL;

    if (!publicBaseUrl && !endpoint) {
      return { error: "Missing Cloudflare URL configuration" };
    }

    const url = publicBaseUrl
      ? joinUrl(publicBaseUrl, objectKey)
      : joinUrl(`${endpoint}/${bucketName}`, objectKey);

    return { url };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return { error: "Failed to upload file" };
  }
}
