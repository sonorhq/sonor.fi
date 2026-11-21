// The one place the logo is drawn, so the brand kit is a one-file change. The hero shows the stacked
// lockup, which spins its record (the animation and its reduced-motion rule are inside the SVG); the
// footer shows the static mark. Both are copies of the kit's files in public/brand/.
export function Lockup() {
  return <img className="lockup-img" src="/brand/lockup-stacked.svg" width={586} height={657} alt="Sonor" />;
}

export function Mark() {
  return <img className="mark" src="/brand/mark.svg" width={100} height={100} alt="" aria-hidden="true" />;
}
