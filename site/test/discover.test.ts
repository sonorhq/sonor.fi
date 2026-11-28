import { readFileSync } from "node:fs";
import { renderPage } from "vike/server";
import { describe, expect, it } from "vitest";
import config from "../pages/discover/+config";

/** Renders a page the way the Worker does. */
async function render(url: string) {
  const { httpResponse } = await renderPage({ urlOriginal: `https://sonor.fi${url}`, headersOriginal: {} });
  if (!httpResponse) throw new Error(`no response for ${url}`);
  return { status: httpResponse.statusCode, html: (await httpResponse.getBody()) as string };
}

/** The inner HTML of the page's article. */
function articleOf(html: string) {
  const match = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
  if (!match) throw new Error("no article on the page");
  return match[1];
}

describe("the music discovery page", () => {
  it("renders as an indexable page with its own title, heading, canonical and pictures", async () => {
    const { status, html } = await render("/discover");
    expect(status).toBe(200);
    expect(html).toContain("<title>Music discovery for Navidrome and self-hosted libraries · Sonor</title>");
    expect(html).toContain("<h1>Discover new music for your self-hosted library</h1>");
    expect(html).toContain('<link rel="canonical" href="https://sonor.fi/discover"/>');
    expect(html).toContain('href="https://github.com/winters27/octo"');
    expect(html).toContain('href="https://github.com/lklynet/aurral"');
    expect(html).toContain('href="/#download"');
    expect(html).toContain("/screenshots/features/discovery.webp");
    expect(html).not.toContain("noindex");
    expect(html).not.toContain("application/ld+json");
  });

  it("has exactly one h1", async () => {
    const { html } = await render("/discover");
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it("has an article of 400 to 700 words", async () => {
    const { html } = await render("/discover");
    const words = articleOf(html)
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 0);
    expect(words.length).toBeGreaterThanOrEqual(400);
    expect(words.length).toBeLessThanOrEqual(700);
  });

  it("uses no en or em dashes in the article", async () => {
    const { html } = await render("/discover");
    expect(articleOf(html)).not.toMatch(/[–—]/);
  });

  it("keeps its description within 160 characters", () => {
    expect(config.description.length).toBeLessThanOrEqual(160);
  });
});

describe("links to the discovery page", () => {
  it("links to it from the home page and the privacy page footers", async () => {
    for (const url of ["/", "/privacy"]) {
      const { html } = await render(url);
      expect(html).toContain('href="/discover"');
    }
  });
});

describe("public/llms.txt", () => {
  const llms = readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8");

  it("starts with the site name and links to the discovery page", () => {
    expect(llms.startsWith("# Sonor")).toBe(true);
    expect(llms).toContain("https://sonor.fi/discover");
  });

  it("uses no en or em dashes", () => {
    expect(llms).not.toMatch(/[–—]/);
  });
});
