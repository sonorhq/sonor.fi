export interface Env {
  ASSETS: Fetcher;
}

const APEX = "sonor.fi";
const WWW = `www.${APEX}`;

// The page has no script, so 'self' for scripts (from default-src) is the strictest that works. Its one <style> block needs 'unsafe-inline'.
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'";

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": CSP,
};

// Redirects keep the path and query. Nothing is logged.
const redirect = (url: URL) => Response.redirect(url.toString(), 301);

// Asset responses are re-wrapped so the headers can be added, whatever their origin.
const withSecurityHeaders = (response: Response) => {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.protocol === "http:") {
      url.protocol = "https:";
      url.port = "";
      return redirect(url);
    }

    if (url.hostname === WWW) {
      url.hostname = APEX;
      return redirect(url);
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;
