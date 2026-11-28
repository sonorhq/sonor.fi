// Tells IndexNow (Bing and others) the site's pages after a deploy. The key is public by design: the
// host serves it from site/public, so IndexNow can check that this site allowed the submission.

export const INDEXNOW_KEY = "956f06263cc10c0d14e1b3277ae34caf";
export const HOST = "sonor.fi";
export const ENDPOINT = "https://api.indexnow.org/indexnow";

// Only the site's own URLs go to IndexNow; the sitemap is ours, but a stray foreign <loc> must not be sent.
export const NO_URLS = "no URLs in the sitemap; nothing sent";

// What each refusal means, so the workflow annotation says what to look at.
const HINTS: Record<number, string> = {
  403: "the key file was not found or does not match",
  422: "a URL does not belong to the host",
  429: "too many requests",
};
export function urlsFromSitemap(xml: string): string[] {
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  return locs.filter((loc) => {
    try {
      return new URL(loc).hostname === HOST;
    } catch {
      return false;
    }
  });
}

export function indexNowBody(urls: string[]) {
  return {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };
}

// Never throws: a failed ping must not fail the deploy that calls it, so every outcome becomes the returned text.
export async function submitToIndexNow(
  xml: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 15000,
): Promise<string> {
  const urls = urlsFromSitemap(xml);
  if (urls.length === 0) return NO_URLS;
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(indexNowBody(urls)),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 200 || response.status === 202) {
      return `IndexNow accepted ${urls.length} URLs (${response.status})`;
    }
    return `IndexNow rejected the request (${response.status}): ${HINTS[response.status] ?? "unexpected answer"}`;
  } catch (error) {
    return `IndexNow not reached: ${error instanceof Error ? error.message : String(error)}`;
  }
}
