import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxy route for Cloudflare R2 media assets.
 *
 * Usage: /api/media-proxy?url=<encoded-r2-url>
 *
 * Streams the upstream response back to the browser from the same origin,
 * which eliminates OpaqueResponseBlocking for cross-origin media.
 * Range requests are forwarded so video seeking works correctly.
 */

function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  const prod = process.env.CLOUD_FLARE_PUBLIC_ACCESS_PROD_URL;
  const dev = process.env.CLOUD_FLARE_PUBLIC_ACCESS_DEV_URL;
  const endpoint = process.env.CLOUD_FLARE_S3_ENDPOINT;
  if (prod) origins.push(prod);
  if (dev) origins.push(dev);
  if (endpoint) origins.push(endpoint);
  return origins;
}

function isAllowedUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  // Only allow https (never redirect to http origins)
  if (parsed.protocol !== "https:") return false;

  const allowed = getAllowedOrigins();
  return allowed.some((origin) => {
    try {
      const base = new URL(origin);
      return parsed.hostname === base.hostname;
    } catch {
      return false;
    }
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  if (!isAllowedUrl(rawUrl)) {
    return new NextResponse("URL not allowed", { status: 403 });
  }

  // Forward Range header so video scrubbing / partial content works.
  const upstreamHeaders: HeadersInit = {};
  const range = req.headers.get("range");
  if (range) {
    upstreamHeaders["range"] = range;
  }

  let upstream: Response;
  try {
    upstream = await fetch(rawUrl, { headers: upstreamHeaders });
  } catch {
    return new NextResponse("Failed to fetch upstream resource", {
      status: 502,
    });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse("Upstream error", { status: upstream.status });
  }

  const responseHeaders = new Headers();
  const passthroughHeaders = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "last-modified",
    "etag",
  ];
  for (const header of passthroughHeaders) {
    const value = upstream.headers.get(header);
    if (value) responseHeaders.set(header, value);
  }
  // Allow the browser to cache proxied assets for 1 hour.
  responseHeaders.set("cache-control", "public, max-age=3600");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
