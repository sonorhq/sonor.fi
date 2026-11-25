import { renderPage } from "vike/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// What the GitHub API returns for the releases list: a draft first, then the beta.
const RELEASES = [
  {
    tag_name: "v0.1.0-beta.24",
    html_url: "https://github.com/sonorhq/sonor/releases/tag/v0.1.0-beta.24",
    draft: true,
    published_at: "2026-11-19T10:00:00Z",
    assets: [],
  },
  {
    tag_name: "v0.1.0-beta.23",
    html_url: "https://github.com/sonorhq/sonor/releases/tag/v0.1.0-beta.23",
    draft: false,
    published_at: "2026-11-18T10:00:00Z",
    assets: [
      "SHA256SUMS",
      "sonor-0.1.0-beta.23-d265ff1-android.apk",
      "sonor-0.1.0-beta.23-d265ff1-macos.dmg",
      "sonor-0.1.0-beta.23-d265ff1-macos.zip",
      "sonor-0.1.0-beta.23-d265ff1-windows-setup.exe",
      "sonor-0.1.0-beta.23-d265ff1-x86_64.AppImage",
      "sonor-0.1.0-beta.23-d265ff1-x86_64.pkg.tar.zst",
      "sonor-libmpv-sources-linux-x86_64.tar",
    ].map((name) => ({
      name,
      browser_download_url: `https://github.com/sonorhq/sonor/releases/download/v0.1.0-beta.23/${name}`,
      size: 104857600,
    })),
  },
];

const UA = {
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

/** Renders a page the way the Worker does, with GitHub answering from RELEASES. */
async function render(url: string, headers: Record<string, string> = {}) {
  const { httpResponse } = await renderPage({ urlOriginal: `https://sonor.fi${url}`, headersOriginal: headers });
  if (!httpResponse) throw new Error(`no response for ${url}`);
  return { status: httpResponse.statusCode, html: await httpResponse.getBody() as string };
}

describe("the rendered pages", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(RELEASES), { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists every platform's download on the home page, whatever the visitor's OS", async () => {
    const { status, html } = await render("/", { "user-agent": UA.iphone });
    expect(status).toBe(200);
    for (const name of [
      "sonor-0.1.0-beta.23-d265ff1-windows-setup.exe",
      "sonor-0.1.0-beta.23-d265ff1-macos.dmg",
      "sonor-0.1.0-beta.23-d265ff1-macos.zip",
      "sonor-0.1.0-beta.23-d265ff1-x86_64.AppImage",
      "sonor-0.1.0-beta.23-d265ff1-x86_64.pkg.tar.zst",
      "sonor-0.1.0-beta.23-d265ff1-android.apk",
      "SHA256SUMS",
      "sonor-libmpv-sources-linux-x86_64.tar",
    ]) {
      expect(html).toContain(name);
    }
  });

  it("offers the Windows installer as the primary download to a Windows visitor", async () => {
    const { html } = await render("/", { "user-agent": UA.windows, "sec-ch-ua-platform": '"Windows"' });
    expect(html).toContain(
      'href="https://github.com/sonorhq/sonor/releases/download/v0.1.0-beta.23/sonor-0.1.0-beta.23-d265ff1-windows-setup.exe" download="">',
    );
    expect(html).toContain("Download for Windows</a>");
  });

  it("offers the disk image to a Mac visitor", async () => {
    const { html } = await render("/", { "user-agent": UA.mac });
    expect(html).toContain('sonor-0.1.0-beta.23-d265ff1-macos.dmg" download="">');
    expect(html).toContain("Download for macOS</a>");
  });

  it("says iOS has no download yet, without a link", async () => {
    const { html } = await render("/", { "user-agent": UA.iphone });
    expect(html).toContain("Join the iPhone beta");
    expect(html).toContain("Public TestFlight beta · App Store coming");
    expect(html).not.toContain("Download for iPhone");
  });

  it("gives an unknown system a neutral download button that leads to the tabs, and keeps the full list", async () => {
    const { html } = await render("/");
    expect(html).toContain('class="btn btn-primary" href="#download"');
    expect(html).toContain("Download</a>");
    expect(html).not.toContain("Download for macOS");
    expect(html).not.toContain('class="here"');
    expect(html).toContain("sonor-0.1.0-beta.23-d265ff1-macos.dmg");
  });

  it("puts the page metadata in the head: title, canonical, Open Graph, Twitter and JSON-LD", async () => {
    const { html } = await render("/");
    expect(html).toContain('<html lang="en"');
    expect(html).toContain("<title>Sonor: a music player for Subsonic, Jellyfin and Emby</title>");
    expect(html).toContain('<meta name="description" content="Sonor plays your Subsonic, Navidrome, Jellyfin and Emby library');
    expect(html).toContain('<link rel="canonical" href="https://sonor.fi/"/>');
    expect(html).toContain('<meta property="og:image" content="https://sonor.fi/sonor-social-1200x630.png"/>');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>');
    expect(html).toContain('"@type":"SoftwareApplication"');
  });

  it("says so when the release has no build for the visitor's architecture", async () => {
    const { html } = await render("/", { "user-agent": "Mozilla/5.0 (X11; Linux aarch64; rv:131.0) Gecko/20100101 Firefox/131.0" });
    expect(html).toContain("No Linux ARM64 build in v0.1.0-beta.23; ");
    expect(html).toContain('class="btn btn-primary" href="#download"');
  });

  it("says the downloads are unavailable and links to GitHub when the release can't be read", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    const { html } = await render("/", { "user-agent": UA.windows });
    expect(html).toContain("Downloads are unavailable right now.");
    expect(html).toContain('href="https://github.com/sonorhq/sonor/releases"');
    expect(html).toContain("Download for Windows</a>");
    expect(html).toContain("See all releases on GitHub.");
  });

  it("presents the core features, the Octo features and the coming list, with pictures only for ready ones", async () => {
    const { html } = await render("/");
    expect(html).toContain("<h2>Made for listening</h2>");
    expect(html).toContain("<h3>Offline downloads</h3>");
    expect(html).toContain("<h3>Play on your other devices</h3>");
    expect(html).toContain("/screenshots/features/devices.webp");
    expect(html).toContain("<h2>With an Octo server</h2>");
    expect(html).toContain("Everything here needs an Octo server");
    expect(html).toContain("<h3>Add music to your library</h3>");
    expect(html).toContain("such as Soulseek or Lidarr");
    expect(html).toContain("<h2>Coming</h2>");
    expect(html).toContain("Plex servers");
    expect(html).toContain("Sonor never downloads music from the internet itself");
    expect(html).toContain("/screenshots/features/copies.webp");
    expect(html).toContain("/screenshots/features/discovery.webp");
    expect(html).toContain("The Sonor app icon in six accent colours");
    expect(html).toContain("/screenshots/desktop-nowplaying.webp");
  });

  it("renders the privacy page with its heading and its own canonical", async () => {
    const { status, html } = await render("/privacy");
    expect(status).toBe(200);
    expect(html).toContain("<h1>Privacy policy</h1>");
    expect(html).toContain('<link rel="canonical" href="https://sonor.fi/privacy"/>');
    expect(html).not.toContain('"@type":"SoftwareApplication"');
  });

  it("renders the full privacy policy, not a placeholder", async () => {
    const { html } = await render("/privacy");
    expect(html).not.toMatch(/coming soon/i);
    expect(html).toContain("Last updated: 23 November 2026");
    for (const heading of ["Who we are", "The update check", "How long we keep it", "Your rights", "Children", "Changes", "Contact"]) {
      expect(html).toContain(`<h2>${heading}</h2>`);
    }
    expect(html).toContain('href="mailto:privacy@sonor.fi"');
    expect(html).not.toMatch(/<meta name="description" content="[^"]*coming soon/i);
  });

  it("renders the 404 page with a 404 status and no index", async () => {
    const { status, html } = await render("/does-not-exist");
    expect(status).toBe(404);
    expect(html).toContain("<title>Page not found · Sonor</title>");
    expect(html).toContain("<h1>Page not found</h1>");
    expect(html).toContain('<meta name="robots" content="noindex"/>');
  });
});
