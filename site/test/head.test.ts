import { readFileSync } from "node:fs";
import { renderPage } from "vike/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import home from "../pages/index/+config";
import { THEME_COLOR } from "../src/brand";

// One release, as the GitHub API returns it.
const RELEASE = {
  tag_name: "v0.1.0-beta.23",
  html_url: "https://github.com/sonorhq/sonor/releases/tag/v0.1.0-beta.23",
  draft: false,
  published_at: "2026-11-18T10:00:00Z",
  assets: [
    "sonor-0.1.0-beta.23-d265ff1-macos.dmg",
    "sonor-0.1.0-beta.23-d265ff1-windows-setup.exe",
    "sonor-0.1.0-beta.23-d265ff1-x86_64.AppImage",
  ].map((name) => ({
    name,
    browser_download_url: `https://github.com/sonorhq/sonor/releases/download/v0.1.0-beta.23/${name}`,
    size: 104857600,
  })),
};

/** Renders a page the way the Worker does, with GitHub answering from the fetch stub. */
async function render(url: string) {
  const { httpResponse } = await renderPage({ urlOriginal: `https://sonor.fi${url}`, headersOriginal: {} });
  if (!httpResponse) throw new Error(`no response for ${url}`);
  return { status: httpResponse.statusCode, html: (await httpResponse.getBody()) as string };
}

/** The JSON-LD block on the page, parsed. */
function jsonLdOf(html: string) {
  const start = html.indexOf('<script type="application/ld+json">');
  expect(start).toBeGreaterThanOrEqual(0);
  const from = start + '<script type="application/ld+json">'.length;
  const text = html.slice(from, html.indexOf("</script>", from));
  return JSON.parse(text) as { "@graph": { "@type": string; [key: string]: unknown }[] };
}

describe("the home page's description and title", () => {
  it("keeps the description within the 160 characters search engines show", () => {
    expect(home.description.length).toBeLessThanOrEqual(160);
  });

  it("names Navidrome in the title", () => {
    expect(home.title).toContain("Navidrome");
  });
});

describe("the structured data on the home page", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([RELEASE]), { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("describes the organisation, the website and the app", async () => {
    const { html } = await render("/");
    const { "@graph": graph } = jsonLdOf(html);
    expect(graph.map((node) => node["@type"])).toEqual(["Organization", "WebSite", "SoftwareApplication"]);
  });

  it("gives the app its free offer, the latest version and the release page", async () => {
    const { html } = await render("/");
    const app = jsonLdOf(html)["@graph"].find((node) => node["@type"] === "SoftwareApplication") as Record<string, unknown>;
    expect(app.offers).toMatchObject({ price: "0" });
    expect(app.softwareVersion).toBe("0.1.0-beta.23");
    expect(app.downloadUrl).toBe("https://github.com/sonorhq/sonor/releases/tag/v0.1.0-beta.23");
    expect(app.screenshot).toHaveLength(3);
    for (const shot of app.screenshot as string[]) {
      expect(shot.startsWith("https://sonor.fi/screenshots/")).toBe(true);
    }
  });

  it("escapes < in the JSON-LD so a tag name can't close the script element", async () => {
    const tag = "v1</script><script>x";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([{ ...RELEASE, tag_name: tag }]), { status: 200 })),
    );
    const { html } = await render("/");
    const start = '<script type="application/ld+json">';
    const from = html.indexOf(start) + start.length;
    const text = html.slice(from, html.indexOf("</script>", from));
    expect(text).not.toContain("<");
    expect(html).toContain("1\\u003c/script>");
    const app = jsonLdOf(html)["@graph"].find((node) => node["@type"] === "SoftwareApplication") as Record<string, unknown>;
    expect(app.softwareVersion).toBe("1</script><script>x");
  });

  it("leaves out ratings and reviews", async () => {
    const { html } = await render("/");
    const app = jsonLdOf(html)["@graph"].find((node) => node["@type"] === "SoftwareApplication") as Record<string, unknown>;
    expect(app).not.toHaveProperty("aggregateRating");
    expect(app).not.toHaveProperty("review");
  });

  it("omits the version and links to the releases list when GitHub is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    const { html } = await render("/");
    const app = jsonLdOf(html)["@graph"].find((node) => node["@type"] === "SoftwareApplication") as Record<string, unknown>;
    expect(app).not.toHaveProperty("softwareVersion");
    expect(app.downloadUrl).toBe("https://github.com/sonorhq/sonor/releases");
  });
});

describe("the head of the pages", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([RELEASE]), { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets the locale and links the web manifest on the home page", async () => {
    const { html } = await render("/");
    expect(html).toContain('<meta property="og:locale" content="en_GB"/>');
    expect(html).toContain('<link rel="manifest" href="/site.webmanifest"/>');
  });

  it("keeps the structured data to the home page", async () => {
    const { html } = await render("/privacy");
    expect(html).not.toContain("application/ld+json");
  });
});

describe("the web manifest and its icons", () => {
  const manifest = JSON.parse(readFileSync(new URL("../public/site.webmanifest", import.meta.url), "utf8")) as {
    theme_color: string;
    icons: { src: string; sizes: string; type: string }[];
  };

  it("uses the theme colour from the brand", () => {
    expect(manifest.theme_color).toBe(THEME_COLOR.toLowerCase());
  });

  it.each(manifest.icons.map((icon) => [icon.src, icon.sizes] as const))("has a PNG at %s of the size it declares (%s)", (src, sizes) => {
    const png = readFileSync(new URL(`../public${src}`, import.meta.url));
    // The IHDR chunk holds the width and height as big-endian 32-bit numbers after the 8-byte signature and chunk header.
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    expect(`${width}x${height}`).toBe(sizes);
  });
});
