import "../src/styles.css";
import type { ReactNode } from "react";
import { Logo } from "../src/components/Logo";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Sonor home">
          <Logo className="logo" />
        </a>
        <nav aria-label="Main">
          <a href="/#downloads">Download</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <p>
          The libmpv build Sonor uses is LGPL. Its source is attached to every release as{" "}
          <code>sonor-libmpv-sources-*.tar</code>, on <a href="https://github.com/sonorhq/sonor/releases">GitHub releases</a>.
        </p>
        <nav aria-label="Footer">
          <a href="https://github.com/sonorhq/sonor/releases">Releases</a>
          <a href="/privacy">Privacy</a>
        </nav>
        <p>&copy; 2026 Sonor</p>
      </footer>
    </>
  );
}
