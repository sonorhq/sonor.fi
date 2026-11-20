import { useEffect, useState } from "react";
import { FORMAT_LABELS, RELEASES_PAGE, groupByOS, pickFile, type DownloadFile } from "../downloads";
import { detectInBrowser } from "../browser-platform";
import { type OS, type Platform } from "../platform";
import type { Downloads } from "../../pages/index/+data";

export const OS_NAMES: Record<OS, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  android: "Android",
  ios: "iOS",
  unknown: "your system",
};

/** The OS and architecture as the server guessed them, refined in the browser after hydration. */
export function usePlatform(initial: Platform): Platform {
  const [platform, setPlatform] = useState(initial);
  useEffect(() => {
    let live = true;
    void detectInBrowser().then((p) => live && setPlatform(p));
    return () => {
      live = false;
    };
  }, []);
  return platform;
}

const archLabel = (arch: string) => ({ x64: "x64", arm64: "ARM64", universal: "Universal" })[arch as "x64"] ?? "";

const size = (bytes: number | undefined) => (bytes ? `${(bytes / 1024 / 1024).toFixed(0)} MB` : "");

const join = (parts: (string | undefined)[]) => parts.filter(Boolean).join(" · ");

/** The hero's button: the file for the visitor's OS, or a note for iOS, or nothing when unknown. */
export function PrimaryDownload({ platform, downloads }: { platform: Platform; downloads: Downloads | null }) {
  if (platform.os === "unknown") return null;
  if (platform.os === "ios") {
    return <p className="note">iOS: TestFlight beta by invitation, App Store coming.</p>;
  }

  const name = OS_NAMES[platform.os];
  if (!downloads) {
    return (
      <div className="primary">
        <a className="btn btn-primary" href={RELEASES_PAGE}>{`Download for ${name}`}</a>
        <p className="detail">Downloads are unavailable right now. Get the latest build on GitHub.</p>
      </div>
    );
  }

  const file = pickFile(downloads.files, platform);
  if (!file) {
    const arch = archLabel(platform.arch) ? ` ${archLabel(platform.arch)}` : "";
    return (
      <p className="detail">
        {`No ${name}${arch} build in ${downloads.version}; `}
        <a href="#downloads">see all downloads</a>.
      </p>
    );
  }

  return (
    <div className="primary">
      <a className="btn btn-primary" href={file.href} download>{`Download for ${name}`}</a>
      <p className="detail">
        {join([downloads.version, FORMAT_LABELS[file.format], archLabel(file.arch), size(file.size)])}
      </p>
    </div>
  );
}

/** Every platform's files, always in the HTML, whatever the visitor's OS. */
export function DownloadList({ downloads }: { downloads: Downloads | null }) {
  if (!downloads) {
    return (
      <p>
        Downloads are unavailable right now. <a href={RELEASES_PAGE}>See all releases on GitHub.</a>
      </p>
    );
  }

  return (
    <>
      <p className="detail">
        Latest build: {downloads.version}. <a href={downloads.releasePage}>Release notes</a> ·{" "}
        <a href={RELEASES_PAGE}>All releases</a>
      </p>
      {groupByOS(downloads.files).map(({ os, files }) => (
        <section key={os} className="platform-files" aria-labelledby={`files-${os}`}>
          <h3 id={`files-${os}`}>{OS_NAMES[os]}</h3>
          <ul>
            {files.map((file) => (
              <FileItem key={file.name} file={file} />
            ))}
          </ul>
        </section>
      ))}
      <section className="platform-files" aria-labelledby="files-ios">
        <h3 id="files-ios">iOS</h3>
        <p>TestFlight beta by invitation, App Store coming.</p>
      </section>
      <section className="platform-files" aria-labelledby="files-checksums">
        <h3 id="files-checksums">Checksums and sources</h3>
        <ul>
          {downloads.checksums ? (
            <li>
              <a href={downloads.checksums}>SHA256SUMS</a>
            </li>
          ) : null}
          {downloads.sources.map((source) => (
            <li key={source.name}>
              <a href={source.browser_download_url}>{source.name}</a>
              <span className="detail"> libmpv source, LGPL</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function FileItem({ file }: { file: DownloadFile }) {
  return (
    <li>
      <a href={file.href} download>{file.name}</a>
      <span className="detail"> {join([FORMAT_LABELS[file.format], archLabel(file.arch), size(file.size)])}</span>
    </li>
  );
}
