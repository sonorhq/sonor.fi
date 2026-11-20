import { useData } from "vike-react/useData";
import { DownloadTabs, PrimaryDownload, usePlatform } from "../../src/components/Downloads";
import { Lockup } from "../../src/components/Logo";
import { Screenshots } from "../../src/components/Screenshots";
import type { Data } from "./+data";

const FEATURES = [
  {
    title: "Offline downloads",
    text: "Keep albums and songs on the device and play them with no connection.",
    where: "Desktop · Android · iPhone",
  },
  {
    title: "Gapless playback",
    text: "Live albums and continuous mixes run straight through, with no silence between tracks.",
    where: "Everywhere",
  },
  {
    title: "CarPlay and Android Auto",
    text: "Browse your library and play from the car's own screen.",
    where: "iPhone · Android",
  },
  {
    title: "Lyrics",
    text: "Follow the words of the song that's playing.",
    where: "Everywhere",
  },
  {
    title: "Media keys and Now Playing",
    text: "Your keyboard's media keys work, and the track shows up in the system's Now Playing controls.",
    where: "macOS · Windows · Linux",
  },
];

export default function Page() {
  const { platform: serverPlatform, downloads } = useData<Data>();
  const platform = usePlatform(serverPlatform);
  const version = downloads?.version;

  return (
    <>
      <section className="hero">
        <div className="col">
          <h1 style={{ margin: 0 }}>
            <Lockup />
          </h1>
          <p className="tagline rise d1">
            A music player for your own Subsonic or Navidrome server. <span>On your desktop, your phone and in the car.</span>
          </p>
          <span className="pill rise d2">
            <i aria-hidden="true" />
            {version ? `Public beta · ${version}` : "Public beta"}
          </span>
          <div className="actions rise d3">
            <PrimaryDownload platform={platform} downloads={downloads} />
            <a className="btn btn-ghost" href="#download">
              Other platforms
            </a>
          </div>
          <a className="scroll-cue" href="#see">
            See it
          </a>
        </div>
      </section>

      <section id="see" style={{ paddingTop: "2rem" }}>
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
            The things a player has to get right, for libraries you host yourself on Subsonic, OpenSubsonic or Navidrome.
          </p>
          <ul className="features">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <span className="where">{feature.where}</span>
              </li>
            ))}
          </ul>
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
