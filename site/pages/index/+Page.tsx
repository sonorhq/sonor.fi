import { useData } from "vike-react/useData";
import { DownloadTabs, PrimaryButton, PrimaryMeta, usePlatform } from "../../src/components/Downloads";
import { ComingList, CoreFeatures, OctoFeatures } from "../../src/components/Features";
import { Lockup } from "../../src/components/Logo";
import { Screenshots } from "../../src/components/Screenshots";
import type { Data } from "./+data";

export default function Page() {
  const { platform: serverPlatform, downloads } = useData<Data>();
  const platform = usePlatform(serverPlatform);
  const version = downloads?.version;

  return (
    <>
      <section className="hero">
        <div className="col">
          <h1 className="hero-title">
            <Lockup />
          </h1>
          <p className="tagline rise d1">
            A music player for your own Subsonic, Navidrome, Jellyfin or Emby server. <span>On your desktop, your phone and in the car.</span>
          </p>
          <span className="pill rise d2">
            <i aria-hidden="true" />
            {version ? `Public beta · ${version}` : "Public beta"}
          </span>
          <div className="actions rise d3">
            <PrimaryButton platform={platform} downloads={downloads} />
            <a className="btn btn-ghost" href="#download">
              Other platforms
            </a>
          </div>
          <div className="rise d3">
            <PrimaryMeta platform={platform} downloads={downloads} />
          </div>
          <a className="scroll-cue" href="#see">
            See it
          </a>
        </div>
      </section>

      <section id="see" className="see-section">
        <div className="col">
          <h2>Your library, wherever you listen</h2>
          <p className="lede">The same player on macOS, Windows, Linux, Android and iPhone, talking straight to your server.</p>
        </div>
        <div className="col wide">
          <Screenshots />
        </div>
      </section>

      <section id="features">
        <div className="col">
          <h2>Made for listening</h2>
          <p className="lede">
            The things a player has to get right, for libraries you host yourself on Subsonic, OpenSubsonic (Navidrome and the like), Jellyfin or Emby.
          </p>
          <CoreFeatures />
        </div>
      </section>

      <section id="octo">
        <div className="col">
          <h2>With an Octo server</h2>
          <p className="lede">
            Octo is a server extension that runs in front of Navidrome. Everything here needs an Octo server; on any other
            server, Sonor is the player above.
          </p>
          <p className="lede">
            Sonor never downloads music from the internet itself. Your Octo server does, with the tools you connect to it;
            Sonor only shows what it finds and passes on what you pick.
          </p>
        </div>
        <div className="col wide">
          <OctoFeatures />
        </div>
      </section>

      <section id="coming">
        <div className="col">
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
