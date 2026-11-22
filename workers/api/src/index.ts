import { MAX_STALE_AGE_MS, RETRY_AFTER_FAILURE_MS, type ApiState } from "./state";

export { ApiState } from "./state";

declare global {
  namespace Cloudflare {
    interface Env {
      RELEASE_CHECKS: AnalyticsEngineDataset;
      UPSTREAM_CHECKS: AnalyticsEngineDataset;
      API_STATE: DurableObjectNamespace<ApiState>;
      // Optional fine-grained token with read-only access to public repositories, set with `wrangler secret put`.
      GITHUB_TOKEN?: string;
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

const latestRelease = async (request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS_HEADERS, Allow: ALLOW } });
  if (!READ_METHODS.includes(request.method)) return text("Method not allowed", 405, { Allow: ALLOW });

  // HEAD answers like GET but isn't a check, so it isn't recorded.
  // Recording runs after the response, so the check never waits on the Durable Object.
  if (request.method === "GET") ctx.waitUntil(record(request, env));
  const release = await env.API_STATE.getByName("api").latest();
  if (release === null) return text("Release unavailable", 502);
  // Counted from GitHub's last good answer, so a copy kept through an outage shows its real age.
  const age = Date.now() - release.fetchedAt;
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "X-Sonor-Release-Age": String(Math.floor(age / 1000)),
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

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/v1/releases/latest") return latestRelease(request, env, ctx);
    if (pathname === "/v1/health") {
      if (!READ_METHODS.includes(request.method)) return text("Method not allowed", 405, { Allow: ALLOW });
      return text(request.method === "HEAD" ? null : "ok", 200);
    }
    return text("Not found", 404);
  },
} satisfies ExportedHandler<Cloudflare.Env>;
