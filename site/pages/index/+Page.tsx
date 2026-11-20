import { useData } from "vike-react/useData";
import { DownloadList, PrimaryDownload, usePlatform } from "../../src/components/Download";
import type { Data } from "./+data";

const FEATURES = [
  {
    title: "Subsonic and Navidrome",
    text: "Connect to your Subsonic, OpenSubsonic or Navidrome server and browse the library you already have.",
  },
  {
    title: "Offline downloads",
    text: "Keep albums and songs on the device and play them without a connection.",
  },
  {
    title: "Gapless playback",
    text: "Tracks run into each other without the silence between them.",
  },
  {
    title: "CarPlay and Android Auto",
    text: "Browse and play from the car's screen, on iPhone with CarPlay and on Android with Android Auto.",
  },
  {
    title: "Lyrics",
    text: "See the lyrics of the song that is playing.",
  },
  {
    title: "Media keys and Now Playing",
    text: "Use your keyboard's media keys on the desktop, and see the track in the system's Now Playing or media controls.",
  },
];

export default function Page() {
  const { platform: serverPlatform, downloads } = useData<Data>();
  const platform = usePlatform(serverPlatform);

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">Sonor</h1>
        <p className="lead">
          A music player for your Subsonic and Navidrome server, on desktop, Android and iPhone. Your library, your
          server, and the same player in the car.
        </p>
        <div className="actions">
          <PrimaryDownload platform={platform} downloads={downloads} />
          <a className="btn btn-secondary" href="#downloads">All downloads</a>
        </div>
      </section>

      <section className="section" aria-labelledby="features-title">
        <h2 id="features-title">What it does</h2>
        <ul className="features">
          {FEATURES.map((f) => (
            <li key={f.title} className="card">
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" id="downloads" aria-labelledby="downloads-title">
        <h2 id="downloads-title">Download</h2>
        <p className="lead">
          Sonor runs on Windows, macOS, Linux, Android and iPhone. The iPhone app is a TestFlight beta for now.
        </p>
        <DownloadList downloads={downloads} />
      </section>
    </>
  );
}
