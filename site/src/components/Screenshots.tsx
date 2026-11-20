import { SCREENSHOTS } from "../screenshots";

// Sizes of the files in public/screenshots/, so the browser reserves the space before they load.
const DESKTOP = { width: 1600, height: 1000 };
const PHONE = { width: 900, height: 1950 };

/** The desktop screenshot with the phone beside it at its lower right, or the silhouettes until the files exist. */
export function Screenshots() {
  const shot = SCREENSHOTS[0];
  if (!shot.ready) {
    return (
      <div className="screens">
        <PlaceholderDesktop />
        <PlaceholderPhone />
      </div>
    );
  }
  return (
    <div className="screens">
      <img className="shot-desk" src={shot.desktop} width={DESKTOP.width} height={DESKTOP.height} loading="lazy" decoding="async" alt={shot.alt} />
      <img className="shot-phone" src={shot.phone} width={PHONE.width} height={PHONE.height} loading="lazy" decoding="async" alt="" />
    </div>
  );
}

const repeat = (n: number, className?: string) =>
  Array.from({ length: n }, (_, i) => <i key={i} className={className} />);

function PlaceholderDesktop() {
  return (
    <div className="ph ph-desk" role="img" aria-label="Placeholder for a desktop screenshot of Sonor, coming soon">
      <div className="bar">{repeat(3)}</div>
      <div className="body">
        <div className="side">
          <b />
          <b />
          <b />
          <b />
          <b />
        </div>
        <div className="main">
          <b />
          <div className="grid">{repeat(12)}</div>
        </div>
      </div>
      <div className="now">
        <i />
        <span>
          <b />
          <b />
        </span>
        <em />
      </div>
      <span className="ph-tag" aria-hidden="true">Desktop screenshot coming</span>
    </div>
  );
}

function PlaceholderPhone() {
  return (
    <div className="ph ph-phone" role="img" aria-label="Placeholder for an iPhone or Android screenshot of Sonor, coming soon">
      <div className="scr">
        <div className="art" />
        <b />
        <b />
        <em />
        <div className="ctl">
          <i />
          <i />
          <i />
        </div>
      </div>
      <span className="ph-tag" aria-hidden="true">Phone</span>
    </div>
  );
}
