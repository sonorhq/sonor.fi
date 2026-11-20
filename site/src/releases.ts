// The newest sonor release, betas included, read from GitHub on the server and cached at the edge.
// Never through api.sonor.fi, so the app's update-check counts stay clean.

import type { Release } from "./downloads";

const RELEASES_API = "https://api.github.com/repos/sonorhq/sonor/releases?per_page=5";

// The Cache API key. Only the Worker reads it; the URL is never requested.
const CACHE_KEY = "https://sonor.fi/__cache/latest-release";
// Served without asking GitHub again. Unauthenticated API calls share 60 an hour per IP, so the Worker asks rarely.
const FRESH_MS = 10 * 60 * 1000;
// The last good copy stays for the fallback when GitHub fails, for up to a day.
const KEEP_MS = 24 * 60 * 60 * 1000;
// While GitHub fails, the copy is served and GitHub is asked again at most this often (per data centre, as the cache is).
const RETRY_MS = 60 * 1000;

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  draft: boolean;
  published_at: string | null;
  assets: { name: string; browser_download_url: string; size?: number }[];
}

interface Stored {
  /** When GitHub last answered with a release. */
  fetchedAt: number;
  release: Release;
  /** Set after a failed fetch: until then the stored copy is served without asking GitHub. */
  retryAt?: number;
}

/** The newest release that isn't a draft. Prereleases count, so betas are picked. */
export function pickLatest(releases: GitHubRelease[]): GitHubRelease | undefined {
  return releases
    .filter((r) => !r.draft)
    .sort((a, b) => Date.parse(b.published_at ?? "") - Date.parse(a.published_at ?? ""))[0];
}

const toRelease = (r: GitHubRelease): Release => ({
  tag_name: r.tag_name,
  html_url: r.html_url,
  assets: r.assets.map(({ name, browser_download_url, size }) => ({ name, browser_download_url, size })),
});

// A cache that fails only costs a GitHub call on the next visit, so its errors are never shown.
async function readStored(cache: Cache | undefined, key: Request): Promise<Stored | undefined> {
  try {
    const hit = await cache?.match(key);
    return hit ? ((await hit.json()) as Stored) : undefined;
  } catch {
    return undefined;
  }
}

async function writeStored(cache: Cache | undefined, key: Request, stored: Stored): Promise<void> {
  try {
    await cache?.put(
      key,
      new Response(JSON.stringify(stored), {
        headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${KEEP_MS / 1000}` },
      }),
    );
  } catch {
    // The page has its release already; the next visit fetches again.
  }
}

/**
 * The latest release, or null when GitHub can't be reached and no good copy is left. A failed
 * fetch never replaces the stored copy, and a failure is never stored: the copy stays for up to a day.
 */
export async function latestRelease(
  fetcher: typeof fetch = fetch,
  cache: Cache | undefined = typeof caches === "undefined" ? undefined : caches.default,
  now: () => number = Date.now,
): Promise<Release | null> {
  const key = new Request(CACHE_KEY);
  const stored = await readStored(cache, key);
  const t = now();
  if (stored && (t - stored.fetchedAt < FRESH_MS || (stored.retryAt !== undefined && t < stored.retryAt))) {
    return stored.release;
  }

  let fresh: Release | null = null;
  try {
    const res = await fetcher(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "sonor.fi-site" },
    });
    if (res.ok) {
      const latest = pickLatest((await res.json()) as GitHubRelease[]);
      if (latest) fresh = toRelease(latest);
    }
  } catch {
    // Unreachable or not JSON: the stored copy below is the fallback.
  }

  if (!fresh) {
    if (!stored || t - stored.fetchedAt >= KEEP_MS) return null;
    await writeStored(cache, key, { ...stored, retryAt: t + RETRY_MS });
    return stored.release;
  }
  await writeStored(cache, key, { fetchedAt: now(), release: fresh });
  return fresh;
}
