// Every claim here must match the app today; change it together with features.ts.
import { FeatureImage } from "../../src/components/Features";
import { DISCOVERY_FEATURES } from "../../src/features";

const discovery = DISCOVERY_FEATURES.find((f) => f.id === "discovery")!;
const copies = DISCOVERY_FEATURES.find((f) => f.id === "copies")!;

export default function Page() {
  return (
    <article className="narrow-page doc">
      <h1>Discover new music for your self-hosted library</h1>

      <p>
        Sonor plays the music on your own server. With music discovery, it also shows you what you don't have yet: mixes
        made for you, stations, charts, and search results from beyond your library. You can play what you find, and ask
        your server to add it to your library.
      </p>

      <FeatureImage feature={discovery} />

      <h2>What music discovery in Sonor gives you</h2>
      <ul>
        <li>
          Mixes made for you on Home, and more on Discover, by genre, artist, mood or decade, depending on your server.
        </li>
        <li>Stations on Home and Discover that keep playing, with Octo.</li>
        <li>
          Charts on their own page, reached from Discover: by country with Octo, or for your server's region with Aurral,
          which adds charts by genre.
        </li>
        <li>Search beyond your library, with the music you don't have marked so you can tell it apart.</li>
        <li>
          Add to library for songs and albums you don't have, and an acquisitions drawer that shows how each request is
          going.
        </li>
        <li>
          A choice of copy when your server finds more than one: with Octo, or on Aurral for accounts allowed to manage
          downloads.
        </li>
        <li>Top songs on artist pages, from your library and beyond it.</li>
      </ul>

      <h2>What you need: a discovery provider</h2>
      <p>
        Discovery comes from software on your server's side that knows about music beyond your library. Sonor calls it a
        discovery provider. Two work today, and more are planned. Sonor checks what your server offers when you sign in,
        and shows only what it supports. On a plain Subsonic, Navidrome, Jellyfin or Emby server none of this appears, and
        Sonor is the music player you already know.
      </p>

      <h3>Octo, for Navidrome</h3>
      <p>
        <a href="https://github.com/winters27/octo">Octo</a> is an extension that runs in front of Navidrome. It gives
        Sonor the most discovery: mixes and stations, charts by country, search for songs, albums and artists you can
        play, adding music with a choice of copy that shows quality, format, size and source, and family requests that
        wait for the owner's approval. It also adds a choice of lyric sources and animated covers on some albums.
      </p>

      <h3>Aurral</h3>
      <p>
        <a href="https://github.com/lklynet/aurral">Aurral</a> is a music server with its own discovery. You sign in to it
        as you would to any Subsonic server, and Sonor adds its mixes made for you, playlists by genre, mood and decade,
        playlists shared from other Aurral servers, and the charts for your server's region, with a chart for each genre.
        Search also finds artists and albums you don't have, and their songs play a 30-second preview. You can add songs
        and albums when your account may add music, and an account allowed to manage downloads can choose another copy of
        a song. Aurral's plugin actions show in a song's menu.
      </p>

      <h2>How adding music to your library works</h2>
      <p>
        When you tap Add to library on a song or album you don't have, Sonor passes the request to your server. The server
        looks for a copy with the tools its owner connected to it, such as Soulseek, and adds it to your library when it
        arrives. Sonor's acquisitions drawer shows how each request is going, from queued to done, or why it failed. With
        Octo it also keeps a log of each step.
      </p>

      <FeatureImage feature={copies} />

      <p>
        Sonor itself never downloads music from the internet. It only shows what your server finds and passes on what you
        pick. What your server fetches, and from where, is up to whoever runs it.
      </p>

      <h2>Get Sonor</h2>
      <p>
        Sonor is in public beta for macOS, Windows, Linux, Android and iPhone. <a href="/#download">Download Sonor for your
        platform</a>, sign in to your server, and discovery shows up on Home and Discover when your server has a provider.
        For what the player does on any server, see <a href="/#features">the music player's features</a>.
      </p>
    </article>
  );
}
