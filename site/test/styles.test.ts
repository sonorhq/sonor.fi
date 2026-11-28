import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("the stylesheet", () => {
  it("never sets a width of 100vw, which would scroll the page sideways", () => {
    expect(css).not.toMatch(/(^|[\s;{])(min-)?width:\s*100vw/);
  });

  it("keeps the skip link, the focus outline and the header's scrollbar gutter", () => {
    expect(css).toContain(".skip-link:focus");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("scrollbar-gutter: stable");
  });

  it("stops the wave, the lightbox fade and the hint fade under reduced motion", () => {
    const reduced = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(reduced).toContain(".wave-mark .bar");
    expect(reduced).toContain(".lightbox");
    expect(reduced).toContain(".zoom-hint");
  });

  it("uses no en or em dashes", () => {
    expect(css).not.toMatch(/[–—]/);
  });
});
