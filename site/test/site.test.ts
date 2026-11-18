import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

// Redirects are checked without following them, so each hop is visible.
const get = (url: string) => SELF.fetch(url, { redirect: "manual" });

const HSTS = "max-age=31536000; includeSubDomains";

describe("redirects", () => {
  it("sends http to https on the same host, path and query", async () => {
    const res = await get("http://sonor.fi/some/path?x=1&y=2");
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://sonor.fi/some/path?x=1&y=2");
  });

  it("keeps the port out of the https redirect", async () => {
    const res = await get("http://sonor.fi:80/");
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://sonor.fi/");
  });

  it("sends www to the apex on https, keeping path and query", async () => {
    const res = await get("https://www.sonor.fi/?utm=1");
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://sonor.fi/?utm=1");
  });

  it("sends http www in two hops: https first, then the apex", async () => {
    const first = await get("http://www.sonor.fi/about");
    expect(first.headers.get("Location")).toBe("https://www.sonor.fi/about");
    const second = await get("https://www.sonor.fi/about");
    expect(second.headers.get("Location")).toBe("https://sonor.fi/about");
  });
});

describe("asset responses", () => {
  it("serves the page with the security headers", async () => {
    const res = await get("https://sonor.fi/");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(res.headers.get("Strict-Transport-Security")).toBe(HSTS);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("Content-Security-Policy")).toBe(
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'",
    );
  });

  it("serves the logo with the security headers", async () => {
    const res = await get("https://sonor.fi/sonor-lockup-1000.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("passes a 404 through with the security headers", async () => {
    const res = await get("https://sonor.fi/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers.get("Strict-Transport-Security")).toBe(HSTS);
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
  });
});
