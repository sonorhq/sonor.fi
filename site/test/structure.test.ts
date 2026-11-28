import { renderPage } from "vike/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The pages below fetch GitHub releases; stubbed so the suite never calls the network.
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** Renders a page the way the Worker does. */
async function render(url: string) {
  const { httpResponse } = await renderPage({ urlOriginal: `https://sonor.fi${url}`, headersOriginal: {} });
  if (!httpResponse) throw new Error(`no response for ${url}`);
  return (await httpResponse.getBody()) as string;
}

describe("the home page structure", () => {
  it("has the three sections the header links to, inside the main landmark", async () => {
    const html = await render("/");
    expect(html).toContain('id="features"');
    expect(html).toContain('id="discovery"');
    expect(html).toContain('id="download"');
    expect(html).toContain('<main id="main">');
    expect(html).not.toContain('id="see"');
    expect(html).not.toContain("scroll-cue");
  });

  it("has the heading order, one h1 and no skipped level", async () => {
    const html = await render("/");
    const levels = [...html.matchAll(/<h([1-6])/g)].map((match) => Number(match[1]));
    expect(levels[0]).toBe(1);
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i], `heading ${i}`).toBeLessThanOrEqual(levels[i - 1] + 1);
    }
  });

  it("puts the flagship rows first, then the features grid, then discovery", async () => {
    const html = await render("/");
    // Two flagship rows alternate: the first is flipped, the second is not.
    expect(html.match(/class="split flip"/g)).toHaveLength(1);
    const offline = html.indexOf("<h3>Offline downloads</h3>");
    const gapless = html.indexOf("<h3>Gapless playback</h3>");
    const discover = html.indexOf("<h2>Discover new music</h2>");
    expect(offline).toBeGreaterThan(-1);
    expect(offline).toBeLessThan(gapless);
    expect(gapless).toBeLessThan(discover);
  });

  it("shows the family feature as a text band, with its provider note", async () => {
    const html = await render("/");
    expect(html).toMatch(/class="band text-band">[\s\S]*?Family requests[\s\S]*?Needs Octo/);
  });

  it("makes the feature cards' swipe row a keyboard stop, named as a region", async () => {
    const html = await render("/");
    expect(html).toMatch(/<div class="card-scroller"[^>]*tabindex="0"[^>]*role="region"[^>]*aria-label="More features"/);
  });

  it("opens the hero picture first, eagerly and with a high fetch priority", async () => {
    const html = await render("/");
    const tag = html.match(/<img[^>]*src="\/screenshots\/desktop-home\.webp"[^>]*>/)![0];
    // React writes the prop as fetchPriority; HTML attribute names are case-insensitive.
    expect(tag).toMatch(/fetchpriority="high"/i);
    expect(tag).toContain('width="1600"');
    expect(tag).toContain('height="1005"');
    expect(tag).not.toContain('loading="lazy"');
    expect(html.indexOf("<img")).toBe(html.indexOf(tag));
  });

  it("spans the devices card across the grid while its picture waits", async () => {
    const html = await render("/");
    expect(html).toContain('<li class="card span-row"><h3>Play on your other devices</h3>');
    expect(html.match(/<li class="card span-row">/g)).toHaveLength(1);
  });

  it("counts the home pictures: 10 desktop and 8 phone shots, with the search phone shot", async () => {
    const html = await render("/");
    const shots = [...html.matchAll(/<img[^>]*src="(\/screenshots\/[^"]+)"/g)];
    expect(shots).toHaveLength(18);
  });
});

describe("the site header and skip link", () => {
  for (const url of ["/", "/discover", "/privacy", "/does-not-exist"]) {
    it(`has the header with the three links, the skip link first, and one lightbox on ${url}`, async () => {
      const html = await render(url);
      const nav = html.match(/<header class="site-header">[\s\S]*?<nav class="site-nav" aria-label="Main">([\s\S]*?)<\/nav>/);
      expect(nav?.[1]).toContain('href="/#features"');
      expect(nav?.[1]).toContain('href="/discover"');
      expect(nav?.[1]).toContain('href="/#download"');
      expect(html.indexOf('class="skip-link"')).toBeLessThan(html.indexOf('<header class="site-header">'));
      expect(html.indexOf('<header class="site-header">')).toBeLessThan(html.indexOf('<main id="main">'));
      expect(html.match(/<dialog class="lightbox"/g)).toHaveLength(1);
    });
  }

  it("marks the Discover link as the current page on /discover only", async () => {
    expect(await render("/discover")).toContain('aria-current="page"');
    expect(await render("/")).not.toContain('aria-current="page"');
  });
});

describe("the pictures on the home and discover pages", () => {
  for (const url of ["/", "/discover"]) {
    it(`gives every picture a size and a non-empty alt on ${url}`, async () => {
      const html = await render(url);
      for (const [tag] of html.matchAll(/<img[^>]*>/g)) {
        expect(tag, url).toMatch(/ width="\d+"/);
        expect(tag, url).toMatch(/ height="\d+"/);
        expect(tag, url).toMatch(/ alt="[^"]+"/);
      }
    });

    it(`wraps every screenshot in a link to its own file on ${url}`, async () => {
      const html = await render(url);
      const shots = [...html.matchAll(/<img[^>]*src="(\/screenshots\/[^"]+)"/g)];
      const links = [
        ...html.matchAll(/<a class="zoom[^"]*" href="([^"]+)" data-zoom=""[^>]*aria-label="Enlarge: [^"]+"[^>]*><img[^>]*src="([^"]+)"/g),
      ];
      expect(links).toHaveLength(shots.length);
      for (const link of links) {
        expect(link[1]).toBe(link[2]);
      }
    });
  }
});
