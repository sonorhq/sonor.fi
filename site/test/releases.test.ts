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

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const KEY = "https://sonor.fi/__cache/latest-release";

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

const ok = (releases: unknown[]) => vi.fn(async () => json(releases));
const down = () =>
  vi.fn(async () => {
    throw new TypeError("network down");
  });

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
    const fetcher = ok([draft, beta23, beta22]);
    const found = await latestRelease(fetcher as unknown as typeof fetch, memoryCache().cache);

    expect(found?.tag_name).toBe("v0.1.0-beta.23");
    expect(found?.assets).toEqual([{ name: "sonor-v0.1.0-beta.23-abc1234-macos.dmg", browser_download_url: "https://example.test/v0.1.0-beta.23.dmg", size: 5 }]);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/sonorhq/sonor/releases?per_page=5");
    expect(init.headers).toEqual({ Accept: "application/vnd.github+json", "User-Agent": "sonor.fi-site" });
  });

  it("returns null when GitHub answers with an error and nothing is stored", async () => {
    const { store, cache } = memoryCache();
    expect(await latestRelease((async () => json({ message: "rate limited" }, 403)) as typeof fetch, cache)).toBeNull();
    expect(store.size).toBe(0);
  });

  it("returns null when GitHub can't be reached and nothing is stored", async () => {
    expect(await latestRelease(down() as unknown as typeof fetch, memoryCache().cache)).toBeNull();
  });

  it("returns null when there is no release to pick", async () => {
    expect(await latestRelease(ok([draft]) as unknown as typeof fetch, memoryCache().cache)).toBeNull();
  });

  it("serves the stored release for ten minutes without asking GitHub", async () => {
    const { store, cache } = memoryCache();
    const fetcher = ok([beta23]);
    const t0 = 1_000_000;
    await latestRelease(fetcher as unknown as typeof fetch, cache, () => t0);
    expect(store.get(KEY)?.headers.get("Cache-Control")).toBe("max-age=86400");

    const again = await latestRelease(fetcher as unknown as typeof fetch, cache, () => t0 + 9 * MIN);
    expect(again?.tag_name).toBe("v0.1.0-beta.23");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("asks GitHub again once the copy is older than ten minutes", async () => {
    const { cache } = memoryCache();
    const fetcher = ok([beta23]);
    await latestRelease(fetcher as unknown as typeof fetch, cache, () => 0);
    await latestRelease(fetcher as unknown as typeof fetch, cache, () => 11 * MIN);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("serves the last good copy when GitHub fails after the copy went stale", async () => {
    const { cache } = memoryCache();
    await latestRelease(ok([beta23]) as unknown as typeof fetch, cache, () => 0);
    const failing = down();
    const found = await latestRelease(failing as unknown as typeof fetch, cache, () => 2 * HOUR);
    expect(found?.tag_name).toBe("v0.1.0-beta.23");
    expect(failing).toHaveBeenCalledTimes(1);
  });

  it("serves the copy when GitHub answers with an error, and keeps it for the next visit", async () => {
    const { cache } = memoryCache();
    await latestRelease(ok([beta23]) as unknown as typeof fetch, cache, () => 0);
    const limited = (async () => json({ message: "rate limited" }, 403)) as unknown as typeof fetch;
    expect((await latestRelease(limited, cache, () => HOUR))?.tag_name).toBe("v0.1.0-beta.23");
    expect((await latestRelease(limited, cache, () => 2 * HOUR))?.tag_name).toBe("v0.1.0-beta.23");
  });

  it("replaces the stale copy when GitHub answers with a newer release", async () => {
    const { cache } = memoryCache();
    await latestRelease(ok([beta22]) as unknown as typeof fetch, cache, () => 0);
    const found = await latestRelease(ok([beta23]) as unknown as typeof fetch, cache, () => 2 * HOUR);
    expect(found?.tag_name).toBe("v0.1.0-beta.23");
  });

  it("stops serving a copy older than a day", async () => {
    const { cache } = memoryCache();
    await latestRelease(ok([beta23]) as unknown as typeof fetch, cache, () => 0);
    expect(await latestRelease(down() as unknown as typeof fetch, cache, () => 25 * HOUR)).toBeNull();
  });

  it("still answers when the cache can't be written", async () => {
    const cache = {
      match: async () => undefined,
      put: async () => {
        throw new Error("cache full");
      },
    } as unknown as Cache;
    expect((await latestRelease(ok([beta23]) as unknown as typeof fetch, cache))?.tag_name).toBe("v0.1.0-beta.23");
  });

  it("fetches when the cache can't be read", async () => {
    const cache = {
      match: async () => {
        throw new Error("cache down");
      },
      put: async () => undefined,
    } as unknown as Cache;
    const fetcher = ok([beta23]);
    expect((await latestRelease(fetcher as unknown as typeof fetch, cache))?.tag_name).toBe("v0.1.0-beta.23");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
