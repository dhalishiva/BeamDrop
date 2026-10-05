import { Link } from 'react-router-dom';
import { BeamHero } from '../components/BeamHero';
import { SiteFooter, SiteHeader } from '../components/Layout';
import { usePageTitle } from '../lib/hooks';

export default function Home() {
  usePageTitle('BeamDrop by Kriosity: send files of any size, device to device');

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="on-blue">
        <SiteHeader tone="blue" />
        <div className="hero__inner">
          <h1 className="hero__title">Send files of any size.</h1>
          <p className="hero__lede">
            Open BeamDrop on both devices and the file streams straight from one to the other.
            Nothing is uploaded, so there is no size limit and no waiting on a server.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--chalk" to="/app?mode=send">
              Send a file
            </Link>
            <Link className="btn btn--outline-chalk" to="/app?mode=receive">
              Receive a file
            </Link>
          </div>
          <BeamHero />
        </div>
      </div>

      <main id="main">
        <section className="section" aria-labelledby="how">
          <div className="container">
            <div className="section__intro">
              <h2 id="how">How it works</h2>
              <p className="section__lede">
                Say you want a 10 GB video on your phone. You do not need a cable, an app or an
                account.
              </p>
            </div>
            <ol className="steps">
              <li className="step">
                <h3 className="step__title">Pick a file</h3>
                <p className="step__body">
                  Open BeamDrop on the sending device, choose the file, and you get a six-character
                  code.
                </p>
              </li>
              <li className="step">
                <h3 className="step__title">Join from the other device</h3>
                <p className="step__body">
                  Open BeamDrop there, enter the code or scan the QR code, and tap Accept.
                </p>
              </li>
              <li className="step">
                <h3 className="step__title">It streams across</h3>
                <p className="step__body">
                  The file travels in small pieces, straight between the two browsers, and is saved
                  as it arrives.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="section section--flush-top" aria-labelledby="why">
          <div className="container split">
            <div>
              <h2 id="why">Why there is no size limit</h2>
              <p className="section__lede">
                Most transfer sites upload your file to a server first, then let the other device
                download it. That is where size caps, waiting and storage costs come from. BeamDrop
                skips the server.
              </p>

              <div className="route">
                <div>
                  <p className="route__label">A typical upload site</p>
                  <div className="route__line" role="img" aria-label="Your computer, then a server, then your phone">
                    <span className="route__node">Your computer</span>
                    <span className="route__wire" />
                    <span className="route__node route__node--server">Server</span>
                    <span className="route__wire" />
                    <span className="route__node">Your phone</span>
                  </div>
                  <p className="route__note">
                    The whole file is stored first, usually with a size cap, and the second device
                    waits for the upload to finish.
                  </p>
                </div>
                <div>
                  <p className="route__label">BeamDrop</p>
                  <div className="route__line" role="img" aria-label="Your computer connected directly to your phone">
                    <span className="route__node">Your computer</span>
                    <span className="route__wire route__wire--beam" />
                    <span className="route__node">Your phone</span>
                  </div>
                  <p className="route__note">
                    The file moves while it is being sent. Nothing is stored, so there is nothing to
                    cap.
                  </p>
                </div>
              </div>
            </div>

            <dl className="facts">
              <div>
                <dt>Nothing to install</dt>
                <dd>BeamDrop runs in the browser on your computer and on your phone.</dd>
              </div>
              <div>
                <dt>Encrypted in transit</dt>
                <dd>
                  The file travels over an encrypted connection between the two devices. Our
                  service only introduces them to each other.
                </dd>
              </div>
              <div>
                <dt>No account</dt>
                <dd>Open the site, pick a file, share the code. There is nothing to sign up for.</dd>
              </div>
              <div>
                <dt>Saved as it arrives</dt>
                <dd>
                  The receiving device writes the file to storage as it comes in, so a 10 GB file
                  never has to fit in memory.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="section section--flush-top" aria-labelledby="limits">
          <div className="container">
            <div className="section__intro">
              <h2 id="limits">Good to know</h2>
              <p className="section__lede">
                Direct transfer is fast and private. It comes with a few trade-offs.
              </p>
            </div>
            <ul className="limits">
              <li>
                <strong>Both devices stay open.</strong>
                <span>
                  The file streams live, so if either device sleeps or leaves the page, the transfer
                  stops. BeamDrop asks your screen to stay on while it works.
                </span>
              </li>
              <li>
                <strong>One file at a time.</strong>
                <span>To send a folder, zip it first and send the zip.</span>
              </li>
              <li>
                <strong>Some networks block direct connections.</strong>
                <span>
                  Office, school and some mobile networks do. If two devices cannot connect, put
                  them on the same Wi-Fi or turn off any VPN.
                </span>
              </li>
              <li>
                <strong>Very large files on iPhone and iPad.</strong>
                <span>
                  Safari may limit very large downloads. For multi-gigabyte files, a computer is the
                  safer receiver.
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="closing section" aria-labelledby="try">
          <div className="container">
            <div className="section__intro">
              <h2 id="try">Try it with a file you have on hand.</h2>
              <p className="section__lede">
                No account and no install. Open BeamDrop on two devices and send something.
              </p>
            </div>
            <div className="closing__actions">
              <Link className="btn btn--chalk" to="/app?mode=send">
                Send a file
              </Link>
              <Link className="btn btn--outline-chalk" to="/app?mode=receive">
                Receive a file
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
