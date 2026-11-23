import { DurableObject } from "cloudflare:workers";

export const RELEASES_URL = "https://api.github.com/repos/sonorhq/sonor/releases?per_page=10";
export const CACHE_TTL_MS = 5 * 60 * 1000;
// Past this age since GitHub last answered, the copy is no longer served: the apps then fall back to GitHub, which can correct it.
export const MAX_STALE_AGE_MS = 60 * 60 * 1000;
// Shorter than the client's own timeout, so a slow GitHub never outlasts the client.
const UPSTREAM_TIMEOUT_MS = 2500;
// After a failed refresh, the stale copy is served this long before GitHub is asked again.
// Unauthenticated GitHub allows 60 requests an hour per IP, so failures must not be retried on every check.
export const RETRY_AFTER_FAILURE_MS = 60 * 1000;

interface Salt {
  month: string;
  value: string;
}

// An iOS build announced on a channel: the version, and when it was published.
export interface IosBuild {
  version: string;
  published_at: string;
}

export interface CachedRelease {
  body: string;
  // When GitHub last answered with a release. The copy's age is counted from here, never from a failed refresh.
  fetchedAt: number;
  // When GitHub may be asked again. Entries written before this field are asked again at once.
  retryAt?: number;
}

// What GitHub answered, as recorded: its status for a reply, or why there was none.
export type UpstreamOutcome = "200" | "403" | "429" | "other" | "error" | "timeout";

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

// The codes that matter for GitHub's rate limit are kept apart; every other status is "other".
const outcomeOf = (status: number): UpstreamOutcome => {
  if (status === 200) return "200";
  if (status === 403) return "403";
  if (status === 429) return "429";
  return "other";
};

// One instance for the whole API: it holds the month's salt and the cached release.
export class ApiState extends DurableObject {
  private inFlight: Promise<CachedRelease | null> | null = null;

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

  // The iOS build announced on a channel (testflight now, appstore later), or undefined while none is.
  async iosBuild(channel: string): Promise<IosBuild | undefined> {
    return this.ctx.storage.get<IosBuild>(`ios:${channel}`);
  }

  async publishIosBuild(channel: string, build: IosBuild): Promise<void> {
    await this.ctx.storage.put(`ios:${channel}`, build);
  }

  // Runs at the start of a UTC month. A request that already started this month's salt keeps it.
  async alarm(): Promise<void> {
    const salt = await this.ctx.storage.get<Salt>("salt");
    if (salt && salt.month !== monthOf(Date.now())) await this.ctx.storage.delete("salt");
  }

  // Returns the newest GitHub release and when GitHub last answered with it; null if it never has. The caller decides how old is too old.
  // Concurrent callers share one upstream request. The token defaults to the GITHUB_TOKEN secret, when one is set.
  latest(
    upstream: typeof fetch = fetch,
    token: string | undefined = this.env.GITHUB_TOKEN,
    record: (outcome: UpstreamOutcome) => void = (outcome) => this.recordOutcome(outcome),
  ): Promise<CachedRelease | null> {
    this.inFlight ??= this.load(upstream, token, record).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  // Recording never fails the lookup, so errors are dropped on purpose.
  private recordOutcome(outcome: UpstreamOutcome) {
    try {
      this.env.UPSTREAM_CHECKS.writeDataPoint({ blobs: [outcome], doubles: [1] });
    } catch {}
  }

  private async load(
    upstream: typeof fetch,
    token: string | undefined,
    record: (outcome: UpstreamOutcome) => void,
  ): Promise<CachedRelease | null> {
    const cached = await this.ctx.storage.get<CachedRelease>("release");
    if (cached && Date.now() < (cached.retryAt ?? 0)) return cached;
    const { outcome, body } = await this.fetchNewest(upstream, token);
    record(outcome);
    if (body !== undefined) {
      const now = Date.now();
      const fresh: CachedRelease = { body, fetchedAt: now, retryAt: now + CACHE_TTL_MS };
      await this.ctx.storage.put("release", fresh);
      return fresh;
    }
    if (!cached) return null;
    // A failed refresh keeps the copy and its fetch time, and only delays the next try.
    // An entry without retryAt predates that check, so its fetchedAt can't be trusted: it goes to 0 and the 503 starts at once.
    const retried: CachedRelease = {
      ...cached,
      fetchedAt: cached.retryAt === undefined ? 0 : cached.fetchedAt,
      retryAt: Date.now() + RETRY_AFTER_FAILURE_MS,
    };
    await this.ctx.storage.put("release", retried);
    return retried;
  }

  // The newest release as JSON from GitHub, or no body and the outcome that says why there isn't one.
  private async fetchNewest(
    upstream: typeof fetch,
    token: string | undefined,
  ): Promise<{ outcome: UpstreamOutcome; body?: string }> {
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
      const releases = res.ok ? ((await res.json()) as GitHubRelease[]) : undefined;
      const release = releases && newest(releases);
      // A 200 with no published release isn't an answer worth a status of its own.
      const outcome: UpstreamOutcome = res.status === 200 && !release ? "other" : outcomeOf(res.status);
      return { outcome, body: release && JSON.stringify(release) };
    } catch (error) {
      // Network error, timeout or a body that isn't JSON: the caller falls back to the stale copy.
      return { outcome: error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "error" };
    }
  }
}
