import { ACCENT_ICONS, COMING, CORE_FEATURES, DISCOVERY_FEATURES, isFlagship, readyImage, type Feature } from "../features";
import { readyPhone } from "../shots";
import { AppIcon } from "./Logo";
import { ShotPair } from "./ShotPair";

function AccentIcons() {
  return (
    <div className="accent-icons" role="img" aria-label="The Sonor app icon in six accent colours: Sonor orange, rose, violet, blue, teal and green.">
      {ACCENT_ICONS.map((icon) => (
        <AppIcon key={icon.name} tile={icon.tile} bars={icon.accent} />
      ))}
    </div>
  );
}

// The picture of a feature: its screenshot when the entry is ready (with the phone shot when that is ready
// too), or the drawn accent icons. Nothing otherwise, so the layouts below can tell.
export function FeatureImage({ feature }: { feature: Feature }) {
  if (feature.visual === "accent-icons") return <AccentIcons />;
  const image = readyImage(feature);
  if (!image) return null;
  return <ShotPair className="feature-pic" desktop={image} phone={readyPhone(image.phone)} caption={feature.title} />;
}

// The platform list of a core feature, or the provider a discovery feature needs.
function Note({ feature }: { feature: Feature }) {
  const note = feature.where ?? feature.needs;
  return note ? <span className="where">{note}</span> : null;
}

/** The flagship features: large rows, the picture on alternating sides on a wide screen. */
export function FlagshipFeatures() {
  return (
    <>
      {CORE_FEATURES.filter(isFlagship).map((feature, index) => (
        <div key={feature.id} className={index % 2 === 0 ? "split flip" : "split"}>
          <div className="split-copy">
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
            <Note feature={feature} />
          </div>
          <div className="split-media">
            <FeatureImage feature={feature} />
          </div>
        </div>
      ))}
    </>
  );
}

/** The other core features as short cards; a swipe row on a phone. */
export function FeatureGrid() {
  return (
    // The cards hold no links, so the row itself is the keyboard stop that lets a keyboard scroll it.
    <div className="card-scroller" tabIndex={0} role="region" aria-label="More features">
      <ul className="feature-grid">
        {CORE_FEATURES.filter((feature) => !isFlagship(feature) && !feature.visual).map((feature) => (
          <li key={feature.id} className="card">
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
            <Note feature={feature} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The features with a drawn visual (the accent icons), each as a full-width band. */
export function VisualBands() {
  return (
    <>
      {CORE_FEATURES.filter((feature) => feature.visual).map((feature) => (
        <div key={feature.id} className="band">
          <FeatureImage feature={feature} />
          <div className="band-copy">
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
            <Note feature={feature} />
          </div>
        </div>
      ))}
    </>
  );
}

function ShotCard({ feature }: { feature: Feature }) {
  return (
    <li className="card shot-card">
      <FeatureImage feature={feature} />
      <div className="card-body">
        <h3>{feature.title}</h3>
        <p>{feature.text}</p>
        <Note feature={feature} />
      </div>
    </li>
  );
}

// The discovery features in three even groups: wide picture cards, picture cards, and text bands for the
// ones with no picture yet. A feature moves group when its picture becomes ready; no card is left half empty.
export function DiscoveryFeatures() {
  const wide = DISCOVERY_FEATURES.filter((feature) => feature.wide && readyImage(feature));
  const cards = DISCOVERY_FEATURES.filter((feature) => !wide.includes(feature) && readyImage(feature));
  const bands = DISCOVERY_FEATURES.filter((feature) => !readyImage(feature));
  return (
    <div className="discovery">
      {wide.length > 0 ? (
        <ul className="shot-wide">
          {wide.map((feature) => (
            <ShotCard key={feature.id} feature={feature} />
          ))}
        </ul>
      ) : null}
      {cards.length > 0 ? (
        <div className="card-scroller">
          <ul className="shot-cards">
            {cards.map((feature) => (
              <ShotCard key={feature.id} feature={feature} />
            ))}
          </ul>
        </div>
      ) : null}
      {bands.length > 0 ? (
        <ul className="bands">
          {bands.map((feature) => (
            <li key={feature.id} className="band text-band">
              <div className="band-head">
                <h3>{feature.title}</h3>
                <Note feature={feature} />
              </div>
              <p>{feature.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The things on the way, one chip each. */
export function ComingList() {
  return (
    <ul className="coming">
      {COMING.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
