import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAGE_CONTENT, routeOf, SITE, sitemapXml } from "../src/sitemap";

// The built sitemap is read from dist, so these tests run after `vike build` (the test script does that).
const built = readFileSync(new URL("../dist/client/sitemap.xml", import.meta.url), "utf8");

describe("PAGE_CONTENT", () => {
  // A renamed source file would silently stop moving its page's lastmod, so each path must still exist.
  it.each(Object.entries(PAGE_CONTENT).flatMap(([route, paths]) => paths.map((path) => [route, path])))(
    "%s lists %s, which exists",
    (_route, path) => {
      expect(existsSync(new URL("../" + path, import.meta.url))).toBe(true);
    },
  );
});

describe("routeOf", () => {
  it.each([
    ["pages/index/+Page.tsx", "/"],
    ["pages/privacy/+Page.tsx", "/privacy"],
    ["pages/a/b/+Page.tsx", "/a/b"],
    ["pages/_error/+Page.tsx", null],
    ["pages/+Layout.tsx", null],
  ])("%s is %s", (file, route) => {
    expect(routeOf(file)).toBe(route);
  });
});

describe("sitemapXml", () => {
  it("writes the entries sorted by path, one url each", () => {
    expect(
      sitemapXml([
        { path: "/privacy", lastmod: "2026-11-25" },
        { path: "/", lastmod: "2026-11-24" },
      ]),
    ).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "  <url>",
        `    <loc>${SITE}/</loc>`,
        "    <lastmod>2026-11-24</lastmod>",
        "  </url>",
        "  <url>",
        `    <loc>${SITE}/privacy</loc>`,
        "    <lastmod>2026-11-25</lastmod>",
        "  </url>",
        "</urlset>",
        "",
      ].join("\n"),
    );
  });
});

describe("built sitemap", () => {
  // Every page folder in pages/ must be listed, and nothing else: a new page needs no hand edit.
  it("lists exactly the public pages found in pages/", () => {
    const expected = readdirSync(new URL("../pages", import.meta.url), { recursive: true, encoding: "utf8" })
      .map((file) => routeOf(`pages/${file.split("\\").join("/")}`))
      .filter((route) => route !== null)
      .map((route) => `${SITE}${route}`)
      .sort();
    const locs = [...built.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort();
    expect(locs).toEqual(expected);
    expect(new Set(locs).size).toBe(locs.length);
  });

  it("gives each url exactly one lastmod date", () => {
    const urls = built.split("<url>").slice(1);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const lastmods = [...url.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((match) => match[1]);
      expect(lastmods).toHaveLength(1);
      expect(lastmods[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("is no longer kept in public/, so the build is the only source", () => {
    expect(existsSync(new URL("../public/sitemap.xml", import.meta.url))).toBe(false);
  });
});
