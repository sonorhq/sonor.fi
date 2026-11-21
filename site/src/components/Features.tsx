import { COMING, CORE_FEATURES, OCTO_FEATURES, readyImage, type Feature } from "../features";

// The optional picture of a feature block: it renders only when the entry is ready, and the sizes come from
// the file (16:10), so the browser reserves the space before it loads.
function FeatureImage({ feature }: { feature: Feature }) {
  const image = readyImage(feature);
  if (!image) return null;
  return <img className="feature-img" src={image.src} width={1600} height={1004} loading="lazy" decoding="async" alt={image.alt} />;
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
