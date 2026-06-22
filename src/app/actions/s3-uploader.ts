"use server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const SVG_MIME_TYPE = "image/svg+xml";
const SVG_HEADER_SCAN_BYTES = 4096;

const ALLOWED_CONTENT_TYPE_PREFIXES = ["video/", "image/", "audio/"];

// Magic byte signatures for allowed media types (checked at byte offset 0).
// MP4/MOV/M4A/M4V are handled separately via the "ftyp" box at offset 4.
const MAGIC_SIGNATURES: readonly number[][] = [
  [0xff, 0xd8, 0xff], // JPEG
  [0x89, 0x50, 0x4e, 0x47], // PNG
  [0x47, 0x49, 0x46, 0x38], // GIF87a / GIF89a
  [0x49, 0x44, 0x33], // MP3 (ID3 tag)
  [0xff, 0xfb],
  [0xff, 0xf3],
  [0xff, 0xf2], // MP3 sync word variants
  [0xff, 0xf1],
  [0xff, 0xf9], // AAC ADTS
  [0x4f, 0x67, 0x67, 0x53], // OGG (audio / OGV video)
  [0x66, 0x4c, 0x61, 0x43], // FLAC
  [0x1a, 0x45, 0xdf, 0xa3], // WebM / MKV
  [0x52, 0x49, 0x46, 0x46], // RIFF container (WAV, AVI, WebP)
];

/**
 * Validates that the first 12 bytes of a file match a known media type
 * signature. Most signatures are checked at offset 0; MP4/MOV/M4A/M4V are
 * identified by the "ftyp" atom at offset 4.
 *
 * @param header - At least 12 bytes read from the start of the file.
 * @returns `true` when the header matches a recognised media format.
 */
function hasAllowedMagicBytes(header: Uint8Array): boolean {
  for (const sig of MAGIC_SIGNATURES) {
    if (sig.every((byte, i) => header[i] === byte)) return true;
  }
  // MP4 / MOV / M4A / M4V: "ftyp" box starts at byte offset 4
  if (header.length >= 8) {
    const ftyp = [0x66, 0x74, 0x79, 0x70]; // "ftyp"
    if (ftyp.every((byte, i) => header[4 + i] === byte)) return true;
  }
  return false;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isSvgFile(file: File) {
  return (
    file.type === SVG_MIME_TYPE || file.name.toLowerCase().endsWith(".svg")
  );
}

function hasValidSvgMarkup(headerText: string) {
  return /<svg\b/i.test(headerText);
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
    return {
      error:
        "File type not allowed. Only video, image, SVG, and audio files are accepted.",
    };
  }

  if (isSvgFile(file)) {
    const svgHeader = new TextDecoder().decode(
      await file.slice(0, SVG_HEADER_SCAN_BYTES).arrayBuffer(),
    );

    if (!hasValidSvgMarkup(svgHeader)) {
      return { error: "File content does not match a valid SVG image." };
    }
  } else {
    // Read just the first 12 bytes to validate magic bytes before touching S3.
    if (file.size < 12) {
      return { error: "File must be at least 12 bytes to validate format." };
    }
    const headerBuffer = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!hasAllowedMagicBytes(headerBuffer)) {
      return {
        error:
          "File content does not match allowed media types (video, image, or audio).",
      };
    }
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
