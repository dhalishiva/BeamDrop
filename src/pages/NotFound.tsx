import { Link } from 'react-router-dom';
import { SiteFooter, SiteHeader } from '../components/Layout';
import { usePageTitle } from '../lib/hooks';

export default function NotFound() {
  usePageTitle('Page not found · BeamDrop by Kriosity');
  return (
    <>
      <SiteHeader />
      <main className="container notfound" id="main">
        <h1>That page does not exist.</h1>
        <p className="section__lede">The link may be old or mistyped.</p>
        <Link className="btn btn--primary" to="/">
          Go to the BeamDrop home page
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
