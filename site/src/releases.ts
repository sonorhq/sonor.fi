// The newest sonor release, betas included, read from GitHub on the server and cached at the edge.
// Never through api.sonor.fi, so the app's update-check counts stay clean.

import type { Release } from "./downloads";

const RELEASES_API = "https://api.github.com/repos/sonorhq/sonor/releases?per_page=5";

// The Cache API key. Only the Worker reads it; the URL is never requested.
const CACHE_KEY = "https://sonor.fi/__cache/latest-release";
const CACHE_SECONDS = 600;

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  draft: boolean;
  published_at: string | null;
  assets: { name: string; browser_download_url: string; size?: number }[];
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

/**
 * The latest release, or null when GitHub can't be reached. The caller then links to the
 * releases page. Failures aren't cached, so the next visit tries again.
 */
export async function latestRelease(
  fetcher: typeof fetch = fetch,
  cache: Cache | undefined = typeof caches === "undefined" ? undefined : caches.default,
): Promise<Release | null> {
  const key = new Request(CACHE_KEY);
  const cached = await cache?.match(key);
  if (cached) return (await cached.json()) as Release;

  let release: Release;
  try {
    const res = await fetcher(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "sonor.fi-site" },
    });
    if (!res.ok) return null;
    const latest = pickLatest((await res.json()) as GitHubRelease[]);
    if (!latest) return null;
    release = toRelease(latest);
  } catch {
    return null;
  }

  await cache?.put(
    key,
    new Response(JSON.stringify(release), {
      headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${CACHE_SECONDS}` },
    }),
  );
  return release;
}
