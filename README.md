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

`pnpm --filter sonor-api dev` runs the API Worker locally with `wrangler dev`. For the website, `pnpm --filter sonor-site dev` runs Vike's dev server, and `pnpm --filter sonor-site preview` builds and serves the Worker the way it deploys. Both serve `http://localhost` directly; the http-to-https redirect applies to the public host only.

The website's build writes `site/dist/`, which `wrangler deploy` reads; run `pnpm --filter sonor-site build` before deploying by hand.

## Website: design, brand and screenshots

- The site is dark only, in the Hi-Fi palette from the brand kit (espresso and walnut, cream type, orange for the primary action and the live tab). The colours are the variables at the top of `site/src/styles.css`, which match the kit's `tokens/brand.css`; `site/src/brand.ts` holds the browser theme colour. Keep them in step with the kit.
- The hero is the kit's stacked lockup, `site/public/brand/lockup-stacked.svg`, which is the kit's file with the mark's spin rule added so the record turns (it stops under `prefers-reduced-motion`). The footer shows `site/public/brand/mark.svg`. `site/src/components/Logo.tsx` is the one place that uses them.
- Downloads: the primary button and the tab pre-selection follow the visitor's OS (from the request, then the browser). `?os=windows` (or macos, linux, android, ios) picks a platform for testing.
- Screenshots: `site/src/screenshots.ts` is the one data file. The page's pair shows its first entry. To add the pair, put two files in `site/public/screenshots/` (below), then set `ready: true` and write the entry's `alt` text. Until then the page shows a silhouette of the player.
  - `<id>-desktop.png`: 16:10, 1600 × 1000 px.
  - `<id>-phone.png`: 9:19.5, 900 × 1950 px.
  - The ids are `library`, `now-playing` and `car`. Keep each file under about 400 KB.

## Licence

Not chosen yet.
