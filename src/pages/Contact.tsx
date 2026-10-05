import { Link } from 'react-router-dom';
import { DocPage } from '../components/DocPage';
import { COMPANY } from '../legal.config';

export default function Contact() {
  return (
    <DocPage title="Contact" lede="Real people read these addresses." toc={false}>
      <dl className="contact-list">
        <div>
          <dt>Help, bug reports and legal notices</dt>
          <dd>
            <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>
            <br />
            Include the browser and device on each side and what you saw on screen. Try the{' '}
            <Link to="/help">Help page</Link> first for common fixes.
          </dd>
        </div>
        <div>
          <dt>Abuse reports</dt>
          <dd>
            <a href={`mailto:${COMPANY.supportEmail}?subject=Abuse%20report`}>{COMPANY.supportEmail}</a>
            <br />
            See <Link to="/acceptable-use#report">how to report abuse</Link>.
          </dd>
        </div>
        <div>
          <dt>General questions and partnerships</dt>
          <dd>
            <a href={`mailto:${COMPANY.generalEmail}`}>{COMPANY.generalEmail}</a>
          </dd>
        </div>
        <div>
          <dt>Who runs BeamDrop</dt>
          <dd>
            {COMPANY.legalName}, {COMPANY.location}.
            {COMPANY.address ? (
              <>
                <br />
                {COMPANY.address}
              </>
            ) : null}
            <br />
            BeamDrop is a product of <a href={COMPANY.website}>{COMPANY.brand}</a>.
          </dd>
        </div>
      </dl>
    </DocPage>
  );
}
