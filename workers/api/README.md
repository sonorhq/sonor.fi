# API Worker

`sonor-api` serves `api.sonor.fi`, the API the Sonor apps call. Today it answers the update check: it serves the newest
release of [sonorhq/sonor](https://github.com/sonorhq/sonor) as GitHub's JSON, caches it for five minutes, and counts
checks anonymously, without keeping who made them once the month's salt is gone (see the honest limit below).
A copy GitHub stops answering for is served for up to an hour, then not at all, so the apps ask GitHub themselves.

## Endpoints

`GET /v1/releases/latest`, with the check's fields as request headers. A header the app has nothing for isn't sent.

| Header | Value |
| --- | --- |
| `X-Sonor-Version` | the app's version, e.g. `1.0.0-beta.3` |
| `X-Sonor-Commit` | the build's commit |
| `X-Sonor-OS` | the operating system |
| `X-Sonor-Arch` | the CPU architecture |
| `X-Sonor-Platform` | `desktop`, `android` or `ios` |
| `X-Sonor-Lang` | the app's UI language setting, when there is one |
| `X-Sonor-Expires` | the beta's expiry date, when there is one |

Each value keeps only `[A-Za-z0-9._:+-]` characters, is cut to 40. An empty `X-Sonor-Commit` records `unknown`, an empty `X-Sonor-Lang` or `X-Sonor-Expires` records `""`.

- `200` with the release as `application/json`. The release is the newest non-draft one, pre-releases included, by publish date.
- `503` with `Retry-After: 60` and a JSON error when the copy is more than an hour old, counted from GitHub's last good answer. The apps fall back to GitHub directly, which corrects a stale copy.
- `502` when GitHub fails and nothing is cached. The apps fall back to GitHub directly, so this is never fatal for them.
- `X-Sonor-Release-Age` on the `200` and `503`: seconds since GitHub last answered with the release. A failed refresh doesn't reset it.
- `HEAD` answers like `GET` without a body and without counting. `OPTIONS` gets `204` with the CORS headers. Other methods get `405`, other paths `404`.
- With `X-Sonor-Platform: ios` the check is counted as usual, but the answer is never the GitHub release: it's the latest iOS build published with `PUT /v1/ios/latest` (below), as `{"tag_name":"v<version>","name":"Sonor <version>","html_url":<the store link>,"published_at":<when published>,"assets":[]}`. `404` with `{"error":"no iOS build"}` until one is published. iOS never falls back to GitHub.
- Every answer on this endpoint carries `Vary: X-Sonor-Platform`.

`PUT /v1/ios/latest` publishes the iOS build the release endpoint announces. It's the TestFlight step's call, not the apps': the body is `{"version":"0.1.0-beta.N"}` (the same format as the app's version) and `Authorization: Bearer <token>` must match the `IOS_PUBLISH_TOKEN` secret, compared in constant time. A missing or wrong token gets a bare `401`, and with no secret set every token is refused. A version lower than the published one gets `409`; `"force": true` publishes it anyway. A valid publish answers `200` with the stored `{version, published_at}`, and `400` for a bad body. It stores the build under the `ios:testflight` key of the `ApiState` Durable Object (an App Store channel can follow under `ios:appstore`). It writes no data point, isn't in CORS, and never logs or echoes the token.

```sh
pnpm exec wrangler secret put IOS_PUBLISH_TOKEN
```

The store link the answer carries is `IOS_STORE_URL` in `wrangler.jsonc`'s `vars`; it's still the `REPLACE_ME` placeholder until the TestFlight code is set there.

`GET /cast/receiver.css` (and the images it references, `/cast/background.png`, `splash.png`, `logo.png`, `watermark.png`) is Sonor's skin for the Google Cast Styled Media Receiver; its Skin URL in the Cast console is `https://api.sonor.fi/cast/receiver.css`. The files live in `public/cast/` and are served by the Worker with `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=3600`. Nothing is recorded. Other `/cast/` paths get `404`.

`GET /cast/receiver/` (production) and `/cast/receiver-next/` (the same build, for trying changes) serve Sonor's Custom Web Receiver app: `index.html` at the directory, plus `main.js` and `main.css`, and nothing else; every other path under them is `404`. The app is built from [`cast-receiver/`](../../cast-receiver) and copied into `public/cast/` (git-ignored) by `scripts/copy-receiver.mjs`, which `pnpm --filter sonor-api build`, `test` and `deploy` run. The page is always `no-cache`; `main.js` and `main.css` are `public, max-age=300` on `receiver` and `no-cache` on `receiver-next`. Only `receiver-next`'s page carries a `Content-Security-Policy` (`src/receiver-csp.json`, checked against the emulator run); production gets it once tried on a real device. Nothing is recorded.

`GET /v1/health` answers `200` with `ok`, without counting. It's for uptime checks.

## What is recorded

One Analytics Engine data point per `GET /v1/releases/latest` that is a real app check (dataset `sonor_release_checks`). It's written after the response is sent, so recording never delays the check.

A request counts only when `X-Sonor-Version` is a release version (`1.2.3` or `1.2.3-beta.4`) and `X-Sonor-OS`, `X-Sonor-Arch` and `X-Sonor-Platform` are all present. Crawlers, curl and dev builds get the same response but aren't recorded.

A request counts only when `X-Sonor-Version` is a release version (`1.2.3` or `1.2.3-beta.4`) and `X-Sonor-OS`, `X-Sonor-Arch` and `X-Sonor-Platform` are all present. Crawlers, curl and dev builds get the same response but aren't recorded.

| Field | Value |
| --- | --- |
| `index1` | hex SHA-256 of (the month's salt + the client IP) |
| `blob1`–`blob5` | `version`, `commit`, `os`, `arch`, `platform` (clamped as above) |
| `blob6` | the UI language, `""` when not sent |
| `blob7` | the beta's expiry date, `""` when not sent |
| `double1` | `1` |

Analytics Engine stamps each point with the time it was written, to the second. The Worker doesn't store a date of its own.

Each time the Worker asks GitHub, it also writes one point to `sonor_upstream_checks` (binding `UPSTREAM_CHECKS`). `blob1` is what GitHub answered: `200`, `403`, `429`, `other` (any other HTTP status, or a `200` with no published release), `timeout`, or `error` (a network error, or a body that isn't JSON). `double1` is `1`. It holds no client data, and it counts refreshes, not checks, so a stale spell shows up as a run of `403`, `429` or `timeout` points.

The salt is 32 random bytes, created on the first request of each UTC month and held in the `ApiState` Durable Object.
The first request of a new month overwrites last month's salt, and an alarm set for the next UTC month start (00:00 UTC on the 1st) deletes it even without traffic.
So the code never keeps a salt past its month, and hashes from different months can't be linked.

**Honest limit:** while a month's salt exists, whoever can read this Worker's storage (the account owner, and anyone with access to the account) could read the salt. With the salt, they could hash all 2^32 IPv4 addresses against the stored `index1` values in minutes, so during the month the hashes are only pseudonymous.
The "without keeping who made them" claim holds once the salt is deleted, not before.
Even after deletion, SQLite-backed Durable Objects keep about 30 days of point-in-time recovery, so the account owner could restore a deleted salt from there.
The deletion is what the code does, not an unrecoverable erase.

**Not recorded:** this Worker doesn't record the IP itself, any header other than the `X-Sonor-*` ones above (the User-Agent and `X-Forwarded-For` included), the path, or request logs.
Observability is disabled in `wrangler.jsonc`, and the code never logs requests, headers, IPs or the salt.
Cloudflare itself still sees each request's IP for its own edge analytics and security events, and `wrangler tail` streams live request metadata while it runs. Neither is kept by this code.

## Querying the counts

`scripts/stats.sh` (run from `workers/api`) reads the dataset through the Analytics Engine SQL API. It needs `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in the environment, plus `curl`, and `jq` for the table.
The token must be an API token with **Account Analytics: Read** on the account. The account owner creates it in the Cloudflare dashboard, and it's only ever exported in the shell, never written to a file:

```sh
export CLOUDFLARE_ACCOUNT_ID=...      # from the dashboard's account overview
export CLOUDFLARE_API_TOKEN=...       # Account Analytics: Read
scripts/stats.sh daily 14
```

| Command | Prints |
| --- | --- |
| `daily [days]` | checks per day |
| `os [days]` | checks and unique users per operating system |
| `versions [days]` | checks and unique users per app version |
| `platforms [days]` | checks and unique users per platform (`desktop`, `android`, `ios`) |
| `users [YYYY-MM]` | unique users and checks in one UTC month (default: this month) |

`days` defaults to 30. `--json` prints the raw API response instead of the table, and `--dry-run` prints the SQL without calling the API (no token needed).

Checks are summed with `_sample_interval`, so they stay correct if sampling is ever on. Users are distinct `index1` hashes.
The hashes are per month: the same person gets a different hash every UTC month, so they're only comparable inside one month. `users` counts one month, and the `os`, `versions` and `platforms` columns for a window that crosses a month boundary count a person once per month they appear in. Read them as approximate for such windows.

## Optional GitHub token

Without a token, GitHub allows 60 unauthenticated requests an hour per IP. The five-minute cache keeps this Worker far below that, but a token raises the limit.
To set one, create a fine-grained personal access token with no permissions beyond reading public repositories (the default for public repositories), then:

```sh
pnpm exec wrangler secret put GITHUB_TOKEN
```

The Worker sends it as `Authorization: Bearer` when it's set, and sends no authorization when it isn't. The token is never logged.

Without the token the endpoint goes stale: the Cloudflare IPs the Worker shares can use up GitHub's 60 an hour, GitHub then answers `403` or `429`, and the copy stops being served an hour after GitHub last answered (`503`).

## Layout

- `src/index.ts`: routing, header clamping, the data point (recorded through `waitUntil`).
- `src/state.ts`: the `ApiState` Durable Object (SQLite): the monthly salt, the cached release, the optional GitHub token.
- `wrangler.jsonc`: the route (`api.sonor.fi`, no `workers.dev` URL), bindings (`API_STATE`, `RELEASE_CHECKS`, `UPSTREAM_CHECKS`), the SQLite migration, observability off.
- `scripts/stats.sh`: prints the release check counts from the Analytics Engine dataset (see "Querying the counts").
- `test/api.test.ts`: the tests, run inside workerd with `@cloudflare/vitest-plugin`. GitHub is stubbed, so they need no network.

## Local development

From the repo root (`pnpm install` once):

```sh
pnpm -r test                        # vitest in workerd
pnpm -r typecheck                   # tsc
pnpm --filter sonor-api dev         # wrangler dev on localhost:8787, local bindings only
curl localhost:8787/v1/health       # ok
```

`wrangler dev` runs against local bindings. It doesn't create anything on Cloudflare, and it fetches the release from GitHub when the cache is empty.

## First deploy (by hand, once)

The Durable Object namespace comes from the migration, so the first deploy is by hand, before CI runs. Run these as the account owner:

```sh
pnpm install
pnpm exec wrangler login            # or export CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
pnpm --filter sonor-api exec wrangler deploy
```

- The website is a separate Worker with static assets (`site/wrangler.jsonc`, the successor of Pages); `wrangler deploy` in `site/` creates it and its `sonor.fi` and `www.sonor.fi` custom domains. Its Worker (`site/src/index.ts`) redirects http to https and www to the apex, and adds HSTS and the other security headers to the page.
- The Worker deploy creates the Durable Object namespace, the `api.sonor.fi` DNS record and certificate. The zone `sonor.fi` must be on this Cloudflare account.
- The Analytics Engine dataset is created on the first write, so it needs no setup.

## CI deploy

`.github/workflows/deploy.yml` deploys on every push to `main` and by hand from the Actions tab. It runs inside the protected `production` environment, and the Cloudflare secrets are passed only to its two deploy steps.

Set up the environment once, in the repository's Settings:

1. Settings → Environments → New environment, named `production`.
2. Deployment branches and tags: "Selected branches and tags", then add the rule `main`. This stops other branches from reaching the secrets.
3. Optional: Required reviewers, to approve each deploy by hand.
4. Environment secrets (not repository secrets): add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

The token: create one from the "Edit Cloudflare Workers" template, scoped to the one account, and add Cloudflare Pages edit for the website deploy.

The workflow runs the tests, then `wrangler deploy` for this Worker, then `wrangler deploy` in `site/` for the website. The API deploy runs only when the repo variable `DEPLOY_API` is `true`.
Pull requests run `typecheck`, `test` and the site check in `.github/workflows/ci.yml`, without secrets.
