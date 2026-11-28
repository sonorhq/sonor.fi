// The one place the logo is drawn: the kit's Onada bars and outlined wordmark, inline so the hero bars can
// wave (wave.css; static under reduced motion). The header shows the static mark and wordmark.
import "../wave.css";
import { TILE_PATH } from "./tile";
import { WORDMARK_PATH } from "./wordmark";

export const BARS = [
  { x: 21.41, y: 36.65 },
  { x: 33.66, y: 45.15 },
  { x: 45.91, y: 36.65 },
  { x: 58.16, y: 28.15 },
  { x: 70.42, y: 36.65 },
];

function Bars({ animated }: { animated: boolean }) {
  return (
    <>
      {BARS.map((b, i) => (
        <rect key={i} className={animated ? `bar bar-${i}` : undefined} x={b.x} y={b.y} width={8.17} height={26.7} rx={4.08} fill="#F4743B" />
      ))}
    </>
  );
}

/** The mark alone with waving bars, above the hero heading (static under reduced motion). */
export function WaveMark() {
  return (
    <svg className="wave-mark" viewBox="0 0 100 100" width={100} height={100} aria-hidden="true">
      <g transform="translate(-0.73,-0.73) scale(1.01452)">
        <Bars animated />
      </g>
    </svg>
  );
}

/** The outlined wordmark, cropped to its own bounds (538.12 x 104.17 at the kit's scale). */
export function Wordmark() {
  return (
    <svg className="wordmark" viewBox="0 0 538.12 104.17" width={538} height={104} aria-hidden="true">
      <path d={WORDMARK_PATH} fill="#F6F4F1" transform="translate(-3.96,102.08) scale(0.20833)" />
    </svg>
  );
}

/** The kit's app icon for one accent: a dark tinted tile with the accent's bars (dark-mode rule). */
export function AppIcon({ tile, bars }: { tile: string; bars: string }) {
  return (
    <svg viewBox="0 0 100 100" width={96} height={96} aria-hidden="true">
      <path d={TILE_PATH} fill={tile} />
      <g transform="translate(-0.73,-0.73) scale(1.01452)">
        {BARS.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={8.17} height={26.7} rx={4.08} fill={bars} />
        ))}
      </g>
    </svg>
  );
}

export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 100 100" width={100} height={100} aria-hidden="true">
      <g transform="translate(-0.73,-0.73) scale(1.01452)">
        <Bars animated={false} />
      </g>
    </svg>
  );
}
