import { Link } from 'react-router-dom';
import { DocPage, type DocSection } from '../components/DocPage';
import { COMPANY } from '../legal.config';

const sections: DocSection[] = [
  {
    id: 'summary',
    title: 'The short version',
    body: (
      <p>
        Use BeamDrop to move files between devices and people you know, with their consent. Do not use
        it to harm anyone, break the law, or put the service at risk. This policy is part of our{' '}
        <Link to="/terms">Terms of service</Link>.
      </p>
    ),
  },
  {
    id: 'not-allowed',
    title: 'What is not allowed',
    body: (
      <>
        <p>You may not use BeamDrop to send, receive or share:</p>
        <ul>
          <li>
            Child sexual abuse material, or any sexual content involving minors. We have zero
            tolerance and will report it to the authorities.
          </li>
          <li>Intimate images of a person shared without that person&rsquo;s consent.</li>
          <li>Malware, ransomware, spyware or any file built to damage or take over a device.</li>
          <li>Material that infringes someone else&rsquo;s copyright, trademark or other rights.</li>
          <li>Content that threatens, harasses, defames or incites violence against a person or group.</li>
          <li>Files intended to deceive people, such as phishing kits or fraudulent documents.</li>
          <li>Anything else that is illegal where you or the other person lives.</li>
        </ul>
        <p>
          You may also not send files to people who have not agreed to receive them, or use someone
          else&rsquo;s code or device without permission.
        </p>
      </>
    ),
  },
  {
    id: 'service',
    title: 'Protecting the service',
    body: (
      <>
        <p>You may not:</p>
        <ul>
          <li>Guess or scan for codes, or try to join transfers that are not yours.</li>
          <li>
            Use automated tools or scripts to create transfers in bulk, or to overload or disrupt the
            service.
          </li>
          <li>
            Use BeamDrop as a free relay for streaming, hosting, or distributing files to many people.
          </li>
          <li>Get around limits, blocks or security measures, or probe the service for weaknesses.</li>
          <li>Pretend to be someone else, or misrepresent where a file comes from.</li>
        </ul>
        <p>
          If you are a security researcher and find a vulnerability, please tell us at{' '}
          <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a> before making it
          public.
        </p>
      </>
    ),
  },
  {
    id: 'enforcement',
    title: 'How we enforce this policy',
    body: (
      <>
        <p>
          Files go directly between devices, so we cannot see or remove them. We rely on reports and
          on technical signs of abuse, such as repeated failed attempts to join transfers or unusual
          volume.
        </p>
        <p>
          If we believe this policy has been broken, we may block a code, device or IP address, limit
          or suspend access, and report illegal activity to the authorities. We respond to valid
          legal requests from law enforcement.
        </p>
      </>
    ),
  },
  {
    id: 'report',
    title: 'Report abuse',
    body: (
      <>
        <p>
          Email <a href={`mailto:${COMPANY.supportEmail}?subject=Abuse%20report`}>{COMPANY.supportEmail}</a>{' '}
          with the subject &ldquo;Abuse report&rdquo;. Tell us what happened, when, and anything that
          helps us identify the activity, such as the transfer code or the device label shown on
          screen.
        </p>
        <p>
          <strong>Child safety.</strong> If you come across child sexual abuse material, report it to
          the National Cyber Crime Reporting Portal (cybercrime.gov.in) or to your local police, and
          tell us as well.
        </p>
        <p>
          <strong>Copyright.</strong> If you believe BeamDrop is being used to infringe your
          copyright, send us your contact details, a description of the work, an explanation of how it
          is being infringed, a statement that you are acting in good faith, and a statement that your
          information is accurate and that you own or are authorised to act for the owner. Because we
          do not host or have access to files, we usually cannot remove content, but we will act on
          valid notices where we can, for example by blocking repeat abuse.
        </p>
        <p>
          <strong>Emergencies.</strong> If someone is in immediate danger, contact your local
          emergency services first (112 in India).
        </p>
      </>
    ),
  },
];

export default function AcceptableUse() {
  return (
    <DocPage
      title="Acceptable use policy"
      pageTitle="Acceptable use"
      updated={COMPANY.lastUpdated}
      lede="What you can and cannot do with BeamDrop, and how to report misuse."
      sections={sections}
    />
  );
}
