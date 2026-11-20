import { SCREENSHOTS, type Screenshot } from "../screenshots";

// Sizes of the files in public/screenshots/, so the browser reserves the space before they load.
const SIZE = {
  desktop: { width: 1600, height: 1000 },
  phone: { width: 900, height: 1950 },
} as const;

export function Screenshots() {
  return (
    <div className="see-grid">
      {SCREENSHOTS.map((shot) => (
        <figure key={shot.id} className="shot">
          <div className="shot-frames">
            <Frame shot={shot} kind="desktop" />
            <Frame shot={shot} kind="phone" />
          </div>
          <figcaption>{shot.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function Frame({ shot, kind }: { shot: Screenshot; kind: "desktop" | "phone" }) {
  const className = `frame frame-${kind}`;
  if (!shot.ready) {
    return (
      <div className={className}>
        <div className="frame-placeholder" role="img" aria-label={`${shot.caption}: screenshot coming`}>
          Screenshot coming
        </div>
      </div>
    );
  }
  const { light, dark } = shot[kind];
  const { width, height } = SIZE[kind];
  return (
    <picture className={className}>
      <source media="(prefers-color-scheme: dark)" srcSet={dark} />
      <img
        src={light}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        alt={kind === "desktop" ? shot.alt : ""}
      />
    </picture>
  );
}
