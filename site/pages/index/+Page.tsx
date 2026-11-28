import { useData } from "vike-react/useData";
import { DownloadTabs, PrimaryButton, PrimaryMeta, usePlatform } from "../../src/components/Downloads";
import { ComingList, DiscoveryFeatures, FeatureGrid, FlagshipFeatures, VisualBands } from "../../src/components/Features";
import { WaveMark } from "../../src/components/Logo";
import { ScreenshotStage } from "../../src/components/Screenshots";
import type { Data } from "./+data";

export default function Page() {
  const { platform: serverPlatform, downloads } = useData<Data>();
  const platform = usePlatform(serverPlatform);
  const version = downloads?.version;

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy rise">
            <WaveMark />
            <h1 className="hero-title">A music player for your own Subsonic, Navidrome, Jellyfin or Emby server.</h1>
            <p className="hero-sub">
              On your desktop, your phone and in the car. With a discovery provider on your server, Sonor also helps you
              discover new music.
            </p>
            <span className="pill">
              <i aria-hidden="true" />
              {version ? `Public beta · ${version}` : "Public beta"}
            </span>
            <div className="actions">
              <PrimaryButton platform={platform} downloads={downloads} />
              <a className="btn btn-ghost" href="#download">
                Other platforms
              </a>
            </div>
            <PrimaryMeta platform={platform} downloads={downloads} />
          </div>
          {/* The page's largest picture: loaded first, never lazily. */}
          <div className="hero-media">
            <ScreenshotStage id="home" priority />
          </div>
        </div>
      </section>

      <section id="features">
        <div className="wrap">
          <div className="split">
            <div className="split-copy">
              <h2>Made for listening</h2>
              <p className="lede">
                The things a player has to get right, for libraries you host yourself on Subsonic, OpenSubsonic (Navidrome and the like), Jellyfin or Emby.
              </p>
              <p className="lede">The same player on macOS, Windows, Linux, Android and iPhone, talking straight to your server.</p>
            </div>
            <div className="split-media">
              <ScreenshotStage id="nowplaying" />
            </div>
          </div>
          <FlagshipFeatures />
          <FeatureGrid />
          <VisualBands />
        </div>
      </section>

      <section id="discovery">
        <div className="wrap">
          <div className="split">
            <div className="split-copy">
              <h2>Discover new music</h2>
              <p className="lede">
                Sonor can also show you music you don't have yet: mixes made for you, stations, charts and search beyond your
                library. Play what you find, and add what you like to your library on your server.
              </p>
              <p className="lede">
                <a href="/discover">How music discovery works in Sonor</a>
              </p>
            </div>
            <div className="split-media">
              <ScreenshotStage id="discover" />
            </div>
          </div>
          <div className="notes">
            <p className="note">
              Discovery needs a discovery provider on your server. Today that is Octo, which runs in front of Navidrome, or
              Aurral, a music server with its own discovery. More are planned. On any other server, Sonor is the player above.
            </p>
            <p className="note">
              Sonor never downloads music from the internet itself. Your server does, with the tools you connect to it; Sonor
              only shows what it finds and passes on what you pick.
            </p>
          </div>
          <DiscoveryFeatures />
        </div>
      </section>

      <section id="coming">
        <div className="col wide">
          <h2>Coming</h2>
          <p className="lede">Not in Sonor yet.</p>
          <ComingList />
        </div>
      </section>

      <section id="download">
        <div className="col">
          <h2>Get Sonor</h2>
          <p className="lede">{version ? `Public beta ${version}. Pick your platform.` : "Pick your platform."}</p>
          <DownloadTabs platform={platform} downloads={downloads} />
        </div>
      </section>
    </>
  );
}
