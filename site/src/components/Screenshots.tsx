import { SCREENSHOTS, type Screenshot } from "../screenshots";
import { readyPhone } from "../shots";
import { ShotPair } from "./ShotPair";

// Sizes of the files in public/screenshots/, so the browser reserves the space before they load.
const DESKTOP = { width: 1600, height: 1005 };

/** One figure per ready entry: the desktop shot, the phone shot beside it when there is one, and a caption. */
export function Screenshots({ shots = SCREENSHOTS }: { shots?: Screenshot[] }) {
  return (
    <div className="screens">
      {shots.filter((shot) => shot.ready).map((shot) => (
        <figure key={shot.id} className="shot">
          <ShotPair phone={readyPhone(shot.phone)}>
            <img
              className="shot-desk"
              src={shot.desktop}
              width={DESKTOP.width}
              height={DESKTOP.height}
              loading="lazy"
              decoding="async"
              alt={shot.alt}
            />
          </ShotPair>
          <figcaption>{shot.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}
