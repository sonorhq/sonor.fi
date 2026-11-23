import { describe, expect, it } from "vitest";
import type { Lyrics } from "../src/protocol";
import { ANCHOR, formatTime, plainOffset, progressFraction, screenMode, sungWords, syncedOffset } from "../src/view";

const synced: Lyrics = { key: "K1", synced: true, source: "lrclib", lines: [[0, "a"]], truncated: false };
const plain: Lyrics = { key: "K1", synced: false, source: "lrclib", lines: ["a"], truncated: false };

describe("screenMode", () => {
  it("is idle when nothing is loaded, whatever the lyrics", () => {
    expect(screenMode(false, synced)).toBe("idle");
    expect(screenMode(false, null)).toBe("idle");
  });
  it("shows the cover layout without lyrics, with none, or with no lines", () => {
    expect(screenMode(true, null)).toBe("none");
    expect(screenMode(true, { key: "K1", none: true })).toBe("none");
    expect(screenMode(true, { ...synced, lines: [] })).toBe("none");
    expect(screenMode(true, { ...plain, lines: [] })).toBe("none");
  });
  it("picks the synced or the plain layout", () => {
    expect(screenMode(true, synced)).toBe("synced");
    expect(screenMode(true, plain)).toBe("plain");
  });
});

describe("sungWords", () => {
  const words: [number, number, string][] = [
    [0, 100, "a"],
    [100, 200, "b"],
    [300, 400, "c"],
  ];
  it("counts the words that have started", () => {
    expect(sungWords(words, -1)).toBe(0);
    expect(sungWords(words, 0)).toBe(1);
    expect(sungWords(words, 99)).toBe(1);
    expect(sungWords(words, 100)).toBe(2);
    expect(sungWords(words, 250)).toBe(2);
    expect(sungWords(words, 10_000)).toBe(3);
  });
  it("is zero for a line without words", () => {
    expect(sungWords([], 500)).toBe(0);
  });
});

describe("syncedOffset", () => {
  it("puts the middle of the line at the anchor of the box", () => {
    const box = 1000;
    for (const [top, height] of [
      [0, 60],
      [500, 50],
      [940, 60],
    ] as const) {
      const offset = syncedOffset(top, height, box);
      expect(top + height / 2 + offset).toBeCloseTo(ANCHOR * box, 9);
    }
  });
  it("moves the track up as the line goes down", () => {
    expect(syncedOffset(500, 50, 1000)).toBeLessThan(syncedOffset(100, 50, 1000));
  });
});

describe("plainOffset", () => {
  it("starts with the first line at the anchor and ends with the text at the anchor", () => {
    expect(plainOffset(0, 3000, 1000)).toBeCloseTo(ANCHOR * 1000, 9);
    expect(plainOffset(1, 3000, 1000)).toBeCloseTo(ANCHOR * 1000 - 3000, 9);
  });
  it("is linear in progress and clamps it to the song", () => {
    expect(plainOffset(0.5, 3000, 1000)).toBeCloseTo(ANCHOR * 1000 - 1500, 9);
    expect(plainOffset(-1, 3000, 1000)).toBe(plainOffset(0, 3000, 1000));
    expect(plainOffset(2, 3000, 1000)).toBe(plainOffset(1, 3000, 1000));
    expect(plainOffset(Number.NaN, 3000, 1000)).toBe(plainOffset(0, 3000, 1000));
  });
});

describe("progressFraction", () => {
  it("is the share of the song played", () => {
    expect(progressFraction(30, 120)).toBe(0.25);
    expect(progressFraction(200, 120)).toBe(1);
    expect(progressFraction(-5, 120)).toBe(0);
  });
  it("is zero when the duration is unknown", () => {
    expect(progressFraction(30, 0)).toBe(0);
    expect(progressFraction(30, Number.NaN)).toBe(0);
    expect(progressFraction(30, Number.POSITIVE_INFINITY)).toBe(0);
    expect(progressFraction(Number.NaN, 120)).toBe(0);
  });
});

describe("formatTime", () => {
  it("reads m:ss, and h:mm:ss from an hour on", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65.9)).toBe("1:05");
    expect(formatTime(3599)).toBe("59:59");
    expect(formatTime(3600)).toBe("1:00:00");
    expect(formatTime(3725)).toBe("1:02:05");
  });
  it("reads a time that is not a number as zero", () => {
    expect(formatTime(Number.NaN)).toBe("0:00");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("0:00");
    expect(formatTime(-5)).toBe("0:00");
  });
});
