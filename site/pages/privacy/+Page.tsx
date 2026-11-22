// The privacy policy. Every claim here is checked against the app and Worker code; change them together.
const CONTACT = "elboletaire@underave.net";

export default function Page() {
  return (
    <article className="narrow-page policy">
      <h1>Privacy policy</h1>
      <p className="updated">Last updated: 22 November 2026</p>

      <p>
        Sonor is a music player for servers you choose. It has no accounts and no ads, and the app carries no
        third-party analytics, tracking or crash-reporting tools. This page says what leaves your device, where it goes
        and why.
      </p>

      <h2>In short</h2>
      <ul>
        <li>Your library, passwords and listening stay between your device and your own music server.</li>
        <li>
          From the app, only the update check reaches us. We count those checks in total, and you can turn them off.
        </li>
        <li>The website counts visits in total through Cloudflare, without cookies or anything that runs in your browser.</li>
        <li>A few optional features contact other services straight from your device. Each one has a switch.</li>
      </ul>

      <h2>Who we are</h2>
      <p>
        Sonor is made by Òscar Casajuana, who decides how the data on this page is handled (the controller). Contact:{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>The update check</h2>
      <p>
        The desktop (macOS, Windows, Linux) and Android builds we publish ask <code>api.sonor.fi</code> for the
        latest release a minute after they start, then once a day while they run, and when you press Check. iPhone
        builds don't check, because TestFlight handles their updates.
      </p>
      <p>Each check sends:</p>
      <ul>
        <li>the app version and the commit it was built from;</li>
        <li>the operating system, the processor type, and whether it's desktop or Android;</li>
        <li>the build's expiry date, for betas;</li>
        <li>
          your language, as a short tag such as <code>ca-ES</code>.
        </li>
      </ul>
      <p>
        Our server records each check with those values, the time, and a hash of your IP address. The hash mixes your
        address with a random value (a salt) that is replaced every calendar month, and the old salt is deleted. We
        don't store your IP address, any other header, or request logs.
      </p>
      <p>
        <strong>The honest limit:</strong> while a month's salt exists, someone with access to our Cloudflare account
        could use it to work out which IP address made a hash, so until then the hash is a pseudonym, not anonymous.
        Cloudflare also keeps about 30 days of backups of that storage, so a deleted salt could be restored within
        that time. After that, the hashes can't be linked to you or to each other across months.
      </p>
      <p>
        <strong>Why:</strong> to tell you when a new version is out, since betas expire, and to count how many people
        use each version and platform, so we know what to support. We only look at totals.{" "}
        <strong>Legal basis:</strong> our legitimate interest (GDPR article 6(1)(f)). You can object at any time: turn
        off Settings › About › Check for updates, and nothing is sent.
      </p>
      <p>
        If <code>api.sonor.fi</code> doesn't answer, the app asks GitHub's public API for the releases instead, without
        any of the values above. When you press Update, the new version is downloaded from GitHub. GitHub sees your IP
        address, as it does for any visitor.
      </p>

      <h2>What the app sends to others</h2>
      <h3>Your music server</h3>
      <p>
        Sonor talks to the Subsonic, OpenSubsonic (Navidrome and the like), Jellyfin or Emby servers you add. It sends
        your username and password or token to sign in, asks for your library, covers, lyrics and audio, and reports
        what you play unless you turn off Settings › Listening › Report plays to the server. Jellyfin and Emby also get
        a random ID that this install makes for itself. Whoever runs your server handles this data, including anything
        the server passes on, such as plays it reports to other services. None of it reaches us.
      </p>
      <h3>Lyrics from LRCLIB</h3>
      <p>
        When your server has no lyrics for a song, Sonor asks <a href="https://lrclib.net">LRCLIB</a> with the song's
        title, artist, album and length. LRCLIB sees your IP address. This is on by default; turn it off with Settings ›
        Privacy › Look up lyrics online.
      </p>
      <h3>Artist pictures from the web</h3>
      <p>
        Some servers link to artist pictures held by other image services. Sonor loads those pictures directly, so
        those services see your IP address and which artists you look at. This is on by default; turn it off with
        Settings › Privacy › Show artist pictures from the web, and only your server is asked. Album covers always come
        from your server.
      </p>
      <h3>Octo</h3>
      <p>
        Octo is an optional extension that some Subsonic servers run, which adds discovery, charts, more lyrics sources
        and animated covers. If your server runs it, Sonor uses those features through your server. Octo may look
        things up on other services on its side, and may point Sonor to pictures or video hosted elsewhere, which Sonor
        then loads directly. Whoever runs that server decides how Octo handles your data.
      </p>
      <h3>Your device</h3>
      <p>
        Media controls, the lock screen, CarPlay, Android Auto and Siri get the details of what is playing so they can
        show and control it. Your operating system handles them; Siri requests are handled by Apple under its terms.
      </p>

      <h2>Other Sonor devices on your network</h2>
      <p>
        Sonor only looks for your other devices, and announces itself to them on your local network, once you choose
        to use Devices; your system may ask for permission to use the local network first. The announcement carries only a random-looking
        ID, a group code and a format number, never your name or the device's name. Every message between your devices
        is encrypted and signed with a key each device works out from your server address, username and saved
        password, so only your own sessions can read them. Nothing of this leaves your local network or reaches us.
      </p>

      <h2>What stays on your device</h2>
      <ul>
        <li>
          Passwords go into your system's keychain (Keychain on macOS and iPhone, Credential Manager on Windows, the
          Secret Service on Linux, the Android keystore). If you choose file storage, or Linux has no keychain, they go
          into a file only your user can read, which is not encrypted. You can also choose not to save them.
        </li>
        <li>Your settings, server addresses and usernames, in Sonor's settings file.</li>
        <li>Caches of covers, lyrics and the next songs, and the songs you download for offline listening.</li>
      </ul>
      <p>Uninstalling Sonor and deleting its folders removes all of this. We never receive a copy.</p>

      <h2>Where to get Sonor</h2>
      <p>
        Desktop and Android builds are downloaded from <a href="https://github.com/sonorhq/sonor/releases">GitHub</a>,
        and the Android app is installed from that file, not from a store. iPhone builds come through Apple's
        TestFlight. GitHub and Apple handle the data of those downloads under their own privacy policies.
      </p>

      <h2>This website</h2>
      <p>
        sonor.fi runs on Cloudflare. It sets no cookies, runs no tracking scripts, and loads no outside fonts, scripts
        or images. To suggest the right download, it reads the system details your browser sends with each visit, and
        keeps none of them. The release list comes from GitHub through our server, not from your browser. Cloudflare
        sees your IP address to deliver the page and protect it from attacks, and keeps its standard traffic
        statistics for us, such as the number of visits and the countries they come from, which we only see in total.
        That is handled under <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's privacy policy</a>.
      </p>

      <h2>Who else handles the data</h2>
      <ul>
        <li>
          Cloudflare runs this website and api.sonor.fi for us, stores the update check records and keeps the
          website's traffic statistics.
        </li>
        <li>
          GitHub, Apple, LRCLIB, the image services your server links to, and your server's operator receive data from
          your device directly, as described above, under their own terms. We don't share or sell anything.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Update check records are deleted after three months, which is how long Cloudflare Analytics Engine keeps them.
        Each month's salt is deleted when the month ends, with backups for up to about 30 days more. We keep nothing
        else.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the GDPR you can ask to access, correct or delete your data, and to restrict or object to its use. You
        can also complain to a data protection authority, such as the Spanish AEPD or the one where you live.
      </p>
      <p>
        In practice we hold no name, email or account for you. The update records can be found only through the hash
        of your IP address, so we can find yours only during the month they were made, and only if you tell us that
        address. Cloudflare doesn't let us delete single records, so they end when they expire after three months. To
        stop new records, turn off Check for updates.
      </p>

      <h2>Children</h2>
      <p>
        Sonor is not aimed at children, and we don't knowingly collect data from anyone, children included, beyond the
        update check described above.
      </p>

      <h2>Changes</h2>
      <p>
        When Sonor starts sending something new, or this page changes in a way that matters, we update it here and
        change the date at the top. The history of this page is public on{" "}
        <a href="https://github.com/sonorhq/sonor.fi">GitHub</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests about your data: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </article>
  );
}
