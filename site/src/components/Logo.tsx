// The one place the logo is drawn, so swapping it is a one-file change.
export function Logo({ className }: { className?: string }) {
  return (
    <img
      className={className}
      src="/sonor-lockup-1000.png"
      srcSet="/sonor-lockup-1000.png 1x, /sonor-lockup-2000.png 2x"
      width={1000}
      height={287}
      alt="Sonor"
    />
  );
}
