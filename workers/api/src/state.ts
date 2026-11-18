import { DurableObject } from "cloudflare:workers";

export const RELEASES_URL = "https://api.github.com/repos/sonorhq/sonor/releases?per_page=10";
export const CACHE_TTL_MS = 5 * 60 * 1000;
// Shorter than the client's own timeout, so a slow GitHub never outlasts the client.
const UPSTREAM_TIMEOUT_MS = 2500;
// After a failed refresh, the stale copy is served this long before GitHub is asked again.
// Unauthenticated GitHub allows 60 requests an hour per IP, so failures must not be retried on every check.
const RETRY_AFTER_FAILURE_MS = 60 * 1000;

interface Salt {
  month: string;
  value: string;
}

interface CachedRelease {
  body: string;
  fetchedAt: number;
}

interface GitHubRelease {
  draft: boolean;
  created_at: string;
  published_at: string | null;
}

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const monthOf = (time: number) => new Date(time).toISOString().slice(0, 7);

const nextUtcMonth = (now: number) => {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
};

// Pre-releases count; drafts don't. Sorted by publish date, falling back to creation for unpublished releases.
const newest = <T extends GitHubRelease>(releases: T[]): T | undefined =>
  releases
    .filter((release) => !release.draft)
    .sort((a, b) => Date.parse(b.published_at ?? b.created_at) - Date.parse(a.published_at ?? a.created_at))[0];

// One instance for the whole API: it holds the month's salt and the cached release.
export class ApiState extends DurableObject {
  private inFlight: Promise<string | null> | null = null;

  // The salt is one key: a new UTC month replaces last month's, and an alarm drops it at the month start even without traffic.
  async identify(ip: string): Promise<string> {
    const now = Date.now();
    const month = monthOf(now);
    let salt = await this.ctx.storage.get<Salt>("salt");
    if (!salt || salt.month !== month) {
      salt = { month, value: hex(crypto.getRandomValues(new Uint8Array(32))) };
      await this.ctx.storage.put("salt", salt);
      await this.ctx.storage.setAlarm(nextUtcMonth(now));
    }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt.value + ip));
    return hex(new Uint8Array(digest));
  }

  // Runs at the start of a UTC month. A request that already started this month's salt keeps it.
  async alarm(): Promise<void> {
    const salt = await this.ctx.storage.get<Salt>("salt");
    if (salt && salt.month !== monthOf(Date.now())) await this.ctx.storage.delete("salt");
  }

  // Serves the newest GitHub release as JSON, and the last good copy when GitHub fails; null if there is none.
  // Concurrent callers share one upstream request. The token defaults to the GITHUB_TOKEN secret, when one is set.
  latest(upstream: typeof fetch = fetch, token: string | undefined = this.env.GITHUB_TOKEN): Promise<string | null> {
    this.inFlight ??= this.load(upstream, token).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async load(upstream: typeof fetch, token: string | undefined): Promise<string | null> {
    const cached = await this.ctx.storage.get<CachedRelease>("release");
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.body;
    try {
      const headers: Record<string, string> = {
        "User-Agent": "sonor-api",
        Accept: "application/vnd.github+json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await upstream(RELEASES_URL, {
        headers,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      const release = res.ok ? newest((await res.json()) as GitHubRelease[]) : undefined;
      if (release) {
        const body = JSON.stringify(release);
        await this.ctx.storage.put("release", { body, fetchedAt: Date.now() });
        return body;
      }
    } catch {
      // Network error, timeout or a body that isn't JSON: fall through to the stale copy.
    }
    if (!cached) return null;
    // Backdates the copy so it reads as stale only after the retry delay.
    await this.ctx.storage.put("release", { body: cached.body, fetchedAt: Date.now() - CACHE_TTL_MS + RETRY_AFTER_FAILURE_MS });
    return cached.body;
  }
}
