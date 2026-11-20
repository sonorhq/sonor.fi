# sonor.fi

The public side of [Sonor](https://github.com/sonorhq/sonor), a music player for Subsonic and Navidrome servers.

- `site/`: the website for sonor.fi, a Vike (React) app server-rendered on the `sonor-fi` Worker. The pages are in `site/pages/`, the static files in `site/public/`. `site/src/edge.ts` redirects http to https and www to the apex, and adds the security headers, before Vike renders. The latest release (betas included) is read from the GitHub API and cached for ten minutes; the download choice follows the visitor's OS.
- `workers/api/`: the API Worker for api.sonor.fi (`sonor-api`). Today it answers the app's update check.

This repo is public so the API's data handling can be audited: read [`workers/api/README.md`](workers/api/README.md) for what is recorded and what isn't, and [`workers/api/src`](workers/api/src) for the code that does it.
Public CI runs here for free, and the Cloudflare secrets only reach the protected `production` environment on `main`.

## Issues

Open issues here only for the public website and the public API. The app itself, and everything else about Sonor, lives in [sonorhq/sonor-src](https://github.com/sonorhq/sonor-src).

## Development

Requires Node 22.12 or newer and pnpm (the version in `package.json`).

```sh
pnpm install
pnpm -r typecheck
pnpm -r test
pnpm -r build
```

`pnpm --filter sonor-api dev` runs the API Worker locally with `wrangler dev`. For the website, `pnpm --filter sonor-site dev` runs Vike's dev server, and `pnpm --filter sonor-site preview` builds and serves the Worker the way it deploys. The Worker redirects plain http to https, so a browser on `http://localhost` is sent to `https://localhost`; test the pages with an `https://sonor.fi` request target, as `curl --request-target` allows.

The website's build writes `site/dist/`, which `wrangler deploy` reads; run `pnpm --filter sonor-site build` before deploying by hand.

## Licence

Not chosen yet.
