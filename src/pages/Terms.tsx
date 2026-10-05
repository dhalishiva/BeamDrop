import { Link } from 'react-router-dom';
import { DocPage, type DocSection } from '../components/DocPage';
import { COMPANY } from '../legal.config';

const sections: DocSection[] = [
  {
    id: 'about',
    title: 'About these terms',
    body: (
      <>
        <p>
          BeamDrop is a file transfer service operated by {COMPANY.legalName} (&ldquo;
          {COMPANY.brand}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) from {COMPANY.location}. These
          terms are the agreement between you and us when you use BeamDrop on this website.
        </p>
        <p>
          By using BeamDrop you agree to these terms, to our <Link to="/privacy">Privacy policy</Link>{' '}
          and to our <Link to="/acceptable-use">Acceptable use policy</Link>. If you do not agree, do
          not use BeamDrop.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Who can use BeamDrop',
    body: (
      <>
        <p>
          You must be at least 18 years old. If you are younger, you may use BeamDrop only with the
          permission and supervision of a parent or guardian, who is responsible for what you do with
          it.
        </p>
        <p>
          If you use BeamDrop on behalf of an organisation, you confirm that you are allowed to agree
          to these terms for it.
        </p>
      </>
    ),
  },
  {
    id: 'how-it-works',
    title: 'How BeamDrop works',
    body: (
      <>
        <p>
          BeamDrop connects two browsers directly so that one can send a file to the other. Our
          servers help the two devices find each other (this is called signaling). The file itself
          travels from device to device. It is not uploaded to or stored on our servers.
        </p>
        <p>
          On some networks a direct connection is not possible. In that case the transfer may be
          relayed through a server operated by us or our providers. Relayed data stays encrypted
          between your two devices and is not stored.
        </p>
        <p>
          Because BeamDrop does not store your files, we cannot recover a file that fails to arrive.
          Keep the original until you have checked that the copy arrived complete.
        </p>
      </>
    ),
  },
  {
    id: 'your-responsibility',
    title: 'Your responsibility for files',
    body: (
      <>
        <p>
          You are responsible for the files you send and receive: for having the right to send them,
          and for how you use files you receive. We do not see, scan or moderate files.
        </p>
        <p>
          Files can contain harmful code. Only accept files from people you trust, and keep your
          devices protected.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <p>
        You must follow our <Link to="/acceptable-use">Acceptable use policy</Link>, which explains
        what you may not do with BeamDrop and how to report misuse.
      </p>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and changes to the service',
    body: (
      <>
        <p>
          BeamDrop is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. A transfer depends
          on both devices, their browsers and their networks, which we do not control. We do not
          promise that BeamDrop will be uninterrupted or error-free.
        </p>
        <p>
          We may change, limit, suspend or end any part of BeamDrop at any time. This includes adding
          usage limits or paid features. Where reasonably possible, we will announce significant
          changes on this website.
        </p>
      </>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-party services',
    body: (
      <p>
        BeamDrop relies on services from other providers, such as website hosting and STUN servers
        that help devices work out how to connect (currently run by Google). Those providers can see
        technical connection data, such as IP addresses, and handle it under their own terms and
        policies. See our <Link to="/privacy">Privacy policy</Link> for details.
      </p>
    ),
  },
  {
    id: 'ip',
    title: 'Our intellectual property',
    body: (
      <>
        <p>
          BeamDrop, the BeamDrop and {COMPANY.brand} names and logos, this website and the software
          behind it are owned by us or our licensors and are protected by law.
        </p>
        <p>
          You may use BeamDrop as we offer it. You may not copy, modify, reverse engineer, resell or
          use our names or logos without our written permission, except where the law allows it. We
          claim no rights over your files. They stay yours.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    body: (
      <p>
        To the fullest extent the law allows, we give no warranties of any kind, express or implied.
        This includes warranties of merchantability, fitness for a particular purpose and
        non-infringement, and any promise that BeamDrop will be secure, that a file will arrive
        complete, or that a file you receive will be free of harmful code.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limits on our liability',
    body: (
      <>
        <p>
          To the fullest extent the law allows, we are not liable for indirect, incidental, special,
          consequential or punitive damages, or for loss of data, profits, revenue or goodwill, that
          arises from your use of BeamDrop.
        </p>
        <p>
          Our total liability for any claim relating to BeamDrop is limited to the greater of the
          amount you paid us for BeamDrop in the 12 months before the claim and &#8377;1,000. Nothing
          in these terms excludes or limits liability that cannot be excluded or limited by law.
        </p>
      </>
    ),
  },
  {
    id: 'indemnity',
    title: 'Claims against us arising from your use',
    body: (
      <p>
        You agree to cover us against claims, losses and costs (including reasonable legal fees)
        brought by third parties that arise from the files you send, from your breach of these terms
        or the Acceptable use policy, or from your violation of the law or of someone else&rsquo;s
        rights.
      </p>
    ),
  },
  {
    id: 'ending',
    title: 'Suspension and ending',
    body: (
      <>
        <p>
          We may block a code, a device, an IP address or a person, or stop providing BeamDrop, if we
          reasonably believe you have broken these terms, put others or the service at risk, or if the
          law requires it.
        </p>
        <p>
          You can stop using BeamDrop at any time. Sections that by their nature should continue
          after that, such as those on intellectual property, disclaimers, liability and governing
          law, will continue.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>
        We may update these terms. The date at the top of this page shows the latest version. If a
        change is significant, we will make it visible on this website. Using BeamDrop after a change
        means you accept the updated terms.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law and disputes',
    body: (
      <>
        <p>
          These terms are governed by the laws of India. The courts at {COMPANY.courts}, India, have
          exclusive jurisdiction over disputes about them, except where the law gives you the right
          to use another court.
        </p>
        <p>
          If something goes wrong, please write to us first at{' '}
          <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>. We will try to
          resolve it informally.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about these terms: <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>
        .
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <DocPage
      title="Terms of service"
      pageTitle="Terms of service"
      updated={COMPANY.lastUpdated}
      lede="The rules for using BeamDrop, in plain language."
      sections={sections}
    />
  );
}
