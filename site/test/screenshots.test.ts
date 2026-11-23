import { describe, expect, it } from "vitest";
import { SCREENSHOTS } from "../src/screenshots";
import { PHONE_SIZE } from "../src/shots";

describe("the home screenshots", () => {
  it("has a unique id, a caption and alt text for every entry", () => {
    const ids = SCREENSHOTS.map((shot) => shot.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const shot of SCREENSHOTS) {
      expect(shot.caption.trim()).not.toBe("");
      expect(shot.alt.trim()).not.toBe("");
    }
  });

  it("keeps every desktop file under public/screenshots/, as WebP", () => {
    for (const shot of SCREENSHOTS) {
      expect(shot.desktop).toMatch(/^\/screenshots\/[^ ]+\.webp$/);
    }
  });

  it("gives a phone shot its own non-empty alt and a file under public/screenshots/phone/, when it has one", () => {
    for (const shot of SCREENSHOTS) {
      if (!shot.phone) continue;
      expect(shot.phone.alt.trim()).not.toBe("");
      expect(shot.phone.src).toMatch(/^\/screenshots\/phone\/[^ ]+\.webp$/);
    }
  });

  it("uses no em or en dashes in the captions, alt texts or phone alt texts", () => {
    for (const shot of SCREENSHOTS) {
      const copy = [shot.caption, shot.alt, shot.phone?.alt ?? ""];
      for (const line of copy) {
        expect(line).not.toMatch(/[–—]/);
      }
    }
  });

  it("sizes the phone files as 900 × 1950", () => {
    expect(PHONE_SIZE).toEqual({ width: 900, height: 1950 });
  });
});
