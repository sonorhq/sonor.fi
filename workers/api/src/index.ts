import receiverCsp from "./receiver-csp.json";
import { MAX_STALE_AGE_MS, RETRY_AFTER_FAILURE_MS, type ApiState } from "./state";

export { ApiState } from "./state";

declare global {
  namespace Cloudflare {
    interface Env {
      RELEASE_CHECKS: AnalyticsEngineDataset;
      UPSTREAM_CHECKS: AnalyticsEngineDataset;
      ASSETS: Fetcher;
      API_STATE: DurableObjectNamespace<ApiState>;
      // Optional fine-grained token with read-only access to public repositories, set with `wrangler secret put`.
      GITHUB_TOKEN?: string;
      // Where iOS users get the build (wrangler.jsonc vars); the answer's html_url.
      IOS_STORE_URL: string;
      // Bearer token for PUT /v1/ios/latest, set with `wrangler secret put`. Without it, nothing can be published.
      IOS_PUBLISH_TOKEN?: string;
    }
  }
}

const MAX_VALUE_LENGTH = 40;
const READ_METHODS = ["GET", "HEAD"];
const ALLOW = "GET, HEAD";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers":
    "X-Sonor-Version, X-Sonor-Commit, X-Sonor-OS, X-Sonor-Arch, X-Sonor-Platform, X-Sonor-Lang, X-Sonor-Expires",
};
// The release endpoint answers iOS differently, so every answer on it depends on X-Sonor-Platform.
const VARY = { Vary: "X-Sonor-Platform" };
// The channel iOS builds are published to now; appstore can follow under its own key.
const IOS_CHANNEL = "testflight";
// A publish is a small JSON object; anything larger is refused before it is read in full.
const MAX_PUBLISH_BYTES = 1024;
// Store links the iOS answer may carry. Anything else (the REPLACE_ME placeholder included) means no build is announced.
const STORE_URL = /^https:\/\/(testflight\.apple\.com\/join\/|apps\.apple\.com\/)\S+$/;

const text = (body: string | null, status: number, headers: HeadersInit = {}) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", ...headers } });

// Drops anything outside the charset, so a crafted value can't pollute the dataset.
// `missing` is what an empty value records: "" means "not sent" for the language and expiry fields.
const clean = (value: string | null, missing = "unknown") =>
  (value ?? "").replace(/[^A-Za-z0-9._:+-]/g, "").slice(0, MAX_VALUE_LENGTH) || missing;

const field = (request: Request, name: string, missing = "") =>
  clean(request.headers.get(`X-Sonor-${name}`), missing);

// Only release builds count: dev names and hand-made versions like 0.0.0-test aren't checks by a real app.
const RELEASE_VERSION = /^\d+\.\d+\.\d+(-beta\.\d+)?$/;

// Recording must never fail the release check, so errors are dropped on purpose.
const record = async (request: Request, env: Cloudflare.Env) => {
  // A real app check always sends a release version, os, arch and platform; anything else (crawlers, curl) isn't counted.
  const version = field(request, "Version");
  const os = field(request, "OS");
  const arch = field(request, "Arch");
  const platform = field(request, "Platform");
  if (!RELEASE_VERSION.test(version) || !os || !arch || !platform) return;
  try {
    const hash = await env.API_STATE.getByName("api").identify(request.headers.get("CF-Connecting-IP") ?? "");
    env.RELEASE_CHECKS.writeDataPoint({
      indexes: [hash],
      blobs: [
        version,
        field(request, "Commit", "unknown"),
        os,
        arch,
        platform,
        field(request, "Lang", ""),
        field(request, "Expires", ""),
      ],
      doubles: [1],
    });
  } catch {}
};

// iOS builds update through TestFlight, so iOS gets the latest announced build in the release's JSON shape, never GitHub's release.
const iosLatestRelease = async (request: Request, env: Cloudflare.Env): Promise<Response> => {
  const build = await env.API_STATE.getByName("api").iosBuild(IOS_CHANNEL);
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", ...VARY };
  // No usable store link means no answer either: the placeholder must never reach the apps.
  const storeUrl = env.IOS_STORE_URL;
  if (!build || !storeUrl || storeUrl.includes("REPLACE_ME") || !STORE_URL.test(storeUrl)) {
    return new Response(request.method === "HEAD" ? null : JSON.stringify({ error: "no iOS build" }), { status: 404, headers });
  }
  const body = JSON.stringify({
    tag_name: `v${build.version}`,
    name: `Sonor ${build.version}`,
    html_url: storeUrl,
    published_at: build.published_at,
    assets: [],
  });
  return new Response(request.method === "HEAD" ? null : body, { headers });
};

const latestRelease = async (request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...CORS_HEADERS, Allow: ALLOW, ...VARY } });
  }
  if (!READ_METHODS.includes(request.method)) return text("Method not allowed", 405, { Allow: ALLOW, ...VARY });

  // HEAD answers like GET but isn't a check, so it isn't recorded.
  // Recording runs after the response, so the check never waits on the Durable Object.
  if (request.method === "GET") ctx.waitUntil(record(request, env));
  if (field(request, "Platform") === "ios") return iosLatestRelease(request, env);
  const release = await env.API_STATE.getByName("api").latest();
  if (release === null) return text("Release unavailable", 502, VARY);
  // Counted from GitHub's last good answer, so a copy kept through an outage shows its real age.
  const age = Date.now() - release.fetchedAt;
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "X-Sonor-Release-Age": String(Math.floor(age / 1000)),
    ...VARY,
  };
  // Too old to serve: a 503 sends the app to GitHub directly, which is where a stale copy gets corrected.
  if (age > MAX_STALE_AGE_MS) {
    const body = JSON.stringify({ error: "Release too old to serve" });
    return new Response(request.method === "HEAD" ? null : body, {
      status: 503,
      headers: { ...headers, "Retry-After": String(Math.ceil(RETRY_AFTER_FAILURE_MS / 1000)) },
    });
  }
  return new Response(request.method === "HEAD" ? null : release.body, { headers });
};

// Compares SHA-256 digests, so both sides are the same length and the length never shows in the timing.
const digest = (value: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));

// A missing secret refuses every token, so an unset IOS_PUBLISH_TOKEN can't be guessed as "".
const tokenMatches = async (request: Request, expected: string | undefined): Promise<boolean> => {
  if (!expected) return false;
  const given = /^Bearer (.+)$/.exec(request.headers.get("Authorization") ?? "")?.[1] ?? "";
  return crypto.subtle.timingSafeEqual(await digest(given), await digest(expected));
};

// Reads a body of at most `limit` bytes, or returns null when it is larger. The declared length is checked first,
// then the bytes actually read, since a sender can lie about the length or send it chunked.
const readCapped = async (request: Request, limit: number): Promise<string | null> => {
  const declared = request.headers.get("Content-Length");
  if (declared !== null && Number(declared) > limit) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};

// Like RELEASE_VERSION, but without leading zeros in any number, so one build has one spelling.
const PUBLISH_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-beta\.(0|[1-9]\d*))?$/;

// The TestFlight step publishes the iOS build here. Not in CORS and not recorded: only the publish step calls it.
const publishIos = async (request: Request, env: Cloudflare.Env): Promise<Response> => {
  if (request.method !== "PUT") return text("Method not allowed", 405, { Allow: "PUT" });
  if (!(await tokenMatches(request, env.IOS_PUBLISH_TOKEN))) return new Response(null, { status: 401 });

  const raw = await readCapped(request, MAX_PUBLISH_BYTES);
  if (raw === null) return text("Payload too large", 413);
  let body: { version?: unknown; force?: unknown } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {}
  const version = body?.version;
  if (typeof version !== "string" || version.length > MAX_VALUE_LENGTH || !PUBLISH_VERSION.test(version)) {
    return text("Bad request", 400);
  }
  if (body?.force !== undefined && typeof body.force !== "boolean") return text("Bad request", 400);

  // One call to the Durable Object compares and writes, so two publishes can't both pass the check.
  const build = { version, published_at: new Date().toISOString() };
  const result = await env.API_STATE.getByName("api").publishIosBuild(IOS_CHANNEL, build, body?.force === true);
  if (result === "conflict") {
    return new Response(JSON.stringify({ error: "Older than the published build" }), {
      status: 409,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
};

// The Google Cast receiver skin: only these files, so nothing else in public/ is reachable.
const CAST_TYPES: Record<string, string> = {
  "receiver.css": "text/css; charset=utf-8",
  "background.png": "image/png",
  "splash.png": "image/png",
  "logo.png": "image/png",
  "watermark.png": "image/png",
};

// The Custom Web Receiver app (cast-receiver/, copied here by scripts/copy-receiver.mjs): exact file
// names only, under /cast/receiver/ (production) and /cast/receiver-next/ (the same build, for trying).
const RECEIVER_TYPES: Record<string, string> = {
  "": "text/html; charset=utf-8", // index.html, served as the directory
  "main.js": "text/javascript; charset=utf-8",
  "main.css": "text/css; charset=utf-8",
};
const RECEIVER_DIRS = ["receiver", "receiver-next"];
// receiver-next tries changes, so only its page carries the CSP (README); pages always revalidate,
// scripts cache on production only.
const receiverCache = (dir: string, file: string): string =>
  file === "" || dir === "receiver-next" ? "no-cache" : "public, max-age=300";

const castAsset = async (request: Request, env: Cloudflare.Env, name: string): Promise<Response> => {
  let type = Object.hasOwn(CAST_TYPES, name) ? CAST_TYPES[name] : undefined;
  // The skin can change under the same URL, so keep it short-lived.
  let cacheControl = "public, max-age=3600";
  let csp: string | undefined;
  const slash = name.indexOf("/");
  if (!type && slash > 0) {
    const dir = name.slice(0, slash);
    const file = name.slice(slash + 1);
    if (RECEIVER_DIRS.includes(dir) && Object.hasOwn(RECEIVER_TYPES, file)) {
      type = RECEIVER_TYPES[file];
      cacheControl = receiverCache(dir, file);
      if (dir === "receiver-next" && file === "") csp = receiverCsp.csp;
    }
  }
  if (!type) return text("Not found", 404);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS_HEADERS, Allow: ALLOW } });
  if (!READ_METHODS.includes(request.method)) return text("Method not allowed", 405, { Allow: ALLOW });
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: "GET" }));
  if (!asset.ok) return text("Not found", 404);
  return new Response(request.method === "HEAD" ? null : asset.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
      ...(csp ? { "Content-Security-Policy": csp } : {}),
    },
  });
};

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/v1/releases/latest") return latestRelease(request, env, ctx);
    if (pathname === "/v1/ios/latest") return publishIos(request, env);
    if (pathname === "/v1/health") {
      if (!READ_METHODS.includes(request.method)) return text("Method not allowed", 405, { Allow: ALLOW });
      return text(request.method === "HEAD" ? null : "ok", 200);
    }
    if (pathname.startsWith("/cast/")) return castAsset(request, env, pathname.slice("/cast/".length));
    return text("Not found", 404);
  },
} satisfies ExportedHandler<Cloudflare.Env>;
