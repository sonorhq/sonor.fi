# sonor.fi

The public side of [Sonor](https://github.com/sonorhq/sonor), a music player for Subsonic, Navidrome, Jellyfin and Emby servers.

- `site/`: the website for sonor.fi, a Vike (React) app server-rendered on the `sonor-fi` Worker. The pages are in `site/pages/`, the static files in `site/public/`. `site/src/edge.ts` redirects http to https and www to the apex, and adds the security headers, before Vike renders. The latest release (betas included) is read from the GitHub API and cached for ten minutes; the download choice follows the visitor's OS.
- `workers/api/`: the API Worker for api.sonor.fi (`sonor-api`). Today it answers the app's update check.
- `cast-receiver/`: the Cast Custom Web Receiver app (TypeScript, Vite), its protocol spec and tests; the API Worker serves its build at `/cast/receiver/`.

This repo is public so the API's data handling can be audited: read [`workers/api/README.md`](workers/api/README.md) for what is recorded and what isn't, and [`workers/api/src`](workers/api/src) for the code that does it.
Public CI runs here for free, and the Cloudflare secrets only reach the protected `production` environment on `main`.

## Issues

Open issues here only for the public website and the public API. For the app itself, and anything else about Sonor, use [sonorhq/sonor](https://github.com/sonorhq/sonor).

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

- The site is dark only, on the brand's tinted dark tile (`#291006` and darker steps), with paper type (`#f6f4f1`) and Sonor orange (`#f4743b`) for the primary action and the live tab. The colours are the variables at the top of `site/src/styles.css`, in step with the kit's `tokens/brand.css`; `site/src/brand.ts` holds the browser theme colour. Keep them in step with the kit.
- The logo is the kit's Onada mark (five equal pill bars on a wave, round ends) with the lower-case `sonor` wordmark. `site/src/components/Logo.tsx` is the one place it is drawn, inline so the hero bars can wave (`site/src/wave.css`, from the kit's animated mark; static under `prefers-reduced-motion`); the wordmark path is `site/src/components/wordmark.ts`. `site/public/brand/` keeps the kit's static lockup and mark, and the favicons and the social card (`sonor-social-1200x630.png`) are the kit's `favicon/` and `og/` files.
- Features: `site/src/features.ts` holds the copy of the core features, the discovery features (with a `needs` note for a feature only one provider gives) and the coming list. Each claim must match the app today; `site/src/components/Features.tsx` renders them. An entry's picture shows only when its `ready` flag is true, like the screenshots. A picture can have a `phone` shot beside it, with its own alt and `ready` flag.
- Downloads: the primary button and the tab pre-selection follow the visitor's OS (from the request, then the browser). `?os=windows` (or macos, linux, android, ios) picks a platform for testing.
- Screenshots: `site/src/screenshots.ts` is the one data file. Each entry is a desktop shot from the app (dark only); an entry shows when `ready` is true. A phone shot goes beside the desktop one when its `phone` entry (`{ src, alt, ready }`) is ready. The desktop files live in `site/public/screenshots/` (1600 × 1005 WebP), the phone files in `site/public/screenshots/phone/` (900 × 1950, 9:19.5, WebP). Keep each file under about 400 KB.
- Phone shots from an iPhone PNG: `scripts/phone-shot.sh <input.png> [name]` writes `site/public/screenshots/phone/<name>.webp` at 900 × 1950 (quality 82). It needs ImageMagick 7 (`magick`) with WebP support and an sRGB ICC profile. iPhone screenshots are Display P3, so the script converts them to sRGB with that profile before it strips the metadata; without the conversion the colours come out washed out. The profile is found in the usual system locations, or set `SRGB_ICC` to a file. A 9:19.5 image (such as a 1179 × 2556 PNG) is scaled to cover 900 × 1950, and the centre is kept. Then set the entry's `phone` and flip its `ready` flag.
- Sitemap and indexing: `site/dist/client/sitemap.xml` is generated at build from `site/pages/`, with each `lastmod` taken from git history. After a deploy CI pings IndexNow; its key is the file `site/public/<key>.txt` and the constant in `site/src/indexnow.ts`. Files under `/assets/` are served as immutable.

## Licence

The source code is under the MIT licence ([`LICENSE`](LICENSE)): the website, the API Worker and the Cast receiver with its protocol spec.

The Sonor name and logo, the screenshots and the website's text are not: all rights reserved, as listed in [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md). The Sonor app itself is proprietary and is not in this repository.
