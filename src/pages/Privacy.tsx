import { Link } from 'react-router-dom';
import { DocPage, type DocSection } from '../components/DocPage';
import { COMPANY } from '../legal.config';

const sections: DocSection[] = [
  {
    id: 'summary',
    title: 'The short version',
    body: (
      <ul>
        <li>Your files go directly between the two devices. They never reach our servers.</li>
        <li>You do not need an account, and we do not ask for your name or email to use BeamDrop.</li>
        <li>
          While two devices are connecting, our service handles a short code and technical connection
          details. It keeps them in memory only, and only for that time.
        </li>
        <li>
          The device you connect to can see your IP address and a short device label, like any direct
          connection.
        </li>
        <li>
          We use Vercel Web Analytics and Speed Insights to count page views and measure how fast
          the site loads. They do not use cookies and never see your files, file names or transfer
          codes. We do not use advertising trackers.
        </li>
      </ul>
    ),
  },
  {
    id: 'who',
    title: 'Who is responsible',
    body: (
      <p>
        {COMPANY.legalName}, {COMPANY.location}, operates BeamDrop and decides how personal data is
        handled. Contact: <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>.
      </p>
    ),
  },
  {
    id: 'what',
    title: 'What we handle, and why',
    body: (
      <ul>
        <li>
          <strong>Your files.</strong> We do not collect, store or read them. They travel directly
          between devices. If a network forces a relay, the data passes through a relay server
          encrypted and is not stored.
        </li>
        <li>
          <strong>File details.</strong> The file name, size and type are sent directly to the other
          device so its owner can decide whether to accept. They are not sent to our servers.
        </li>
        <li>
          <strong>Transfer code and connection details.</strong> To start a transfer, our service
          creates a six-character code and passes connection details between the two devices. These
          include IP addresses and network information. They are held in memory, never written to
          disk by our software, and removed once the devices are connected, when either one leaves,
          or after 15 minutes without a connection.
        </li>
        <li>
          <strong>Device label.</strong> Your browser and operating system, such as &ldquo;Chrome on
          Android&rdquo;, are sent directly to the other device so each side can tell which device it
          is talking to.
        </li>
        <li>
          <strong>Server logs.</strong> Our hosting providers may keep standard logs (IP address,
          time, address requested, errors) under their own retention schedules. We use them only to
          run the service and keep it secure.
        </li>
        <li>
          <strong>Messages to us.</strong> If you email us, we receive your email address and
          message. We use them to reply and to keep a record of your request.
        </li>
      </ul>
    ),
  },
  {
    id: 'other-device',
    title: 'What the other device can see',
    body: (
      <p>
        A direct connection means the other device can learn your public IP address and, in some
        cases, addresses on your local network. Only connect with people you trust.
      </p>
    ),
  },
  {
    id: 'providers',
    title: 'Service providers',
    body: (
      <>
        <p>We use providers for:</p>
        <ul>
          <li>Hosting the website and the connection service.</li>
          <li>
            STUN servers, which help your browser discover how to reach the other device. These are
            currently run by Google, which receives your IP address when your browser contacts them.
          </li>
          <li>
            A relay (TURN) service for networks that block direct connections, if we enable one.
            Relayed traffic is encrypted end to end between your devices.
          </li>
        </ul>
        <p>We do not sell personal data.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and browser storage',
    body: (
      <p>
        BeamDrop does not set cookies. See <Link to="/cookies">Cookies and storage</Link> for the one
        small browser script we use to save large files.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep things',
    body: (
      <p>
        Connection details are kept only as described above. Server logs are kept by our hosting
        providers under their own schedules. Emails you send us are kept for as long as needed to
        handle your request and keep a record of it.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        Files and control messages travel over an encrypted connection between the two devices. Codes
        are random, single-use and short-lived, and our service limits repeated guessing. No system is
        perfectly secure, so share codes only with the person you are sending to.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        BeamDrop is not directed at children, and we do not knowingly collect personal data from
        anyone under 18.
      </p>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <>
        <p>
          Under applicable law, including India&rsquo;s Digital Personal Data Protection Act, 2023,
          and similar laws elsewhere, you may have the right to access, correct or erase personal data
          we hold about you, to withdraw consent, and to complain. Because we hold very little
          personal data, most requests are quick to answer.
        </p>
        <p>
          To make a request or raise a concern, email{' '}
          <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>. If we do not resolve
          it, you may complain to the data protection authority that applies to you.
        </p>
      </>
    ),
  },
  {
    id: 'international',
    title: 'Where data is processed',
    body: (
      <p>
        Our providers may process connection data in countries other than your own. Connection data
        is short-lived and is not used for anything beyond making the connection.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If we change how we handle data, for example by adding new analytics tools, we will update this page
        and the date above, and ask for your consent where the law requires it.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <DocPage
      title="Privacy policy"
      pageTitle="Privacy policy"
      updated={COMPANY.lastUpdated}
      lede="BeamDrop is built so that your files never pass through our servers. This page explains the little data we do handle."
      sections={sections}
    />
  );
}
