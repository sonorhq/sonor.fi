import { ACCENT_ICONS, COMING, CORE_FEATURES, OCTO_FEATURES, readyImage, type Feature } from "../features";
import { AppIcon } from "./Logo";

// The optional picture of a feature block: a screenshot when the entry is ready, or a drawn visual. Width and
// height come from the entry, so the browser reserves the space (and the frame keeps its ratio) before it loads.
function AccentIcons() {
  return (
    <div className="feature-visual accent-icons" role="img" aria-label="The Sonor app icon in six accent colours: Sonor orange, rose, violet, blue, teal and green.">
      {ACCENT_ICONS.map((icon) => (
        <AppIcon key={icon.name} tile={icon.tile} bars={icon.accent} />
      ))}
    </div>
  );
}

function FeatureImage({ feature }: { feature: Feature }) {
  if (feature.visual === "accent-icons") return <AccentIcons />;
  const image = readyImage(feature);
  if (!image) return null;
  return (
    <img
      className="feature-img"
      src={image.src}
      width={image.width}
      height={image.height}
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
      loading="lazy"
      decoding="async"
      alt={image.alt}
    />
  );
}

/** The core features as a centred running order, each with its platforms. */
export function CoreFeatures() {
  return (
    <ul className="features">
      {CORE_FEATURES.map((feature) => (
        <li key={feature.id}>
          <FeatureImage feature={feature} />
          <h3>{feature.title}</h3>
          <p>{feature.text}</p>
          {feature.where ? <span className="where">{feature.where}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** The Octo features as cards, two across on a wide screen. */
export function OctoFeatures() {
  return (
    <ul className="octo-grid">
      {OCTO_FEATURES.map((feature) => (
        <li key={feature.id} className="octo-card">
          <FeatureImage feature={feature} />
          <h3>{feature.title}</h3>
          <p>{feature.text}</p>
        </li>
      ))}
    </ul>
  );
}

/** The things on the way, one line each. */
export function ComingList() {
  return (
    <ul className="coming">
      {COMING.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
