import { Link } from 'react-router-dom';
import { COMPANY } from '../legal.config';
import { Logo } from './Logo';

export function SiteHeader({ tone = 'default' }: { tone?: 'default' | 'blue' }) {
  return (
    <header className="site-header">
      <Logo tone={tone} />
      <nav className="nav" aria-label="Main">
        <Link className="nav__link" to="/help">
          Help
        </Link>
        <Link className={`btn btn--small ${tone === 'blue' ? 'btn--chalk' : 'btn--ink'}`} to="/app">
          Open app
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <Logo />
            <p className="footer__tagline">
              Send files of any size from one device to another. Nothing is uploaded or stored.
            </p>
          </div>

          <nav aria-label="Product">
            <h2 className="footer__heading">Product</h2>
            <ul className="footer__list">
              <li>
                <Link to="/app?mode=send">Send a file</Link>
              </li>
              <li>
                <Link to="/app?mode=receive">Receive a file</Link>
              </li>
              <li>
                <Link to="/help">Help</Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h2 className="footer__heading">Legal</h2>
            <ul className="footer__list">
              <li>
                <Link to="/terms">Terms of service</Link>
              </li>
              <li>
                <Link to="/privacy">Privacy policy</Link>
              </li>
              <li>
                <Link to="/acceptable-use">Acceptable use</Link>
              </li>
              <li>
                <Link to="/cookies">Cookies and storage</Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Contact">
            <h2 className="footer__heading">Contact</h2>
            <ul className="footer__list">
              <li>
                <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>
              </li>
              <li>
                <Link to="/acceptable-use#report">Report abuse</Link>
              </li>
              <li>
                <Link to="/contact">All contact details</Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="footer__legal">
          &copy; {new Date().getFullYear()} {COMPANY.legalName}. BeamDrop is a product of{' '}
          {COMPANY.brand}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
