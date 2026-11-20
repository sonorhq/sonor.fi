// The one place the logo is drawn, so swapping it is a one-file change. The lockup is drawn for a
// dark background; the light scheme gets the same mark with the wordmark in the light ink.
export function Logo({ className }: { className?: string }) {
  return (
    <picture>
      <source
        media="(prefers-color-scheme: light)"
        srcSet="/sonor-lockup-light-1000.png 1x, /sonor-lockup-light-2000.png 2x"
      />
      <img
        className={className}
        src="/sonor-lockup-1000.png"
        srcSet="/sonor-lockup-1000.png 1x, /sonor-lockup-2000.png 2x"
        width={1000}
        height={287}
        alt="Sonor"
      />
    </picture>
  );
}
