import { usePageContext } from "vike-react/usePageContext";

export default function Page() {
  const { is404 } = usePageContext();
  if (!is404) {
    return (
      <div className="narrow">
        <h1>Something went wrong</h1>
        <p>
          This page could not be shown. Try again in a moment, or <a href="/">go to the Sonor home page</a>.
        </p>
      </div>
    );
  }
  return (
    <div className="narrow">
      <h1>Page not found</h1>
      <p>
        There is nothing at this address. <a href="/">Back to the Sonor home page.</a>
      </p>
    </div>
  );
}
