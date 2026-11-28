import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCENT_ICONS, COMING, CORE_FEATURES, DISCOVERY_FEATURES, isFlagship, readyImage, type Feature } from "../src/features";
import { SCREENSHOTS } from "../src/screenshots";
import { readyPhone } from "../src/shots";

const ALL: Feature[] = [...CORE_FEATURES, ...DISCOVERY_FEATURES];

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
    const copy = [
      ...ALL.flatMap((feature) => [feature.title, feature.text, feature.where ?? "", feature.image?.alt ?? "", feature.image?.phone?.alt ?? ""]),
      ...COMING,
    ];
    for (const line of copy) {
      expect(line).not.toMatch(/[–—]/);
    }
  });

  it("keeps every picture's alt text and source, and a phone shot's too", () => {
    for (const feature of ALL) {
      if (!feature.image) continue;
      expect(feature.image.alt.trim()).not.toBe("");
      expect(feature.image.src).toMatch(/^\/[^ ]+\.webp$/);
      if (!feature.image.phone) continue;
      expect(feature.image.phone.alt.trim()).not.toBe("");
      expect(feature.image.phone.src).toMatch(/^\/screenshots\/phone\/[^ ]+\.webp$/);
    }
  });

  it("shows a picture only when it is ready", () => {
    const image = { src: "/screenshots/x.webp", width: 10, height: 10, alt: "A picture", ready: true };
    const block = { id: "x", title: "X", text: "X" };
    expect(readyImage({ ...block, image })).toBe(image);
    expect(readyImage({ ...block, image: { ...image, ready: false } })).toBeUndefined();
    expect(readyImage(block)).toBeUndefined();
  });

  it("gives every ready picture a size", () => {
    for (const feature of ALL) {
      const image = readyImage(feature);
      if (!image) continue;
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
    }
  });

  it("keeps the devices feature in the grid, its picture off until a retake", () => {
    const devices = CORE_FEATURES.find((feature) => feature.id === "devices");
    expect(devices?.title).toBe("Play on your other devices");
    expect(devices?.image?.ready).toBe(false);
    expect(readyImage(devices!)).toBeUndefined();
    expect(devices?.text).toContain("Jellyfin and Emby");
    expect(devices?.where).toContain("Android");
    expect(COMING).not.toContain("Devices on Android");
    expect(COMING).toContain("Casting to AirPlay, Chromecast and DLNA");
  });

  it("marks the discovery features that only one provider gives", () => {
    const needs = ALL.map((feature) => feature.needs).filter(Boolean);
    for (const note of needs) {
      expect(["Needs Octo", "Needs Aurral"]).toContain(note);
    }
    expect(DISCOVERY_FEATURES.find((feature) => feature.id === "family")?.needs).toBe("Needs Octo");
    expect(DISCOVERY_FEATURES.find((feature) => feature.id === "lyrics-top")?.needs).toBeUndefined();
  });

  it("lists the other discovery providers as coming", () => {
    expect(COMING).toContain("More discovery providers");
  });

  it("shows six accent icons", () => {
    expect(ACCENT_ICONS).toHaveLength(6);
  });

  it("makes two flagship rows, in order, each with its picture", () => {
    expect(CORE_FEATURES.filter(isFlagship).map((feature) => feature.id)).toEqual(["offline", "lyrics"]);
  });

  it("puts the other nine features in the grid, each with a platform note", () => {
    const grid = CORE_FEATURES.filter((feature) => !isFlagship(feature) && !feature.visual);
    expect(grid).toHaveLength(9);
    for (const feature of grid) {
      expect(feature.where, feature.id).toBeTruthy();
    }
  });

  it("draws exactly one core feature, the accent band", () => {
    const visuals = CORE_FEATURES.filter((feature) => feature.visual);
    expect(visuals.map((feature) => feature.id)).toEqual(["accent"]);
  });

  it("shows the wide discovery cards, and the family feature as a text band", () => {
    expect(DISCOVERY_FEATURES.filter((feature) => feature.wide).map((feature) => feature.id)).toEqual(["discovery", "lyrics-top"]);
    expect(readyImage(DISCOVERY_FEATURES.find((feature) => feature.id === "family")!)).toBeUndefined();
  });

  it("keeps every ready picture and phone shot under 400 KB, as a file that exists", () => {
    const files = [
      ...ALL.map((feature) => readyImage(feature)).filter((image) => image !== undefined).map((image) => image.src),
      ...ALL.map((feature) => readyImage(feature)).filter((image) => image !== undefined).map((image) => readyPhone(image.phone)?.src).filter((src) => src !== undefined),
      ...SCREENSHOTS.filter((shot) => shot.ready).map((shot) => shot.desktop),
      ...SCREENSHOTS.filter((shot) => shot.ready).map((shot) => readyPhone(shot.phone)?.src).filter((src) => src !== undefined),
    ];
    expect(files.length).toBeGreaterThan(0);
    for (const src of files) {
      const file = new URL("../public" + src, import.meta.url);
      expect(existsSync(file), src).toBe(true);
      expect(statSync(file).size, src).toBeLessThan(400 * 1024);
    }
  });
});
