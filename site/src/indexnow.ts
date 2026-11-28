// Tells IndexNow (Bing and others) the site's pages after a deploy. The key is public by design: the
// host serves it from site/public, so IndexNow can check that this site allowed the submission.

export const INDEXNOW_KEY = "956f06263cc10c0d14e1b3277ae34caf";
export const HOST = "sonor.fi";
export const ENDPOINT = "https://api.indexnow.org/indexnow";

// Only the site's own URLs go to IndexNow; the sitemap is ours, but a stray foreign <loc> must not be sent.
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

// Never throws: a failed ping must not fail the deploy that calls it, so every error becomes the returned text.
export async function submitToIndexNow(
  xml: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 15000,
): Promise<string> {
  const urls = urlsFromSitemap(xml);
  if (urls.length === 0) return "no URLs in the sitemap; nothing sent";
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(indexNowBody(urls)),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return `IndexNow answered ${response.status} for ${urls.length} URLs`;
  } catch (error) {
    return `IndexNow not reached: ${error instanceof Error ? error.message : String(error)}`;
  }
}
