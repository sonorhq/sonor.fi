// The sitemap's rules, kept free of node imports so the Worker bundle and the build can both use them.
// Pages are found from the folders (Vike's filesystem routing); a page that sets `route` in its config
// would need an entry by hand.

export const SITE = "https://sonor.fi";

// `pages/privacy/+Page.tsx` is `/privacy`; folders starting with `_` (such as `_error`) are not public pages.
export function routeOf(file: string): string | null {
  const match = /^pages\/(.+)\/\+Page\.tsx$/.exec(file);
  if (!match) return null;
  const segments = match[1].split("/");
  if (segments.some((segment) => segment.startsWith("_"))) return null;
  return "/" + segments.filter((segment) => segment !== "index").join("/");
}

export function sitemapXml(entries: { path: string; lastmod: string }[]): string {
  const urls = [...entries]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(({ path, lastmod }) => `  <url>\n    <loc>${SITE}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>\n`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`;
}
