import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeatureImage } from "../src/components/Features";
import { ScreenshotStage } from "../src/components/Screenshots";
import type { Feature } from "../src/features";
import { readyPhone, type PhoneShot } from "../src/shots";
import type { Screenshot } from "../src/screenshots";

// Test-only fixtures: the files they name do not exist, and the markup does not need them to.
const PHONE: PhoneShot = { src: "/screenshots/phone/fixture.webp", alt: "The fixture on a phone", ready: true };

function feature(phone?: PhoneShot): Feature {
  return {
    id: "fixture",
    title: "Fixture",
    text: "A fixture feature.",
    image: { src: "/screenshots/features/fixture.webp", width: 1600, height: 1000, alt: "The fixture on a desktop", ready: true, phone },
  };
}

function shot(phone?: PhoneShot): Screenshot {
  return { id: "fixture", caption: "Fixture", alt: "The fixture on a desktop", ready: true, desktop: "/screenshots/fixture.webp", phone };
}

describe("a feature picture without a phone shot", () => {
  it("renders the desktop picture alone, in one stage and one link", () => {
    const html = renderToStaticMarkup(<FeatureImage feature={feature()} />);
    expect(html).toContain('class="stage feature-pic"');
    expect(html).toContain("data-zoom-group");
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).not.toContain("with-phone");
    expect(html).not.toContain("stage-phone");
  });

  it("links the picture to its file, with the alt as the link's name", () => {
    const html = renderToStaticMarkup(<FeatureImage feature={feature()} />);
    expect(html).toContain(
      '<a class="zoom stage-desk" href="/screenshots/features/fixture.webp" data-zoom="" data-caption="Fixture" aria-label="Enlarge: The fixture on a desktop"',
    );
  });

  it("renders nothing when the desktop picture is not ready", () => {
    const html = renderToStaticMarkup(<FeatureImage feature={{ ...feature(PHONE), image: { ...feature(PHONE).image!, ready: false } }} />);
    expect(html).toBe("");
  });
});

describe("a feature picture with a phone shot", () => {
  it("renders the phone shot over the desktop one, after it in the markup", () => {
    const html = renderToStaticMarkup(<FeatureImage feature={feature(PHONE)} />);
    expect(html).toContain('class="stage with-phone feature-pic"');
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html.indexOf("stage-desk")).toBeLessThan(html.indexOf("stage-phone"));
  });

  it("gives the phone shot its own src, the phone size, lazy loading and alt", () => {
    const html = renderToStaticMarkup(<FeatureImage feature={feature(PHONE)} />);
    const tag = html.match(/<img[^>]*src="\/screenshots\/phone\/fixture\.webp"[^>]*>/)?.[0] ?? "";
    expect(tag).toContain('src="/screenshots/phone/fixture.webp"');
    expect(tag).toContain('width="900"');
    expect(tag).toContain('height="1950"');
    expect(tag).toContain('loading="lazy"');
    expect(tag).toContain('alt="The fixture on a phone"');
  });

  it("links the phone shot to its own file, with the same caption", () => {
    const html = renderToStaticMarkup(<FeatureImage feature={feature(PHONE)} />);
    expect(html).toContain(
      '<a class="zoom stage-phone" href="/screenshots/phone/fixture.webp" data-zoom="" data-caption="Fixture" aria-label="Enlarge: The fixture on a phone"',
    );
  });

  it("leaves the phone shot out until it is ready, and keeps the desktop picture", () => {
    const html = renderToStaticMarkup(<FeatureImage feature={feature({ ...PHONE, ready: false })} />);
    expect(html).not.toContain("stage-phone");
    expect(html).toContain("stage-desk");
  });

  it("only treats a phone shot as shown when it is ready", () => {
    expect(readyPhone(PHONE)).toBe(PHONE);
    expect(readyPhone({ ...PHONE, ready: false })).toBeUndefined();
    expect(readyPhone(undefined)).toBeUndefined();
  });
});

describe("a home screenshot stage", () => {
  it("shows the desktop and the phone shot, both linked, with the entry's caption", () => {
    const html = renderToStaticMarkup(<ScreenshotStage id="fixture" shots={[shot(PHONE)]} />);
    expect(html).toContain('class="zoom stage-desk"');
    expect(html).toContain('class="zoom stage-phone"');
    expect(html).toContain('data-caption="Fixture"');
  });

  it("shows the desktop shot alone when the entry has no phone shot", () => {
    const html = renderToStaticMarkup(<ScreenshotStage id="fixture" shots={[shot()]} />);
    expect(html).toContain("stage-desk");
    expect(html).not.toContain("stage-phone");
    expect(html).not.toContain("with-phone");
  });

  it("renders nothing for an entry that is not ready, phone shot or not", () => {
    const html = renderToStaticMarkup(<ScreenshotStage id="fixture" shots={[{ ...shot(PHONE), ready: false }]} />);
    expect(html).toBe("");
  });

  it("loads the priority picture eagerly, with the high fetch priority, and its phone shot eagerly too", () => {
    const html = renderToStaticMarkup(<ScreenshotStage id="fixture" priority shots={[shot(PHONE)]} />);
    // React writes the prop as fetchPriority; HTML attribute names are case-insensitive.
    expect(html).toMatch(/fetchpriority="high"/i);
    expect(html).not.toContain('loading="lazy"');
  });
});
