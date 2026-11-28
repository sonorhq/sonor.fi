import "../src/styles.css";
import type { ReactNode } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { Mark, Wordmark } from "../src/components/Logo";
import { Lightbox } from "../src/components/Zoomable";

export default function Layout({ children }: { children: ReactNode }) {
  const { urlPathname } = usePageContext();
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="wrap site-header-inner">
          <a className="brand" href="/" aria-label="Sonor home">
            <Mark />
            <Wordmark />
          </a>
          {/* Plain links, so the navigation works with no JavaScript and needs no menu button on a phone. */}
          <nav className="site-nav" aria-label="Main">
            <a href="/#features">Features</a>
            <a href="/discover" aria-current={urlPathname === "/discover" ? "page" : undefined}>Discover</a>
            <a className="btn btn-primary nav-cta" href="/#download">Download</a>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer>
        <div className="wrap footer-inner">
          <a className="brand" href="/" aria-label="Sonor home">
            <Mark />
            <Wordmark />
          </a>
          <nav aria-label="Footer">
            <a href="https://github.com/sonorhq/sonor/releases">Releases</a>
            <a href="/discover">Music discovery</a>
            <a href="/privacy">Privacy</a>
            <a href="/#download">Checksums</a>
            <a href="https://github.com/sonorhq/sonor/issues">Report a bug</a>
          </nav>
          <p>
            Sonor plays audio through libmpv, which is LGPL. Its source ships with every release as{" "}
            <code>sonor-libmpv-sources-*.tar</code>.
          </p>
          <p>&copy; 2026 Sonor</p>
        </div>
      </footer>
      <Lightbox />
    </>
  );
}
