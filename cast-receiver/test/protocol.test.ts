import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MAX_BYTES,
  activeLine,
  byteLength,
  fitLyrics,
  handleMessage,
  initialState,
  lyricsFor,
  type Lyrics,
  type State,
} from "../src/protocol";

const raw = (name: string): string => readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8").trim();
const fixture = (name: string): Record<string, unknown> => JSON.parse(raw(name));
const send = (message: unknown, state: State = initialState()) => handleMessage(message, state);
const bad = (message: unknown, ref?: string) => {
  const result = send(message);
  expect(result.state).toEqual(initialState());
  expect(result.replies).toEqual([ref === undefined ? { type: "error", v: 1, code: "BAD_MESSAGE" } : { type: "error", v: 1, code: "BAD_MESSAGE", ref }]);
};

describe("fixtures", () => {
  it("are compact", () => {
    for (const name of ["queue", "lyrics-synced", "lyrics-plain", "lyrics-none", "lyrics-truncated", "clear", "ready"]) {
      expect(raw(name)).toBe(JSON.stringify(JSON.parse(raw(name))));
    }
  });
});

describe("hello", () => {
  it("is answered with ready, as text or as an object", () => {
    const hello = { type: "hello", v: 1, app: "Sonor 1.2.3" };
    for (const input of [hello, JSON.stringify(hello)]) {
      const result = send(input);
      expect(result.replies).toEqual([fixture("ready")]);
      expect(result.state).toMatchObject({ greeted: true, app: "Sonor 1.2.3" });
    }
  });
  it("needs an app string", () => bad({ type: "hello", v: 1 }, "hello"));
});

describe("queue", () => {
  it("is stored", () => {
    const result = send(raw("queue"));
    expect(result.replies).toEqual([]);
    expect(result.state.queue).toMatchObject({ current: "K1", index: 3, total: 42 });
    expect(result.state.queue?.next.map((n) => n.key)).toEqual(["K2", "K3", "K4"]);
    expect(result.state.queue?.next[0]?.image).toBe("https://api.sonor.fi/cast/img/k2.jpg");
    expect(result.state.queue?.next[1]?.image).toBeUndefined();
  });
  it("takes at most 5 next items", () => {
    const q = fixture("queue") as { next: unknown[] };
    const item = q.next[1];
    expect(send({ ...q, next: Array(5).fill(item) }).replies).toEqual([]);
    expect(send({ ...q, next: Array(6).fill(item) }).replies).toHaveLength(1);
  });
  it("limits text fields and keys to 200 characters", () => {
    const q = fixture("queue") as { next: Record<string, unknown>[] };
    const long = "x".repeat(201);
    expect(send({ ...q, next: [{ ...q.next[1], title: "x".repeat(200) }] }).replies).toEqual([]);
    for (const field of ["title", "artist", "album", "key"]) {
      expect(send({ ...q, next: [{ ...q.next[1], [field]: long }] }).replies).toHaveLength(1);
    }
    expect(send({ ...q, current: long }).replies).toHaveLength(1);
  });
  it("rejects wrong field types", () => {
    const q = fixture("queue");
    bad({ ...q, index: "3" }, "queue");
    bad({ ...q, index: 42 }, "queue");
    bad({ ...q, total: 0 }, "queue");
    bad({ ...q, next: "K2" }, "queue");
    bad({ ...q, current: "" }, "queue");
    bad({ ...q, next: [{ ...(q.next as object[])[1], duration: "184" }] }, "queue");
    bad({ ...q, next: [{ ...(q.next as object[])[1], image: "http://example.com/a.jpg" }] }, "queue");
  });
});

describe("lyrics", () => {
  it("stores synced lyrics, with words", () => {
    const { state } = send(raw("lyrics-synced"));
    const lyrics = lyricsFor(state, "K1") as Extract<Lyrics, { synced: true }>;
    expect(lyrics.synced).toBe(true);
    expect(lyrics.source).toBe("lrclib");
    expect(lyrics.lines[1]).toEqual([16500, "Second line"]);
    expect(lyrics.words?.[0]?.[1]).toEqual([13000, 14000, "line"]);
    expect(lyrics.truncated).toBe(false);
  });
  it("stores plain lyrics", () => {
    const lyrics = lyricsFor(send(raw("lyrics-plain")).state, "K1");
    expect(lyrics).toMatchObject({ synced: false, lines: ["First line", "Second line", "Third line"] });
  });
  it("stores none", () => {
    expect(lyricsFor(send(raw("lyrics-none")).state, "K1")).toEqual({ key: "K1", none: true });
  });
  it("keeps the truncated flag", () => {
    expect(lyricsFor(send(raw("lyrics-truncated")).state, "K1")).toMatchObject({ truncated: true });
  });
  it("rejects malformed lyrics", () => {
    const s = fixture("lyrics-synced") as { words: unknown[] };
    bad({ ...s, lines: [["12000", "x"]] }, "lyrics");
    bad({ ...s, lines: [[1, "x", 3]] }, "lyrics");
    bad({ ...s, synced: "yes" }, "lyrics");
    bad({ ...s, key: undefined }, "lyrics");
    bad({ ...s, words: s.words.slice(1) }, "lyrics");
    bad({ ...s, words: [[[1, 2]], [], []] }, "lyrics");
    bad({ ...(fixture("lyrics-plain")), lines: [1] }, "lyrics");
    bad({ ...(fixture("lyrics-plain")), lines: ["x".repeat(201)] }, "lyrics");
  });
  it("is shown only for the playing key", () => {
    const { state } = send(raw("lyrics-plain"));
    expect(lyricsFor(state, "K1")).not.toBeNull();
    expect(lyricsFor(state, "K2")).toBeNull();
    expect(lyricsFor(state, null)).toBeNull();
  });
});

describe("lyrics slots", () => {
  const lyricsFor2 = (key: string) => ({ ...(fixture("lyrics-plain") as object), key });
  it("keeps the next track's lyrics beside the playing one", () => {
    let state = send(raw("queue")).state; // current K1, next K2 K3 K4
    state = send(raw("lyrics-plain"), state).state;
    state = send(lyricsFor2("K2"), state).state;
    expect(lyricsFor(state, "K1")).not.toBeNull();
    expect(lyricsFor(state, "K2")).not.toBeNull();
  });
  it("ignores lyrics for tracks outside the queue's current and next", () => {
    const state = send(raw("queue")).state;
    const after = send(lyricsFor2("K99"), state);
    expect(after).toEqual({ state, replies: [] });
  });
  it("prunes when the queue moves on", () => {
    let state = send(raw("queue")).state;
    state = send(raw("lyrics-plain"), state).state;
    state = send(lyricsFor2("K2"), state).state;
    state = send({ ...(fixture("queue") as object), current: "K2", index: 4, next: [] }, state).state;
    expect(lyricsFor(state, "K1")).toBeNull();
    expect(lyricsFor(state, "K2")).not.toBeNull();
  });
  it("accepts lyrics before the first queue, capped at six", () => {
    let state = initialState();
    for (let i = 0; i < 8; i++) state = send(lyricsFor2(`T${i}`), state).state;
    expect(state.lyrics.size).toBe(6);
    expect(lyricsFor(state, "T0")).toBeNull();
    expect(lyricsFor(state, "T7")).not.toBeNull();
  });
});

describe("clear", () => {
  it("drops queue and lyrics, keeps the greeting", () => {
    let state = send({ type: "hello", v: 1, app: "Sonor 1" }).state;
    state = send(raw("queue"), state).state;
    state = send(raw("lyrics-plain"), state).state;
    const cleared = send(raw("clear"), state);
    expect(cleared.replies).toEqual([]);
    expect(cleared.state).toEqual({ greeted: true, app: "Sonor 1", queue: null, lyrics: new Map() });
  });
});

describe("text length", () => {
  it("counts Unicode code points, not UTF-16 units", () => {
    const emoji = "😀";
    const base = fixture("lyrics-plain") as object;
    expect(send({ ...base, lines: [emoji.repeat(200)] }).replies).toEqual([]);
    expect(send({ ...base, lines: [emoji.repeat(201)] }).replies).toHaveLength(1);
    const q = fixture("queue") as { next: Record<string, unknown>[] };
    expect(send({ ...q, next: [{ ...q.next[1], title: emoji.repeat(200) }] }).replies).toEqual([]);
    expect(send({ ...q, next: [{ ...q.next[1], title: emoji.repeat(201) }] }).replies).toHaveLength(1);
  });
});

describe("bad and unknown messages", () => {
  it("answers BAD_MESSAGE to invalid JSON, non-objects, a missing type and a wrong version", () => {
    bad("{nope");
    bad("[]");
    bad(42);
    bad(null);
    bad({ v: 1 });
    bad({ type: 7, v: 1 });
    bad({ type: "queue" }, "queue");
    bad({ type: "queue", v: 2 }, "queue");
    bad({ type: "hello", v: "1", app: "x" }, "hello");
  });
  it("ignores unknown types, and unknown fields", () => {
    const state = send(raw("queue")).state;
    const unknown = send({ type: "from-the-future", v: 1, x: 1 }, state);
    expect(unknown).toEqual({ state, replies: [] });
    expect(send({ type: "ready", v: 1 }, state)).toEqual({ state, replies: [] });
    const extra = send({ ...fixture("queue"), future: true });
    expect(extra.replies).toEqual([]);
    expect(extra.state.queue?.current).toBe("K1");
  });
  it("keeps the old state on a bad message", () => {
    const state = send(raw("queue")).state;
    expect(send({ type: "queue", v: 1 }, state).state).toBe(state);
  });
});

describe("size", () => {
  const big = (n: number) => ({ type: "lyrics", v: 1, key: "K1", synced: false, source: "x", lines: ["a".repeat(100)].concat(Array(n).fill("b".repeat(100))) });
  it("answers TOO_LARGE over the limit, with the type when readable", () => {
    const message = big(700);
    expect(byteLength(message)).toBeGreaterThan(MAX_BYTES);
    expect(send(message).replies).toEqual([{ type: "error", v: 1, code: "TOO_LARGE", ref: "lyrics" }]);
    expect(send(JSON.stringify(message)).replies).toEqual([{ type: "error", v: 1, code: "TOO_LARGE", ref: "lyrics" }]);
    expect(send("x".repeat(MAX_BYTES + 1)).replies).toEqual([{ type: "error", v: 1, code: "TOO_LARGE" }]);
  });
  it("counts UTF-8 bytes, not characters", () => {
    const text = "é".repeat(200);
    const lines = Array(150).fill(text); // 150 * ~403 bytes > 60,000 bytes, but only ~30,000 characters
    const message = { type: "lyrics", v: 1, key: "K1", synced: false, source: "x", lines };
    expect(JSON.stringify(message).length).toBeLessThan(MAX_BYTES);
    expect(send(message).replies[0]).toMatchObject({ code: "TOO_LARGE" });
  });
  it("accepts a message just under the limit", () => {
    const { type: _t, v: _v, ...lyrics } = big(700);
    const fitted = fitLyrics(lyrics as unknown as Lyrics);
    expect(send({ type: "lyrics", v: 1, ...fitted }).replies).toEqual([]);
  });
});

describe("fitLyrics", () => {
  const synced = (lines: number, withWords: boolean): Lyrics => ({
    key: "K1",
    synced: true,
    source: "lrclib",
    truncated: false,
    lines: Array.from({ length: lines }, (_, i) => [i * 1000, `line ${i}`] as [number, string]),
    ...(withWords
      ? { words: Array.from({ length: lines }, (_, i) => [[i * 1000, i * 1000 + 500, `line`], [i * 1000 + 500, i * 1000 + 900, `${i}`]] as [number, number, string][]) }
      : {}),
  });
  it("leaves a fitting message alone", () => {
    const l = synced(3, true);
    expect(fitLyrics(l)).toBe(l);
    const none: Lyrics = { key: "K1", none: true };
    expect(fitLyrics(none)).toBe(none);
  });
  it("drops word timing first", () => {
    const l = synced(1500, true) as Extract<Lyrics, { synced: true }>;
    expect(byteLength(l)).toBeGreaterThan(MAX_BYTES);
    expect(byteLength({ ...l, words: undefined })).toBeLessThan(MAX_BYTES);
    const fitted = fitLyrics(l) as Extract<Lyrics, { synced: true }>;
    expect(fitted.words).toBeUndefined();
    expect(fitted.lines).toHaveLength(1500);
    expect(fitted.truncated).toBe(false);
  });
  it("then cuts lines from the end and flags truncated", () => {
    const l = synced(6000, true) as Extract<Lyrics, { synced: true }>;
    const fitted = fitLyrics(l) as Extract<Lyrics, { synced: true }>;
    expect(fitted.words).toBeUndefined();
    expect(fitted.truncated).toBe(true);
    expect(fitted.lines.length).toBeLessThan(6000);
    expect(fitted.lines).toEqual(l.lines.slice(0, fitted.lines.length));
    expect(byteLength({ type: "lyrics", v: 1, ...fitted })).toBeLessThanOrEqual(MAX_BYTES);
    // One more line would not have fit.
    const more = { ...fitted, lines: l.lines.slice(0, fitted.lines.length + 1) };
    expect(byteLength({ type: "lyrics", v: 1, ...more })).toBeGreaterThan(MAX_BYTES);
  });
  it("cuts plain lyrics too, and respects a smaller limit", () => {
    const plain: Lyrics = { key: "K1", synced: false, source: "x", truncated: false, lines: Array(100).fill("hello world") };
    const fitted = fitLyrics(plain, 500) as Extract<Lyrics, { synced: false }>;
    expect(fitted.truncated).toBe(true);
    expect(byteLength({ type: "lyrics", v: 1, ...fitted })).toBeLessThanOrEqual(500);
    expect(send({ type: "lyrics", v: 1, ...fitted }).replies).toEqual([]);
  });
});

describe("activeLine", () => {
  const lines: [number, string][] = [[1000, "a"], [2000, "b"], [3000, "c"]];
  it("finds the playing line", () => {
    expect(activeLine(lines, 0)).toBe(-1);
    expect(activeLine(lines, 1000)).toBe(0);
    expect(activeLine(lines, 2500)).toBe(1);
    expect(activeLine(lines, 99999)).toBe(2);
    expect(activeLine([], 5)).toBe(-1);
  });
});
