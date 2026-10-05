import { Link } from 'react-router-dom';
import { DocPage, type DocSection } from '../components/DocPage';
import { COMPANY } from '../legal.config';

const sections: DocSection[] = [
  {
    id: 'cookies',
    title: 'Cookies',
    body: <p>BeamDrop does not set cookies.</p>,
  },
  {
    id: 'worker',
    title: 'The download helper',
    body: (
      <>
        <p>
          When you receive a file, BeamDrop may install a small script in your browser called a
          service worker. It lets your browser save a large file straight to storage as it arrives,
          instead of holding the whole file in memory.
        </p>
        <p>
          The script contains no personal data and is not used for tracking. You can remove it at any
          time in your browser&rsquo;s site settings.
        </p>
      </>
    ),
  },
  {
    id: 'tracking',
    title: 'Analytics and advertising',
    body: (
      <p>
        BeamDrop uses Vercel Web Analytics and Speed Insights to count page views and measure page
        speed. They are cookie-free, collect no personal profile, and do not see your files, file
        names or transfer codes. BeamDrop does not use advertising trackers. If that changes, we will
        update this page and ask for your consent where the law requires it.
      </p>
    ),
  },
  {
    id: 'third-party',
    title: 'Third-party connections',
    body: (
      <p>
        To connect two devices, your browser contacts STUN servers (currently run by Google), which
        see your IP address. This is part of how direct connections work and is not a cookie or
        tracker. See the <Link to="/privacy">Privacy policy</Link> for details, or email{' '}
        <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a> with questions.
      </p>
    ),
  },
];

export default function Cookies() {
  return (
    <DocPage
      title="Cookies and storage"
      updated={COMPANY.lastUpdated}
      lede="What BeamDrop stores in your browser. Very little."
      sections={sections}
    />
  );
}
