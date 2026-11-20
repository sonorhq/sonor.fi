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

## Website: brand and screenshots

- Colours: the tokens at the top of `site/src/styles.css` (the Hi-Fi palette: walnut, cream, burnt orange, teal), and the theme colours in `site/src/brand.ts`. Keep the two in step. Text pairs are checked against WCAG AA in both schemes; the light-scheme link colour is a deeper orange than the button fill for that reason.
- Logo: one component, `site/src/components/Logo.tsx`, which picks `site/public/brand/lockup-light.svg` or `lockup-dark.svg` by scheme. The current files are provisional.
- Screenshots: `site/src/screenshots.ts` is the one data file. To add a shot, put its four files in `site/public/screenshots/` (below), then set `ready: true` and write its `alt` text. Until then a placeholder frame shows.
  - `<id>-desktop-light.png` and `<id>-desktop-dark.png`: 16:10, 1600 × 1000 px.
  - `<id>-phone-light.png` and `<id>-phone-dark.png`: 9:19.5, 900 × 1950 px.
  - The ids are `library`, `now-playing` and `car`. Keep each file under about 400 KB; if they are WebP, change the extension in `screenshots.ts`.

### Brand files

- The kit's files are copied into `site/public/`: `favicon.svg`, `favicon-16.png`, `favicon-32.png` and `apple-touch-icon.png` (from the kit's `favicon/`), and `brand/lockup-light.svg` and `brand/lockup-dark.svg` (from its horizontal lockups).
- TODO, waiting for the Outfit kit (the wordmark is being redone in Outfit under the same file names): copy again `lockup/sonor-horizontal-on-light.svg` and `-on-dark.svg` into `site/public/brand/` as `lockup-light.svg` and `lockup-dark.svg`, and `og/sonor-og.png` into `site/public/sonor-social-1200x630.png`. Then point `site/pages/+Head.tsx` at the new OG size (1200 × 630), delete `site/public/sonor-social-1280x640.png`, and update the `og:image` dimensions there.
- `site/src/brand.ts` and the colour tokens in `site/src/styles.css` already match the kit's `tokens/brand.css`; keep them in step if the kit changes.

## Licence

Not chosen yet.
