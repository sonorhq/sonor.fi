import { describe, expect, it, vi } from "vitest";
import { createEdgeHandler } from "../src/edge";

const HSTS = "max-age=31536000; includeSubDomains";
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'";

// The Worker's assets and Vike are faked: the tests cover the rules in front of them.
function setup({ assetStatus = 404 }: { assetStatus?: number } = {}) {
  const assets = vi.fn(async () =>
    assetStatus === 404
      ? new Response("Not found", { status: 404 })
      : new Response("png", { status: 200, headers: { "Content-Type": "image/png" } }),
  );
  const render = vi.fn(
    async () => new Response("<html></html>", { status: 200, headers: { "Content-Type": "text/html;charset=utf-8" } }),
  );
  const handler = createEdgeHandler({ assets, render });
  // Redirects are checked without following them, so each hop is visible.
  const get = (url: string, init?: RequestInit) => handler(new Request(url, { redirect: "manual", ...init }));
  return { get, assets, render };
}

describe("redirects", () => {
  it("sends http to https on the same host, path and query", async () => {
    const { get, render } = setup();
    const res = await get("http://sonor.fi/some/path?x=1&y=2");
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://sonor.fi/some/path?x=1&y=2");
    expect(render).not.toHaveBeenCalled();
  });

  it("keeps the port out of the https redirect", async () => {
    const res = await setup().get("http://sonor.fi:80/");
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://sonor.fi/");
  });

  it("sends www to the apex on https, keeping path and query", async () => {
    const res = await setup().get("https://www.sonor.fi/?utm=1");
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://sonor.fi/?utm=1");
  });

  it("sends http www in two hops: https first, then the apex", async () => {
    const { get } = setup();
    const first = await get("http://www.sonor.fi/about");
    expect(first.headers.get("Location")).toBe("https://www.sonor.fi/about");
    const second = await get("https://www.sonor.fi/about");
    expect(second.headers.get("Location")).toBe("https://sonor.fi/about");
  });
});

describe("assets and pages", () => {
  it("serves a file from the assets with the security headers, without rendering", async () => {
    const { get, render } = setup({ assetStatus: 200 });
    const res = await get("https://sonor.fi/sonor-lockup-1000.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Strict-Transport-Security")).toBe(HSTS);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("Content-Security-Policy")).toBe(CSP);
    expect(res.headers.get("Accept-CH")).toBeNull();
    expect(render).not.toHaveBeenCalled();
  });

  it("renders a page the assets don't have, with the security headers and client hints", async () => {
    const { get, render } = setup();
    const res = await get("https://sonor.fi/");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(res.headers.get("Strict-Transport-Security")).toBe(HSTS);
    expect(res.headers.get("Content-Security-Policy")).toBe(CSP);
    expect(res.headers.get("Accept-CH")).toBe("Sec-CH-UA-Platform, Sec-CH-UA-Arch, Sec-CH-UA-Bitness");
    expect(res.headers.get("Vary")).toBe("User-Agent, Sec-CH-UA-Platform, Sec-CH-UA-Arch, Sec-CH-UA-Bitness");
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("passes a 404 page through with the security headers", async () => {
    const render = vi.fn(async () => new Response("missing", { status: 404, headers: { "Content-Type": "text/html" } }));
    const handler = createEdgeHandler({ assets: async () => new Response(null, { status: 404 }), render });
    const res = await handler(new Request("https://sonor.fi/does-not-exist"));
    expect(res.status).toBe(404);
    expect(res.headers.get("Strict-Transport-Security")).toBe(HSTS);
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
  });
});
