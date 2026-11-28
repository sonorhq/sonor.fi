import { usePageContext } from "vike-react/usePageContext";
import { THEME_COLOR } from "../src/brand";
import { RELEASES_PAGE } from "../src/downloads";
import { SCREENSHOTS } from "../src/screenshots";
import type { Data } from "./index/+data";

const SITE = "https://sonor.fi";
const IMAGE = `${SITE}/sonor-social-1200x630.png`;
const IMAGE_ALT =
  "The Sonor mark, five orange rounded bars forming a wave, above the lower-case sonor wordmark on a dark brown tile.";

export default function Head() {
  const { urlPathname, is404, errorWhileRendering, config, data } = usePageContext();
  const downloads = (data as Data | undefined)?.downloads ?? null;
  const indexable = !is404 && !errorWhileRendering;
  // Vike titles every page from its config; the error page has none, so it's titled here.
  const errorTitle = is404 ? "Page not found · Sonor" : errorWhileRendering ? "Something went wrong · Sonor" : undefined;
  const title = errorTitle ?? (config.title as string | undefined) ?? "Sonor";
  const description = (config.description as string | undefined) ?? "";
  const home = urlPathname === "/";

  const ORG = `${SITE}/#organization`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": ORG, name: "Sonor", url: `${SITE}/`, logo: `${SITE}/icon-512.png`, sameAs: ["https://github.com/sonorhq"] },
      { "@type": "WebSite", "@id": `${SITE}/#website`, name: "Sonor", url: `${SITE}/`, inLanguage: "en", publisher: { "@id": ORG } },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE}/#app`,
        name: "Sonor",
        url: `${SITE}/`,
        description,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "macOS, Windows, Linux, Android, iOS",
        image: IMAGE,
        screenshot: SCREENSHOTS.filter((s) => s.ready).map((s) => `${SITE}${s.desktop}`),
        featureList: [
          "Offline downloads",
          "Gapless playback",
          "Synced lyrics",
          "CarPlay and Android Auto",
          "Music discovery: mixes, stations and charts",
          "Add music to your library",
        ],
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        downloadUrl: downloads?.releasePage ?? RELEASES_PAGE,
        ...(downloads ? { softwareVersion: downloads.version.replace(/^v/, "") } : {}),
        publisher: { "@id": ORG },
      },
    ],
  };
  // The tag name comes from GitHub, so "<" is escaped and nothing in it can close the script element.
  const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <>
      {/* Vike adds the charset, viewport, title, description, og:title and og:description from the config. */}
      {errorTitle ? <title>{errorTitle}</title> : null}
      <meta name="color-scheme" content="dark" />
      <meta name="theme-color" content={THEME_COLOR} />

      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {indexable ? <link rel="canonical" href={`${SITE}${urlPathname}`} /> : <meta name="robots" content="noindex" />}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Sonor" />
      <meta property="og:locale" content="en_GB" />
      <meta property="og:url" content={`${SITE}${urlPathname}`} />
      <meta property="og:image" content={IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={IMAGE_ALT} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={IMAGE} />
      <meta name="twitter:image:alt" content={IMAGE_ALT} />

      {/* The site's CSP allows this because an ld+json script is a data block that browsers never run. */}
      {home ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml }} /> : null}
    </>
  );
}
