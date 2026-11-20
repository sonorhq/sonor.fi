import "../src/styles.css";
import type { ReactNode } from "react";
import { Mark } from "../src/components/Logo";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <main id="main">{children}</main>
      <footer>
        <div className="col">
          <Mark />
          <nav aria-label="Footer">
            <a href="https://github.com/sonorhq/sonor/releases">Releases</a>
            <a href="/privacy">Privacy</a>
            <a href="https://github.com/sonorhq/sonor/releases">Checksums</a>
            <a href="https://github.com/sonorhq/sonor/issues">Report a bug</a>
          </nav>
          <p>
            Sonor plays audio through libmpv, which is LGPL. Its source ships with every release as{" "}
            <code>sonor-libmpv-sources-*.tar</code>.
          </p>
          <p>&copy; 2026 Sonor</p>
        </div>
      </footer>
    </>
  );
}
