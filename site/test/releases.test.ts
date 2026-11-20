import { describe, expect, it, vi } from "vitest";
import { latestRelease, pickLatest } from "../src/releases";

const release = (tag: string, published: string | null, draft = false) => ({
  tag_name: tag,
  html_url: `https://github.com/sonorhq/sonor/releases/tag/${tag}`,
  draft,
  published_at: published,
  assets: [{ name: `sonor-${tag}-abc1234-macos.dmg`, browser_download_url: `https://example.test/${tag}.dmg`, size: 5 }],
});

const beta22 = release("v0.1.0-beta.22", "2026-11-10T10:00:00Z");
const beta23 = release("v0.1.0-beta.23", "2026-11-18T10:00:00Z");
const draft = release("v0.1.0-beta.24", "2026-11-19T10:00:00Z", true);

/** An in-memory Cache API, keyed by URL. */
function memoryCache() {
  const store = new Map<string, Response>();
  return {
    store,
    cache: {
      match: async (req: Request) => store.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => void store.set(req.url, res),
    } as unknown as Cache,
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("pickLatest", () => {
  it("skips drafts and takes the newest prerelease", () => {
    expect(pickLatest([beta22, draft, beta23])?.tag_name).toBe("v0.1.0-beta.23");
  });

  it("sorts by publication, not by the order GitHub sent", () => {
    expect(pickLatest([beta23, beta22])?.tag_name).toBe("v0.1.0-beta.23");
    expect(pickLatest([beta22, beta23])?.tag_name).toBe("v0.1.0-beta.23");
  });

  it("finds nothing when every release is a draft", () => {
    expect(pickLatest([draft])).toBeUndefined();
    expect(pickLatest([])).toBeUndefined();
  });
});

describe("latestRelease", () => {
  it("reads the releases from the GitHub API with a plain User-Agent and no token", async () => {
    const fetcher = vi.fn(async () => json([draft, beta23, beta22]));
    const found = await latestRelease(fetcher as unknown as typeof fetch, memoryCache().cache);

    expect(found?.tag_name).toBe("v0.1.0-beta.23");
    expect(found?.assets).toEqual([{ name: "sonor-v0.1.0-beta.23-abc1234-macos.dmg", browser_download_url: "https://example.test/v0.1.0-beta.23.dmg", size: 5 }]);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/sonorhq/sonor/releases?per_page=5");
    expect(init.headers).toEqual({ Accept: "application/vnd.github+json", "User-Agent": "sonor.fi-site" });
  });

  it("returns null when GitHub answers with an error", async () => {
    const { store, cache } = memoryCache();
    expect(await latestRelease((async () => json({ message: "rate limited" }, 403)) as typeof fetch, cache)).toBeNull();
    expect(store.size).toBe(0);
  });

  it("returns null when GitHub can't be reached", async () => {
    const failing = (async () => {
      throw new TypeError("network down");
    }) as unknown as typeof fetch;
    expect(await latestRelease(failing, memoryCache().cache)).toBeNull();
  });

  it("returns null when there is no release to pick", async () => {
    expect(await latestRelease((async () => json([draft])) as typeof fetch, memoryCache().cache)).toBeNull();
  });

  it("caches the release for ten minutes and serves it from the cache next time", async () => {
    const { store, cache } = memoryCache();
    const fetcher = vi.fn(async () => json([beta23]));
    await latestRelease(fetcher as unknown as typeof fetch, cache);
    expect(store.get("https://sonor.fi/__cache/latest-release")?.headers.get("Cache-Control")).toBe("max-age=600");

    const again = await latestRelease(fetcher as unknown as typeof fetch, cache);
    expect(again?.tag_name).toBe("v0.1.0-beta.23");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
