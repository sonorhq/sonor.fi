# API Worker

`sonor-api` serves `api.sonor.fi`, the API the Sonor apps call. Today it answers the update check: it serves the newest
release of [sonorhq/sonor](https://github.com/sonorhq/sonor) as GitHub's JSON, caches it for five minutes, and counts
checks without keeping who made them.

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

Each value keeps only `[A-Za-z0-9._:+-]` characters, is cut to 40, and becomes `unknown` when empty (`X-Sonor-Lang` and `X-Sonor-Expires`: `""`).

- `200` with the release as `application/json`. The release is the newest non-draft one, pre-releases included, by publish date.
- `502` when GitHub fails and nothing is cached. The apps fall back to GitHub directly, so this is never fatal for them.
- `HEAD` answers like `GET` without a body and without counting. `OPTIONS` gets `204` with the CORS headers. Other methods get `405`, other paths `404`.

`GET /v1/health` answers `200` with `ok`, without counting. It's for uptime checks.

## What is recorded

One Analytics Engine data point per `GET /v1/releases/latest` (dataset `sonor_release_checks`):

| Field | Value |
| --- | --- |
| `index1` | hex SHA-256 of (the month's salt + the client IP) |
| `blob1`–`blob5` | `version`, `commit`, `os`, `arch`, `platform` (clamped as above) |
| `blob6` | the UI language, `""` when not sent |
| `blob7` | the beta's expiry date, `""` when not sent |
| `blob8` | UTC date, `YYYY-MM-DD` |
| `double1` | `1` |

The salt is 32 random bytes, created on the first request of each UTC month and held in the `ApiState` Durable Object.
The first request of a new month overwrites last month's salt, and an alarm set for the next UTC month start (00:00 UTC on the 1st) deletes it even without traffic.
So the code never keeps a salt past its month, and hashes from different months can't be linked.

Honest limit: SQLite-backed Durable Objects keep about 30 days of point-in-time recovery, so the account owner could restore a deleted salt from there.
The deletion is what the code does, not an unrecoverable erase.

**Not recorded:** the IP itself, any header other than the `X-Sonor-*` ones above (the User-Agent and `X-Forwarded-For` included), the path, request logs.
Observability is disabled in `wrangler.jsonc`, and the code never logs requests, headers, IPs or the salt.

## Layout

- `src/index.ts`: routing, header clamping, the data point.
- `src/state.ts`: the `ApiState` Durable Object (SQLite): the monthly salt and the cached release.
- `wrangler.jsonc`: the route (`api.sonor.fi`), bindings (`API_STATE`, `RELEASE_CHECKS`), the SQLite migration, observability off.
- `test/api.test.ts`: the tests, run inside workerd with `@cloudflare/vitest-plugin`. GitHub is stubbed, so they need no network.

## Local development

From the repo root (`pnpm install` once):

```sh
pnpm -r test                        # vitest in workerd
pnpm -r typecheck                   # tsc
pnpm --filter sonor-api dev         # wrangler dev on localhost:8787, local bindings only
curl localhost:8787/v1/health       # ok
```

`wrangler dev` runs against local bindings. It doesn't create anything on Cloudflare, and it hits GitHub for the release.

## First deploy (by hand, once)

The Durable Object namespace comes from the migration, so the first deploy is by hand, before CI runs:

```sh
pnpm install
pnpm exec wrangler login            # or export CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
pnpm --filter sonor-api exec wrangler deploy
```

The deploy creates the Worker, its Durable Object namespace, the `api.sonor.fi` DNS record and certificate (the zone `sonor.fi` must be on this Cloudflare account).
The Analytics Engine dataset is created on the first write, so it needs no setup.

## CI deploy

`.github/workflows/deploy.yml` deploys on every push to `main` and by hand from the Actions tab. It runs inside the protected `production` environment and needs two of its secrets:

- `CLOUDFLARE_API_TOKEN`: a token that can edit Workers and Pages for the one account (the "Edit Cloudflare Workers" template, plus Cloudflare Pages edit for the website).
- `CLOUDFLARE_ACCOUNT_ID`: the account's ID.

The workflow runs the tests, then `wrangler deploy` for this Worker, then `wrangler pages deploy site --project-name sonor-fi` for the website.
Pull requests run `typecheck`, `test` and the site check in `.github/workflows/ci.yml`, without secrets.
