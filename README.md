# sonor.fi

The public side of [Sonor](https://github.com/sonorhq/sonor), a music player for Subsonic and Navidrome servers.

- `site/`: the website for sonor.fi. The page is in `site/public/`, deployed to Cloudflare Pages (`sonor-fi`).
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

`pnpm --filter sonor-api dev` runs the Worker locally with `wrangler dev`.

## Licence

Not chosen yet.
