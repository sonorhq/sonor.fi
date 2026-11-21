import { describe, expect, it } from "vitest";
import { COMING, CORE_FEATURES, OCTO_FEATURES, readyImage, type Feature } from "../src/features";

const ALL: Feature[] = [...CORE_FEATURES, ...OCTO_FEATURES];

describe("the feature copy", () => {
  it("has a unique id and a title and text for every feature", () => {
    const ids = ALL.map((feature) => feature.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const feature of ALL) {
      expect(feature.title.trim()).not.toBe("");
      expect(feature.text.trim()).not.toBe("");
    }
  });

  it("uses no em or en dashes, in the features or the coming list", () => {
    const copy = [...ALL.flatMap((feature) => [feature.title, feature.text, feature.where ?? "", feature.image?.alt ?? ""]), ...COMING];
    for (const line of copy) {
      expect(line).not.toMatch(/[–—]/);
    }
  });

  it("keeps every picture's alt text and source", () => {
    for (const feature of ALL) {
      if (!feature.image) continue;
      expect(feature.image.alt.trim()).not.toBe("");
      expect(feature.image.src).toMatch(/^\/[^ ]+\.webp$/);
    }
  });

  it("shows a picture only when it is ready", () => {
    const image = { src: "/screenshots/x.webp", alt: "A picture", ready: true };
    const block = { id: "x", title: "X", text: "X" };
    expect(readyImage({ ...block, image })).toBe(image);
    expect(readyImage({ ...block, image: { ...image, ready: false } })).toBeUndefined();
    expect(readyImage(block)).toBeUndefined();
  });
});
