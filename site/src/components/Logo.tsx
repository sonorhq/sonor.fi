// The one place the logo is drawn, so the brand kit is a one-file change. The light scheme gets the
// walnut wordmark, the dark scheme the cream one.
export function Logo({ className }: { className?: string }) {
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet="/brand/lockup-dark.svg" />
      <img className={className} src="/brand/lockup-light.svg" width={963} height={348} alt="Sonor" />
    </picture>
  );
}
