// The rules every request passes before Vike renders it: https and apex redirects,
// the security headers, and the client hints that the download pick reads.

const APEX = "sonor.fi";
const WWW = `www.${APEX}`;
const LOCAL = ["localhost", "127.0.0.1"];

// Scripts come from this origin only. Styles are the built CSS file, but the Vite dev server injects its CSS as
// style elements, so 'unsafe-inline' stays for styles until the dev server is checked without it.
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'";

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": CSP,
};

// Lets browsers that send client hints say their platform and architecture on the next visit.
const CLIENT_HINTS = ["Sec-CH-UA-Platform", "Sec-CH-UA-Arch", "Sec-CH-UA-Bitness"];

export interface EdgeDeps {
  /** The static assets binding; answers 404 for anything that isn't a file. */
  assets: (request: Request) => Promise<Response>;
  /** The Vike renderer for everything else. */
  render: (request: Request) => Promise<Response>;
}

// Redirects keep the path and query. Nothing is logged.
const redirect = (url: URL) => Response.redirect(url.toString(), 301);

// Responses are re-wrapped so the headers can be added, whatever their origin.
const withEdgeHeaders = (response: Response) => {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  if (headers.get("Content-Type")?.startsWith("text/html")) {
    headers.set("Accept-CH", CLIENT_HINTS.join(", "));
    headers.set("Vary", ["User-Agent", ...CLIENT_HINTS].join(", "));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

export function createEdgeHandler({ assets, render }: EdgeDeps) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    // Local development runs over plain http, so the redirects are for the public site only.
    const local = LOCAL.includes(url.hostname);

    if (!local && url.protocol === "http:") {
      url.protocol = "https:";
      url.port = "";
      return redirect(url);
    }

    if (!local && url.hostname === WWW) {
      url.hostname = APEX;
      return redirect(url);
    }

    const file = await assets(request);
    return withEdgeHeaders(file.status === 404 ? await render(request) : file);
  };
}
