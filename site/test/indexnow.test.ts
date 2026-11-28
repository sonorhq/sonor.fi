import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { ENDPOINT, INDEXNOW_KEY, indexNowBody, submitToIndexNow, urlsFromSitemap } from "../src/indexnow";
import { SITE, sitemapXml } from "../src/sitemap";

const SAMPLE = sitemapXml([
  { path: "/", lastmod: "2026-11-24" },
  { path: "/privacy", lastmod: "2026-11-25" },
]);

// The fake fetch answers the way the endpoint does; no test sends a real request.
function fakeFetch(response: () => Promise<Response>) {
  return vi.fn(response) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("the key", () => {
  it("is 32 lowercase hex characters", () => {
    expect(INDEXNOW_KEY).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is served as the key file at the site root, holding exactly the key", () => {
    const file = readFileSync(new URL(`../public/${INDEXNOW_KEY}.txt`, import.meta.url), "utf8");
    expect(file.trim()).toBe(INDEXNOW_KEY);
  });
});

describe("urlsFromSitemap", () => {
  it("returns the sitemap's own URLs", () => {
    expect(urlsFromSitemap(SAMPLE)).toEqual([`${SITE}/`, `${SITE}/privacy`]);
  });

  it("drops a <loc> on another host", () => {
    const xml = SAMPLE.replace("</urlset>", "  <url><loc>https://example.com/elsewhere</loc></url>\n</urlset>");
    expect(urlsFromSitemap(xml)).toEqual([`${SITE}/`, `${SITE}/privacy`]);
  });
});

describe("indexNowBody", () => {
  it("names the host, key, key file and URL list", () => {
    expect(indexNowBody([`${SITE}/`, `${SITE}/privacy`])).toEqual({
      host: "sonor.fi",
      key: INDEXNOW_KEY,
      keyLocation: `https://sonor.fi/${INDEXNOW_KEY}.txt`,
      urlList: [`${SITE}/`, `${SITE}/privacy`],
    });
  });
});

describe("submitToIndexNow", () => {
  it("posts the body to the endpoint and reports the status", async () => {
    const fetchImpl = fakeFetch(async () => new Response(null, { status: 200 }));
    const result = await submitToIndexNow(SAMPLE, fetchImpl);
    expect(result).toBe("IndexNow accepted 2 URLs (200)");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(indexNowBody([`${SITE}/`, `${SITE}/privacy`])));
  });

  it("resolves, without throwing, when the request fails", async () => {
    const fetchImpl = fakeFetch(async () => {
      throw new Error("network down");
    });
    const result = await submitToIndexNow(SAMPLE, fetchImpl);
    expect(result).toMatch(/^IndexNow not reached/);
  });

  it("accepts a 202 as well", async () => {
    const fetchImpl = fakeFetch(async () => new Response(null, { status: 202 }));
    expect(await submitToIndexNow(SAMPLE, fetchImpl)).toBe("IndexNow accepted 2 URLs (202)");
  });

  it("names the cause of a 403, a 422 and a 429", async () => {
    const cases: [number, string][] = [
      [403, "the key file was not found or does not match"],
      [422, "a URL does not belong to the host"],
      [429, "too many requests"],
    ];
    for (const [status, hint] of cases) {
      const fetchImpl = fakeFetch(async () => new Response(null, { status }));
      expect(await submitToIndexNow(SAMPLE, fetchImpl)).toBe(`IndexNow rejected the request (${status}): ${hint}`);
    }
  });

  it("resolves, without throwing, on a server error", async () => {
    const fetchImpl = fakeFetch(async () => new Response(null, { status: 500 }));
    const result = await submitToIndexNow(SAMPLE, fetchImpl);
    expect(result).toBe("IndexNow rejected the request (500): unexpected answer");
  });

  it("sends nothing for an empty sitemap", async () => {
    const fetchImpl = fakeFetch(async () => new Response(null, { status: 200 }));
    const result = await submitToIndexNow(sitemapXml([]), fetchImpl);
    expect(result).toBe("no URLs in the sitemap; nothing sent");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
