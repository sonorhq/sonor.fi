import { useEffect, useState, type KeyboardEvent } from "react";
import { FORMAT_LABELS, RELEASES_PAGE, groupByOS, pickFile, type DownloadFile } from "../downloads";
import { detectInBrowser } from "../browser-platform";
import { parseOS, type OS, type Platform } from "../platform";
import type { Downloads } from "../../pages/index/+data";

export const OS_NAMES: Record<OS, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  android: "Android",
  ios: "iPhone",
  unknown: "macOS",
};

/** The tabs, in the order of the page; the notes are what the platform adds. */
const TABS: { os: Exclude<OS, "unknown">; note: string }[] = [
  { os: "macos", note: "Media keys · Now Playing" },
  { os: "windows", note: "Media keys · system media controls" },
  { os: "linux", note: "x86_64 · MPRIS" },
  { os: "android", note: "Android Auto" },
  { os: "ios", note: "CarPlay" },
];

/** The platform the page is for: the visitor's, refined in the browser after hydration. ?os= wins over both. */
export function usePlatform(initial: Platform): Platform {
  const [platform, setPlatform] = useState(initial);
  useEffect(() => {
    if (parseOS(new URLSearchParams(location.search).get("os"))) return;
    let live = true;
    void detectInBrowser().then((p) => live && setPlatform(p));
    return () => {
      live = false;
    };
  }, []);
  return platform;
}

/** The tab shown when the system is unknown: the first one, not marked as the visitor's. */
const FIRST_TAB: OS = "macos";

const ARCH_NAMES: Partial<Record<Platform["arch"], string>> = { x64: "x64", arm64: "ARM64" };

const size = (bytes: number | undefined) => (bytes ? `${(bytes / 1024 / 1024).toFixed(0)} MB` : "");

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3v10M5.5 8.5 10 13l4.5-4.5M4 17h12" />
    </svg>
  );
}

interface Primary {
  label: string;
  href: string;
  /** True when the link is a file to download, not a page. */
  file: boolean;
  meta: string;
}

/** What the primary button offers the visitor's platform; unknown systems get macOS. */
function primaryFor(platform: Platform, downloads: Downloads | null): Primary {
  if (platform.os === "unknown") {
    return { label: "Download", href: "#download", file: false, meta: "" };
  }
  const os = platform.os;
  const name = OS_NAMES[os];
  if (os === "ios") {
    return {
      label: "iPhone beta, by invitation",
      href: "#download",
      file: false,
      meta: "TestFlight beta by invitation · App Store coming",
    };
  }
  if (!downloads) {
    return {
      label: `Download for ${name}`,
      href: RELEASES_PAGE,
      file: false,
      meta: "Downloads are unavailable right now. Get the latest build on GitHub.",
    };
  }
  const file = pickFile(downloads.files, { os, arch: platform.arch });
  if (!file) {
    const arch = ARCH_NAMES[platform.arch] ? ` ${ARCH_NAMES[platform.arch]}` : "";
    return {
      label: `Download for ${name}`,
      href: "#download",
      file: false,
      meta: `No ${name}${arch} build in ${downloads.version}; see all downloads.`,
    };
  }
  return {
    label: `Download for ${name}`,
    href: file.href,
    file: true,
    meta: [FORMAT_LABELS[file.format], size(file.size)].filter(Boolean).join(" · "),
  };
}

/** The primary button in the hero row. */
export function PrimaryButton({ platform, downloads }: { platform: Platform; downloads: Downloads | null }) {
  const primary = primaryFor(platform, downloads);
  return (
    <a className="btn btn-primary" href={primary.href} download={primary.file || undefined}>
      <DownloadIcon />
      {primary.label}
    </a>
  );
}

/** The line under the hero row: the file's format and size, or the reason there is no file. Empty when unknown. */
export function PrimaryMeta({ platform, downloads }: { platform: Platform; downloads: Downloads | null }) {
  const meta = primaryFor(platform, downloads).meta;
  return meta ? <p className="meta">{meta}</p> : null;
}

/** The platform tabs, with one panel per platform. Every panel is in the HTML; the tabs only show one. */
export function DownloadTabs({ platform, downloads }: { platform: Platform; downloads: Downloads | null }) {
  // The visitor's platform, once known; an unknown system has none, so no tab is marked.
  const detected = platform.os === "unknown" ? undefined : platform.os;
  const [selected, setSelected] = useState<OS>(detected ?? FIRST_TAB);
  useEffect(() => {
    if (detected) setSelected(detected);
  }, [detected]);

  const select = (os: OS, focus: boolean) => {
    setSelected(os);
    if (focus) document.getElementById(`tab-${os}`)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    select(TABS[(index + step + TABS.length) % TABS.length].os, true);
  };

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Platform">
        {TABS.map((tab, index) => (
          <button
            key={tab.os}
            type="button"
            role="tab"
            id={`tab-${tab.os}`}
            aria-controls={`panel-${tab.os}`}
            aria-selected={selected === tab.os}
            tabIndex={selected === tab.os ? 0 : -1}
            onClick={() => select(tab.os, false)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {OS_NAMES[tab.os]}
            {tab.os === detected ? <span className="here" title="Your platform" /> : null}
          </button>
        ))}
      </div>
      <div className="panels">
        {TABS.map((tab) => (
          <Panel key={tab.os} os={tab.os} note={tab.note} downloads={downloads} hidden={selected !== tab.os} />
        ))}
      </div>
      <p className="fine">
        {downloads?.checksums ? (
          <>
            <a href={downloads.checksums}>SHA256 checksums</a> ·{" "}
          </>
        ) : null}
        {downloads ? (
          <>
            <a href={downloads.releasePage}>Release notes</a> ·{" "}
          </>
        ) : null}
        <a href={RELEASES_PAGE}>All releases</a>
      </p>
    </>
  );
}

function Panel({ os, note, downloads, hidden }: { os: Exclude<OS, "unknown">; note: string; downloads: Downloads | null; hidden: boolean }) {
  const files = downloads ? (groupByOS(downloads.files).find((group) => group.os === os)?.files ?? []) : [];
  return (
    <div className="panel" role="tabpanel" id={`panel-${os}`} aria-labelledby={`tab-${os}`} hidden={hidden}>
      <header>
        <h3>{OS_NAMES[os]}</h3>
        <span>{note}</span>
      </header>
      {os === "ios" ? (
        <div className="soon">
          <p>
            <b>TestFlight beta, by invitation.</b> The App Store release is coming.
          </p>
        </div>
      ) : files.length > 0 ? (
        files.map((file, index) => <FileRow key={file.name} file={file} primary={index === 0} />)
      ) : (
        <div className="soon">
          <p>
            {downloads ? `No ${OS_NAMES[os]} build in ${downloads.version} yet. ` : "Downloads are unavailable right now. "}
            <a href={RELEASES_PAGE}>See all releases on GitHub.</a>
          </p>
        </div>
      )}
    </div>
  );
}

function FileRow({ file, primary }: { file: DownloadFile; primary: boolean }) {
  return (
    <div className="file">
      <strong>
        {FORMAT_LABELS[file.format]} <span className="size">· {size(file.size)}</span>
      </strong>
      <small>{file.name}</small>
      <a className={`btn ${primary ? "btn-primary" : "btn-ghost"}`} href={file.href} download>
        Download
      </a>
    </div>
  );
}
