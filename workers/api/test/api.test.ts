import {
  createExecutionContext,
  env,
  runDurableObjectAlarm,
  runInDurableObject,
  waitOnExecutionContext,
} from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { CACHE_TTL_MS, MAX_STALE_AGE_MS, type CachedRelease, type UpstreamOutcome } from "../src/state";

const IP = "203.0.113.77";
const BASE = "https://api.test";
const RELEASES_URL = "https://api.github.com/repos/sonorhq/sonor/releases?per_page=10";

// A GitHub release object with the fields the Worker reads.
const release = (tag: string, fields: Record<string, unknown> = {}) => ({
  tag_name: tag,
  name: `Sonor ${tag}`,
  draft: false,
  prerelease: tag.includes("beta"),
  created_at: "2026-11-01T10:00:00Z",
  published_at: "2026-11-01T10:05:00Z",
  assets: [],
  ...fields,
});
// Non-ASCII in the name checks that the release reaches the client intact.
const RELEASE = release("v1.0.0-beta.3", { name: "Sonor ☃ beta", published_at: "2026-11-10T09:00:00Z" });
const OLD = release("v1.0.0-beta.2");
const RELEASE_BODY = JSON.stringify(RELEASE);

const stub = () => env.API_STATE.getByName("api");
const points: AnalyticsEngineDataPoint[] = [];
const testEnv = {
  API_STATE: env.API_STATE,
  ASSETS: env.ASSETS,
  RELEASE_CHECKS: { writeDataPoint: (p: AnalyticsEngineDataPoint) => points.push(p) },
} as unknown as Cloudflare.Env;

// Runs the Worker the way the runtime does: the response first, then the waitUntil work (recording) before the test looks.
const run = async (req: Request, environment: Cloudflare.Env = testEnv) => {
  const ctx = createExecutionContext();
  const res = await worker.fetch(req, environment, ctx);
  await waitOnExecutionContext(ctx);
  return res;
};

const checkHeaders = {
  "CF-Connecting-IP": IP,
  "X-Sonor-Version": "1.0.0-beta.3",
  "X-Sonor-Commit": "abc1234",
  "X-Sonor-OS": "linux",
  "X-Sonor-Arch": "x86_64",
  "X-Sonor-Platform": "desktop",
  "X-Sonor-Lang": "en",
  "X-Sonor-Expires": "2027-02-16",
};
const latest = (headers: Record<string, string> = checkHeaders, init: RequestInit = {}) =>
  run(new Request(`${BASE}/v1/releases/latest`, { ...init, headers: { ...headers } }));
const request = (path: string, init: RequestInit = {}) => run(new Request(`${BASE}${path}`, init));

// The release lookup runs inside the Durable Object, so tests drive it there with a stand-in for GitHub.
const ok = (body: unknown) => async () => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
const fail = async () => new Response("rate limited", { status: 403 });
const lookup = (fetchFn: typeof fetch, record?: (outcome: UpstreamOutcome) => void) =>
  runInDurableObject(stub(), (instance) => instance.latest(fetchFn, undefined, record));
const upstream = async (fetchFn: typeof fetch, token?: string) =>
  (await runInDurableObject(stub(), (instance) => instance.latest(fetchFn, token)))?.body ?? null;
const storedRelease = () => runInDurableObject(stub(), (_, state) => state.storage.get<CachedRelease>("release"));

// Makes the cached release due for GitHub again, as if GitHub last answered with it `ageMs` ago.
const expireCache = (ageMs = CACHE_TTL_MS + 1) =>
  runInDurableObject(stub(), async (_, state) => {
    const cached = await state.storage.get<CachedRelease>("release");
    await state.storage.put("release", { ...cached, fetchedAt: Date.now() - ageMs, retryAt: Date.now() - 1 });
  });
const primeCache = (body: string, fetchedAt = Date.now()) =>
  runInDurableObject(stub(), (_, state) =>
    state.storage.put("release", { body, fetchedAt, retryAt: Date.now() + CACHE_TTL_MS }),
  );

beforeEach(async () => {
  points.length = 0;
  // Storage isn't always reset between tests, so start each one empty.
  await runInDurableObject(stub(), (_, state) => state.storage.deleteAll());
});

describe("GitHub release lookup", () => {
  it("asks GitHub for the releases list with the User-Agent and Accept it expects", async () => {
    const body = await upstream(async (url, init) => {
      const headers = new Headers(init?.headers);
      const expected = headers.get("User-Agent") === "sonor-api" && headers.get("Accept") === "application/vnd.github+json";
      return expected && url === RELEASES_URL ? new Response(JSON.stringify([RELEASE])) : new Response("bad request", { status: 400 });
    });
    expect(body).toBe(RELEASE_BODY);
  });

  it("sends the token as a bearer token when one is set, and no authorization otherwise", async () => {
    const seen: (string | null)[] = [];
    const spy: typeof fetch = async (_url, init) => {
      seen.push(new Headers(init?.headers).get("Authorization"));
      return new Response(JSON.stringify([RELEASE]));
    };
    await upstream(spy, "ghp_test");
    await expireCache();
    await upstream(spy);
    expect(seen).toEqual(["Bearer ghp_test", null]);
  });

  it("picks the newest published pre-release, whatever order GitHub lists them in", async () => {
    const list = [OLD, release("v0.9.0", { published_at: "2026-09-01T00:00:00Z" }), RELEASE];
    expect(await upstream(ok(list))).toBe(RELEASE_BODY);
  });

  it("ignores drafts, even the newest", async () => {
    const draft = release("v1.1.0-draft", { draft: true, published_at: null, created_at: "2026-11-15T00:00:00Z" });
    expect(await upstream(ok([draft, RELEASE]))).toBe(RELEASE_BODY);
  });

  it("returns null when GitHub lists only drafts", async () => {
    expect(await upstream(ok([release("v2.0.0", { draft: true, published_at: null })]))).toBeNull();
  });

  it("caches the release for five minutes", async () => {
    expect(await upstream(ok([RELEASE]))).toBe(RELEASE_BODY);
    expect(await upstream(ok([release("v2.0.0", { published_at: "2026-11-17T00:00:00Z" })]))).toBe(RELEASE_BODY);

    await expireCache();
    const refreshed = await upstream(ok([release("v2.0.0", { published_at: "2026-11-17T00:00:00Z" })]));
    expect(JSON.parse(refreshed ?? "{}").tag_name).toBe("v2.0.0");
  });

  it("serves the stale copy when GitHub fails", async () => {
    await upstream(ok([RELEASE]));
    await expireCache();
    expect(await upstream(fail)).toBe(RELEASE_BODY);
  });

  it("serves the stale copy when GitHub is unreachable or sends a body that isn't JSON", async () => {
    await upstream(ok([RELEASE]));
    await expireCache();
    expect(await upstream(() => Promise.reject(new TypeError("network down")))).toBe(RELEASE_BODY);
    await expireCache();
    expect(await upstream(async () => new Response("<html>"))).toBe(RELEASE_BODY);
  });

  it("waits a minute before asking GitHub again after a failed refresh", async () => {
    await upstream(ok([RELEASE]));
    await expireCache();
    expect(await upstream(fail)).toBe(RELEASE_BODY);
    expect(await upstream(ok([OLD]))).toBe(RELEASE_BODY);

    await expireCache();
    expect(await upstream(ok([OLD]))).toBe(JSON.stringify(OLD));
  });

  it("shares one GitHub request between concurrent callers", async () => {
    const counts = await runInDurableObject(stub(), async (instance) => {
      let calls = 0;
      const slow = async () => {
        calls++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return new Response(JSON.stringify([RELEASE]));
      };
      const cached = await Promise.all([instance.latest(slow), instance.latest(slow), instance.latest(slow)]);
      return { calls, bodies: cached.map((entry) => entry?.body) };
    });
    expect(counts.calls).toBe(1);
    expect(counts.bodies).toEqual([RELEASE_BODY, RELEASE_BODY, RELEASE_BODY]);
  });

  it("returns null when GitHub fails and nothing is cached", async () => {
    expect(await upstream(fail)).toBeNull();
  });

  it("keeps the copy and its fetch time through a failed refresh, so it ages from GitHub's last good answer", async () => {
    await upstream(ok([RELEASE]));
    await expireCache(30 * 60 * 1000);
    const before = await storedRelease();
    const served = await lookup(fail);
    expect(served?.body).toBe(RELEASE_BODY);
    expect(served?.fetchedAt).toBe(before?.fetchedAt);
    expect((await storedRelease())?.fetchedAt).toBe(before?.fetchedAt);
  });

  it("serves a copy older than the bound, so the endpoint can tell it is too old", async () => {
    await upstream(ok([RELEASE]));
    await expireCache(MAX_STALE_AGE_MS + 1000);
    const served = await lookup(fail);
    expect(served?.body).toBe(RELEASE_BODY);
    expect(Date.now() - (served?.fetchedAt ?? 0)).toBeGreaterThan(MAX_STALE_AGE_MS);
  });

  it.each([403, 429])("keeps the cached copy when GitHub answers %i", async (status) => {
    await upstream(ok([RELEASE]));
    await expireCache();
    const before = await storedRelease();
    const outcomes: string[] = [];
    const served = await lookup(async () => new Response("rate limited", { status }), (outcome) => outcomes.push(outcome));
    expect(served?.body).toBe(RELEASE_BODY);
    expect(served?.fetchedAt).toBe(before?.fetchedAt);
    expect((await storedRelease())?.body).toBe(RELEASE_BODY);
    expect(outcomes).toEqual([String(status)]);
  });

  it.each([
    { name: "a 200", fetchFn: ok([RELEASE]), outcome: "200" },
    { name: "a 200 with only drafts", fetchFn: ok([release("v2.0.0", { draft: true, published_at: null })]), outcome: "other" },
    { name: "a 500", fetchFn: async () => new Response("oops", { status: 500 }), outcome: "other" },
    { name: "a timeout", fetchFn: () => Promise.reject(new DOMException("timed out", "TimeoutError")), outcome: "timeout" },
    { name: "a network error", fetchFn: () => Promise.reject(new TypeError("network down")), outcome: "error" },
    { name: "a body that isn't JSON", fetchFn: async () => new Response("<html>"), outcome: "error" },
  ])("records $name from GitHub as $outcome", async ({ fetchFn, outcome }) => {
    const outcomes: string[] = [];
    await lookup(fetchFn, (recorded) => outcomes.push(recorded));
    expect(outcomes).toEqual([outcome]);
  });

  it("recovers once GitHub answers again, with a fresh fetch time", async () => {
    await upstream(ok([RELEASE]));
    await expireCache(MAX_STALE_AGE_MS + 1000);
    expect((await lookup(fail))?.body).toBe(RELEASE_BODY);

    await expireCache();
    const recovered = await lookup(ok([OLD]));
    expect(recovered?.body).toBe(JSON.stringify(OLD));
    expect(recovered?.fetchedAt).toBeGreaterThan(Date.now() - 1000);
  });

  it("drops the fetch time of an entry from before retryAt existed, so a failed refresh answers 503 at once", async () => {
    await runInDurableObject(stub(), (_, state) => state.storage.put("release", { body: RELEASE_BODY, fetchedAt: Date.now() }));
    const served = await lookup(fail);
    expect(served?.body).toBe(RELEASE_BODY);
    expect(served?.fetchedAt).toBe(0);
    expect((await storedRelease())?.fetchedAt).toBe(0);
  });

  it("writes the outcome to the upstream dataset as one point, with no client data", async () => {
    const written = await runInDurableObject(stub(), async (instance) => {
      const binding = (instance as unknown as { env: Cloudflare.Env }).env.UPSTREAM_CHECKS;
      const spy = vi.spyOn(binding, "writeDataPoint");
      try {
        await instance.latest(async () => new Response("limit", { status: 429 }));
        return [...spy.mock.calls];
      } finally {
        spy.mockRestore();
      }
    });
    expect(written).toEqual([[{ blobs: ["429"], doubles: [1] }]]);
  });
});

describe("GET /v1/releases/latest", () => {
  it("answers with the cached release as JSON, for anyone", async () => {
    await primeCache(RELEASE_BODY);
    const res = await latest();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await res.text()).toBe(RELEASE_BODY);
  });

  it("answers 502 when the release can't be had", async () => {
    const down = {
      RELEASE_CHECKS: testEnv.RELEASE_CHECKS,
      API_STATE: { getByName: () => ({ identify: async () => "x", latest: async () => null }) },
    } as unknown as Cloudflare.Env;
    const res = await run(new Request(`${BASE}/v1/releases/latest`), down);
    expect(res.status).toBe(502);
  });

  it("says how long ago GitHub last answered with the copy, in seconds", async () => {
    await primeCache(RELEASE_BODY, Date.now() - 120_000);
    const res = await latest();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(RELEASE_BODY);
    const age = Number(res.headers.get("X-Sonor-Release-Age"));
    expect(age).toBeGreaterThanOrEqual(120);
    expect(age).toBeLessThan(125);
  });

  it("keeps serving a copy up to an hour old, with its age", async () => {
    await primeCache(RELEASE_BODY, Date.now() - (MAX_STALE_AGE_MS - 60_000));
    const res = await latest();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(RELEASE_BODY);
    expect(Number(res.headers.get("X-Sonor-Release-Age"))).toBeGreaterThanOrEqual(3540);
  });

  it("answers 503 with Retry-After and a JSON error once the copy is older than an hour", async () => {
    await primeCache(RELEASE_BODY, Date.now() - MAX_STALE_AGE_MS - 1000);
    const res = await latest();
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(Number(res.headers.get("X-Sonor-Release-Age"))).toBeGreaterThan(3600);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "Release too old to serve" });
    expect(text).not.toContain("Sonor");
  });

  it("answers HEAD with the 503 and its headers, without a body", async () => {
    await primeCache(RELEASE_BODY, Date.now() - MAX_STALE_AGE_MS - 1000);
    const res = await request("/v1/releases/latest", { method: "HEAD" });
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(await res.text()).toBe("");
    expect(points).toHaveLength(0);
  });
});

describe("the check's fields as headers", () => {
  beforeEach(() => primeCache(RELEASE_BODY));

  it("records the version, commit, OS, arch, platform, lang and expiry, and one check", async () => {
    await latest();
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual({
      indexes: [expect.stringMatching(/^[0-9a-f]{64}$/)],
      blobs: ["1.0.0-beta.3", "abc1234", "linux", "x86_64", "desktop", "en", "2027-02-16"],
      doubles: [1],
    });
  });

  it("records 'unknown' for an absent commit, and '' for absent lang and expiry", async () => {
    const { "X-Sonor-Commit": _c, "X-Sonor-Lang": _l, "X-Sonor-Expires": _e, ...mandatory } = checkHeaders;
    await latest(mandatory);
    expect(points[0].blobs).toEqual(["1.0.0-beta.3", "unknown", "linux", "x86_64", "desktop", "", ""]);
  });

  it("records a valid release version without a beta suffix", async () => {
    await latest({ ...checkHeaders, "X-Sonor-Version": "1.2.3" });
    expect(points[0].blobs?.[0]).toBe("1.2.3");
  });

  it("answers the same, and records nothing, without any X-Sonor headers", async () => {
    const withHeaders = await latest();
    const bare = await latest({ "CF-Connecting-IP": IP, "User-Agent": "curl/8" });
    expect(points).toHaveLength(1);
    expect(bare.status).toBe(withHeaders.status);
    expect(await bare.text()).toBe(await withHeaders.text());
    expect(bare.headers.get("Content-Type")).toBe(withHeaders.headers.get("Content-Type"));
  });

  it.each(["0.0.0-test", "dev", "1.0.0-beta", "v1.0.0", "1.0.0-beta.3-dev", "1.0.0 beta"])(
    "records nothing for the version %j, and answers normally",
    async (version) => {
      const res = await latest({ ...checkHeaders, "X-Sonor-Version": version });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(RELEASE_BODY);
      expect(points).toHaveLength(0);
    },
  );

  it.each(["OS", "Arch", "Platform"])("records nothing when X-Sonor-%s is missing", async (name) => {
    const rest: Record<string, string> = { ...checkHeaders };
    delete rest[`X-Sonor-${name}`];
    const res = await latest(rest);
    expect(res.status).toBe(200);
    expect(points).toHaveLength(0);
  });

  it("clamps each value to [A-Za-z0-9._:+-] and 40 characters", async () => {
    await latest({
      ...checkHeaders,
      "X-Sonor-Version": "1.0.0 /",
      "X-Sonor-Commit": "1.2 3/x<>" + "a".repeat(50),
      "X-Sonor-OS": "<script>",
      "X-Sonor-Lang": "pt BR/x",
      "X-Sonor-Expires": "2027:02+16",
    });
    expect(points[0].blobs?.[0]).toBe("1.0.0");
    expect(points[0].blobs?.[1]).toBe(("1.23x" + "a".repeat(50)).slice(0, 40));
    expect(points[0].blobs?.[2]).toBe("script");
    expect(points[0].blobs?.[5]).toBe("ptBRx");
    expect(points[0].blobs?.[6]).toBe("2027:02+16");
  });

  it("never records the IP, the User-Agent or other headers", async () => {
    await latest({ ...checkHeaders, "User-Agent": "SecretAgent/1.0", "X-Forwarded-For": "198.51.100.9" });
    const recorded = JSON.stringify(points);
    expect(recorded).not.toContain(IP);
    expect(recorded).not.toContain("SecretAgent");
    expect(recorded).not.toContain("198.51.100.9");
  });

  it("answers before the check is recorded, so recording never delays the response", async () => {
    const slow = {
      ...testEnv,
      API_STATE: {
        getByName: () => ({
          identify: () => new Promise<string>((resolve) => setTimeout(() => resolve("hash"), 50)),
          latest: async () => ({ body: RELEASE_BODY, fetchedAt: Date.now() }),
        }),
      },
    } as unknown as Cloudflare.Env;
    const ctx = createExecutionContext();
    const res = await worker.fetch(new Request(`${BASE}/v1/releases/latest`, { headers: checkHeaders }), slow, ctx);
    expect(res.status).toBe(200);
    expect(points).toHaveLength(0);
    await waitOnExecutionContext(ctx);
    expect(points).toHaveLength(1);
  });

  it("still answers when the data point can't be written", async () => {
    const broken = { ...testEnv, RELEASE_CHECKS: { writeDataPoint: () => { throw new Error("binding down"); } } } as Cloudflare.Env;
    const res = await run(new Request(`${BASE}/v1/releases/latest`, { headers: checkHeaders }), broken);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(RELEASE_BODY);
  });

  it("still answers when the salt can't be read", async () => {
    const broken = {
      ...testEnv,
      API_STATE: { getByName: () => ({ identify: async () => { throw new Error("do down"); }, latest: async () => ({ body: RELEASE_BODY, fetchedAt: Date.now() }) }) },
    } as unknown as Cloudflare.Env;
    const res = await run(new Request(`${BASE}/v1/releases/latest`, { headers: checkHeaders }), broken);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(RELEASE_BODY);
  });
});

describe("monthly salt", () => {
  beforeEach(() => primeCache(RELEASE_BODY));
  afterEach(() => vi.useRealTimers());

  // Moves the Worker's clock; only Date is faked, so the Durable Object's timers keep running.
  const at = (iso: string) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(iso));
  };
  const storedSalt = () => runInDurableObject(stub(), (_, state) => state.storage.get<{ month: string; value: string }>("salt"));

  it("gives the same IP the same hash in one month, and different IPs different hashes", async () => {
    await latest();
    await latest();
    await latest({ ...checkHeaders, "CF-Connecting-IP": "198.51.100.1" });
    expect(points[0].indexes).toEqual(points[1].indexes);
    expect(points[0].indexes?.[0]).not.toEqual(points[2].indexes?.[0]);
  });

  it("keeps the same salt across two days in one month, so a user links within the month", async () => {
    at("2026-03-05T12:00:00Z");
    await latest();
    const salt = await storedSalt();

    at("2026-03-20T08:00:00Z");
    await latest();
    expect(points[1].indexes).toEqual(points[0].indexes);
    expect(await storedSalt()).toEqual(salt);
  });

  it("rotates the salt on a new month and deletes the old one", async () => {
    at("2026-03-31T23:00:00Z");
    await latest();
    const oldHash = points[0].indexes?.[0];
    const oldSalt = (await storedSalt())?.value;

    at("2026-04-01T00:00:05Z");
    await latest();
    expect(points[1].indexes?.[0]).not.toEqual(oldHash);

    const salt = await storedSalt();
    expect(salt?.month).toBe("2026-04");
    expect(salt?.value).not.toBe(oldSalt);
    const stored = await runInDurableObject(stub(), (_, state) => state.storage.list());
    expect(JSON.stringify([...stored.entries()])).not.toContain(oldSalt);
  });

  it("sets the alarm for the next UTC month start", async () => {
    // A far-future December: workerd drops an alarm set in the past, and it pins the year rollover.
    at("2099-12-15T10:00:00Z");
    await latest();
    expect(await runInDurableObject(stub(), (_, state) => state.storage.getAlarm())).toBe(Date.UTC(2100, 0, 1));
  });

  it("drops the salt at the next month start, even without traffic", async () => {
    await latest();
    const now = new Date();
    const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    expect(await runInDurableObject(stub(), (_, state) => state.storage.getAlarm())).toBe(nextMonth);

    // The alarm runs after the month starts, so the stored salt is last month's by then.
    await runInDurableObject(stub(), (_, state) => state.storage.put("salt", { month: "1999-01", value: "old" }));
    expect(await runDurableObjectAlarm(stub())).toBe(true);
    expect(await storedSalt()).toBeUndefined();
  });

  it("keeps this month's salt when the alarm lands after a request already started the month", async () => {
    await latest();
    const salt = await storedSalt();

    expect(await runDurableObjectAlarm(stub())).toBe(true);
    expect(await storedSalt()).toEqual(salt);
  });

  it("never stores the raw IP", async () => {
    await latest();
    const stored = await runInDurableObject(stub(), (_, state) => state.storage.list());
    expect(JSON.stringify([...stored.entries()])).not.toContain(IP);
  });
});

describe("other requests", () => {
  beforeEach(() => primeCache(RELEASE_BODY));

  it("answers HEAD like GET, without a body and without recording a check", async () => {
    const res = await request("/v1/releases/latest", { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(await res.text()).toBe("");
    expect(points).toHaveLength(0);
  });

  it("answers OPTIONS with 204 and the CORS headers, without recording a check", async () => {
    const res = await request("/v1/releases/latest", { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("Allow")).toBe("GET, HEAD");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("X-Sonor-Platform");
    expect(points).toHaveLength(0);
  });

  it("rejects other methods on the release endpoint", async () => {
    const res = await request("/v1/releases/latest", { method: "POST" });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, HEAD");
    expect(points).toHaveLength(0);
  });

  it("answers the health check with ok, without recording a check", async () => {
    const res = await request("/v1/health");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect((await request("/v1/health", { method: "HEAD" })).status).toBe(200);
    expect((await request("/v1/health", { method: "POST" })).status).toBe(405);
    expect(points).toHaveLength(0);
  });

  it("serves the Cast receiver skin with its images", async () => {
    const css = await request("/cast/receiver.css");
    expect(css.status).toBe(200);
    expect(css.headers.get("Content-Type")).toBe("text/css; charset=utf-8");
    expect(css.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(css.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(await css.text()).toContain("url('splash.png')");
    for (const name of ["background", "splash", "logo", "watermark"]) {
      const res = await request(`/cast/${name}.png`);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      const bytes = new Uint8Array(await res.arrayBuffer());
      expect([...bytes.slice(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
    }
    const head = await request("/cast/receiver.css", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("Content-Type")).toBe("text/css; charset=utf-8");
    expect(await head.text()).toBe("");
    expect((await request("/cast/receiver.css", { method: "POST" })).status).toBe(405);
    expect(points).toHaveLength(0);
  });

  it("404s unknown Cast paths", async () => {
    for (const path of ["/cast", "/cast/", "/cast/nope.png", "/cast/receiver.css/x", "/cast/preview.html"]) {
      expect((await request(path)).status).toBe(404);
    }
  });

  it("404s everything else", async () => {
    expect((await request("/")).status).toBe(404);
    expect((await request("/v2/releases/latest")).status).toBe(404);
    expect((await request("/v1/releases")).status).toBe(404);
    expect(points).toHaveLength(0);
  });
});
