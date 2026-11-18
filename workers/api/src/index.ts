import type { ApiState } from "./state";

export { ApiState } from "./state";

declare global {
  namespace Cloudflare {
    interface Env {
      RELEASE_CHECKS: AnalyticsEngineDataset;
      API_STATE: DurableObjectNamespace<ApiState>;
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

const field = (request: Request, name: string, missing = "unknown") =>
  clean(request.headers.get(`X-Sonor-${name}`), missing);

// Recording must never fail the release check, so errors are dropped on purpose.
const record = async (request: Request, env: Cloudflare.Env) => {
  try {
    const hash = await env.API_STATE.getByName("api").identify(request.headers.get("CF-Connecting-IP") ?? "");
    env.RELEASE_CHECKS.writeDataPoint({
      indexes: [hash],
      blobs: [
        field(request, "Version"),
        field(request, "Commit"),
        field(request, "OS"),
        field(request, "Arch"),
        field(request, "Platform"),
        field(request, "Lang", ""),
        field(request, "Expires", ""),
        new Date().toISOString().slice(0, 10),
      ],
      doubles: [1],
    });
  } catch {}
};

const latestRelease = async (request: Request, env: Cloudflare.Env): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS_HEADERS, Allow: ALLOW } });
  if (!READ_METHODS.includes(request.method)) return text("Method not allowed", 405, { Allow: ALLOW });

  // HEAD answers like GET but isn't a check, so it isn't recorded.
  if (request.method === "GET") await record(request, env);
  const release = await env.API_STATE.getByName("api").latest();
  if (release === null) return text("Release unavailable", 502);
  return new Response(request.method === "HEAD" ? null : release, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  });
};

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/v1/releases/latest") return latestRelease(request, env);
    if (pathname === "/v1/health") {
      if (!READ_METHODS.includes(request.method)) return text("Method not allowed", 405, { Allow: ALLOW });
      return text(request.method === "HEAD" ? null : "ok", 200);
    }
    return text("Not found", 404);
  },
} satisfies ExportedHandler<Cloudflare.Env>;
