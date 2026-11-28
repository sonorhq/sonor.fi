import { SCREENSHOTS } from "../screenshots";
import { readyPhone } from "../shots";
import { ShotPair } from "./ShotPair";

// Sizes of the files in public/screenshots/, so the browser reserves the space before they load.
const DESKTOP = { width: 1600, height: 1005 };

/** One entry of screenshots.ts as a picture, by id; nothing until the entry is ready. */
export function ScreenshotStage({ id, priority, shots = SCREENSHOTS }: { id: string; priority?: boolean; shots?: typeof SCREENSHOTS }) {
  const shot = shots.find((entry) => entry.id === id);
  if (!shot?.ready) return null;
  return <ShotPair desktop={{ src: shot.desktop, alt: shot.alt, ...DESKTOP }} phone={readyPhone(shot.phone)} caption={shot.caption} priority={priority} />;
}
