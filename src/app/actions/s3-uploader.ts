"use server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

  const client = new S3Client({
    endpoint: process.env.CLOUD_FLARE_S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUD_FLARE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUD_FLARE_SECRET_ACCESS_KEY!,
    },
    region: "auto",
  });

  try {
    const objectKey = `uploads/${Date.now()}-${sanitizeFileName(file.name)}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await client.send(
      new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME!,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: file.type || "application/octet-stream",
        ContentLength: fileBuffer.byteLength,
      }),
    );

    // For r2.dev public URLs, the domain is already bucket-scoped.
    const publicBaseUrl = process.env.CLOUD_FLARE_PUBLIC_ACCESS_DEV_URL;
    const s3Endpoint = process.env.CLOUD_FLARE_S3_ENDPOINT;

    if (!publicBaseUrl && !s3Endpoint) {
      return { error: "Missing Cloudflare URL configuration" };
    }

    const url = publicBaseUrl
      ? joinUrl(publicBaseUrl, objectKey)
      : joinUrl(`${s3Endpoint}/${process.env.BUCKET_NAME!}`, objectKey);

    return { url };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return { error: "Failed to upload file" };
  }
}
