import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Lightbox } from "../src/components/Zoomable";
import { isPlainClick, wrapIndex } from "../src/lightbox";

describe("the lightbox's rules", () => {
  it("steps through a pair and wraps at both ends", () => {
    expect(wrapIndex(0, 2, 1)).toBe(1);
    expect(wrapIndex(1, 2, 1)).toBe(0);
    expect(wrapIndex(0, 2, -1)).toBe(1);
  });

  it("takes a plain left click, and leaves modified or other clicks to the browser", () => {
    const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
    expect(isPlainClick(plain)).toBe(true);
    for (const modifier of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
      expect(isPlainClick({ ...plain, [modifier]: true }), modifier).toBe(false);
    }
    expect(isPlainClick({ ...plain, button: 1 })).toBe(false);
  });

  it("renders the closed dialog, empty, before any screenshot is opened", () => {
    expect(renderToStaticMarkup(<Lightbox />)).toBe('<dialog class="lightbox" aria-label="Enlarged screenshot"></dialog>');
  });
});
