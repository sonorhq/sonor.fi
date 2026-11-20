// Environment: server
// Runs on the Worker for each request to /. The guess from the request headers is sent to the
// page, which refines it in the browser; the file list is sent so both sides can pick the file.
import { detectPlatform, hintsFromHeaders, parseOS, type Platform } from "../../src/platform";
import {
  RELEASES_PAGE,
  checksumsHref,
  librarySources,
  releaseFiles,
  type DownloadFile,
  type ReleaseAsset,
} from "../../src/downloads";
import { latestRelease } from "../../src/releases";

export { data };
export type Data = Awaited<ReturnType<typeof data>>;
export type Downloads = NonNullable<Data["downloads"]>;

async function data(pageContext: {
  headers?: Record<string, string>;
  urlParsed?: { search?: Record<string, string> };
}): Promise<{
  platform: Platform;
  downloads: {
    version: string;
    releasePage: string;
    files: DownloadFile[];
    checksums: string | null;
    sources: Pick<ReleaseAsset, "name" | "browser_download_url" | "size">[];
  } | null;
}> {
  const detected = detectPlatform(hintsFromHeaders(pageContext.headers ?? {}));
  // ?os= picks the platform for the page (and the tab), for testing; anything else is ignored.
  const override = parseOS(pageContext.urlParsed?.search?.os);
  const platform: Platform = override ? { ...detected, os: override } : detected;
  const release = await latestRelease();
  if (!release) return { platform, downloads: null };

  return {
    platform,
    downloads: {
      version: release.tag_name,
      releasePage: release.html_url || RELEASES_PAGE,
      files: releaseFiles(release),
      checksums: checksumsHref(release) ?? null,
      sources: librarySources(release),
    },
  };
}
