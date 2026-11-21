import { SCREENSHOTS } from "../screenshots";

// Sizes of the files in public/screenshots/, so the browser reserves the space before they load.
const DESKTOP = { width: 1600, height: 1005 };
const PHONE = { width: 900, height: 1950 };

/** One figure per ready entry: the desktop shot, the phone shot beside it when there is one, and a caption. */
export function Screenshots() {
  return (
    <div className="screens">
      {SCREENSHOTS.filter((shot) => shot.ready).map((shot) => (
        <figure key={shot.id} className="shot">
          <img
            className="shot-desk"
            src={shot.desktop}
            width={DESKTOP.width}
            height={DESKTOP.height}
            loading="lazy"
            decoding="async"
            alt={shot.alt}
          />
          {shot.phone ? (
            <img
              className="shot-phone"
              src={shot.phone}
              width={PHONE.width}
              height={PHONE.height}
              loading="lazy"
              decoding="async"
              alt=""
            />
          ) : null}
          <figcaption>{shot.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}
