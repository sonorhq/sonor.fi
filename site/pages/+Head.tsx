import { usePageContext } from "vike-react/usePageContext";

const SITE = "https://sonor.fi";
const IMAGE = `${SITE}/sonor-social-1280x640.png`;
const IMAGE_ALT = "The Sonor logo: a treble clef on a staff, in neon pink and lavender, on a dark background.";

export default function Head() {
  const { urlPathname, is404, config } = usePageContext();
  const title = (config.title as string | undefined) ?? "Sonor";
  const description = (config.description as string | undefined) ?? "";
  const home = urlPathname === "/";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Sonor",
    url: `${SITE}/`,
    description,
    applicationCategory: "MusicApplication",
    operatingSystem: "macOS, Windows, Linux, Android, iOS",
    image: IMAGE,
  };

  return (
    <>
      {/* Vike adds the charset, viewport, title, description, og:title and og:description from the config. */}
      <meta name="color-scheme" content="dark light" />
      <meta name="theme-color" content="#15141b" media="(prefers-color-scheme: dark)" />
      <meta name="theme-color" content="#faf8ff" media="(prefers-color-scheme: light)" />

      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

      {is404 ? <meta name="robots" content="noindex" /> : <link rel="canonical" href={`${SITE}${urlPathname}`} />}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Sonor" />
      <meta property="og:url" content={`${SITE}${urlPathname}`} />
      <meta property="og:image" content={IMAGE} />
      <meta property="og:image:width" content="1280" />
      <meta property="og:image:height" content="640" />
      <meta property="og:image:alt" content={IMAGE_ALT} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={IMAGE} />
      <meta name="twitter:image:alt" content={IMAGE_ALT} />

      {home ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}
    </>
  );
}
