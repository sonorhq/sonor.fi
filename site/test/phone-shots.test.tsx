import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeatureImage } from "../src/components/Features";
import { Screenshots } from "../src/components/Screenshots";
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

describe("a feature picture with a phone shot", () => {
  it("renders the desktop picture alone when the feature has no phone shot", () => {
    const html = renderToStaticMarkup(<FeatureImage feature={feature()} />);
    expect(html).toContain('class="shot-pair feature-pic"');
    expect(html).toContain('class="feature-img"');
    expect(html).toContain('alt="The fixture on a desktop"');
    expect(html).not.toContain("with-phone");
    expect(html).not.toContain("shot-phone");
    expect(html.match(/<img /g)).toHaveLength(1);
  });

  it("renders the phone shot beside the desktop one, with its own alt and the phone size", () => {
    const html = renderToStaticMarkup(<FeatureImage feature={feature(PHONE)} />);
    expect(html).toContain('class="shot-pair with-phone feature-pic"');
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html.indexOf("feature-img")).toBeLessThan(html.indexOf("shot-phone"));
    expect(html).toContain('<img class="shot-phone" src="/screenshots/phone/fixture.webp" width="900" height="1950" loading="lazy" decoding="async" alt="The fixture on a phone"');
  });

  it("leaves the phone shot out until it is ready, and keeps the desktop picture", () => {
    const html = renderToStaticMarkup(<FeatureImage feature={feature({ ...PHONE, ready: false })} />);
    expect(html).not.toContain("shot-phone");
    expect(html).toContain('class="feature-img"');
  });

  it("renders nothing when the desktop picture is not ready, phone shot or not", () => {
    const html = renderToStaticMarkup(<FeatureImage feature={{ ...feature(PHONE), image: { ...feature(PHONE).image!, ready: false } }} />);
    expect(html).toBe("");
  });

  it("only treats a phone shot as shown when it is ready", () => {
    expect(readyPhone(PHONE)).toBe(PHONE);
    expect(readyPhone({ ...PHONE, ready: false })).toBeUndefined();
    expect(readyPhone(undefined)).toBeUndefined();
  });
});

describe("a home screenshot with a phone shot", () => {
  it("shows the phone shot beside the desktop one, with its short alt", () => {
    const html = renderToStaticMarkup(<Screenshots shots={[shot(PHONE)]} />);
    expect(html).toContain('class="shot-desk"');
    expect(html).toContain('class="shot-phone"');
    expect(html).toContain('alt="The fixture on a phone"');
    expect(html).not.toContain('alt=""');
    expect(html).toContain("<figcaption>Fixture</figcaption>");
  });

  it("renders the desktop shot alone when the entry has no phone shot", () => {
    const html = renderToStaticMarkup(<Screenshots shots={[shot()]} />);
    expect(html).toContain('class="shot-desk"');
    expect(html).not.toContain("shot-phone");
    expect(html).not.toContain("with-phone");
  });

  it("skips an entry that is not ready, phone shot or not", () => {
    const html = renderToStaticMarkup(<Screenshots shots={[{ ...shot(PHONE), ready: false }]} />);
    expect(html).not.toContain("<figure");
  });
});
