// The one place the logo is drawn, so a brand-kit change is a one-file change. The bars are the kit's Onada
// geometry (docs/brand in the app repo: five equal pill bars, round ends) and the wordmark is its outlined path.
// The hero lockup waves: each bar slides along its own axis (src/wave.css, from the kit's animated mark) and
// stands still under prefers-reduced-motion. The footer mark is static.
import "../wave.css";
import { WORDMARK_PATH } from "./wordmark";

const BARS = [
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

export function Lockup() {
  return (
    <svg className="lockup-img" viewBox="-24 -24 586.12 565" width={586} height={565} role="img" aria-label="Sonor">
      <g transform="translate(-74.19,-193.25) scale(6.86499)">
        <Bars animated />
      </g>
      <path d={WORDMARK_PATH} fill="#F6F4F1" transform="translate(-3.96,472) scale(0.20833)" />
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
