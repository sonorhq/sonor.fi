// The one place the logo is drawn, so the brand kit is a one-file change. The light scheme gets the
// walnut wordmark, the dark scheme the cream one. The files are provisional until the kit lands.
export function Logo({ className }: { className?: string }) {
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet="/brand/lockup-dark.svg" />
      <img className={className} src="/brand/lockup-light.svg" width={590} height={202} alt="Sonor" />
    </picture>
  );
}
