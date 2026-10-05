import { Link } from 'react-router-dom';
import { DocPage } from '../components/DocPage';
import { COMPANY } from '../legal.config';

interface Item {
  q: string;
  a: string[];
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Sending',
    items: [
      {
        q: 'How do I send a file?',
        a: [
          'Open BeamDrop, choose Send, and pick a file. Select Share file to get a six-character code and a QR code.',
          'On the other device, open BeamDrop, choose Receive, and enter the code or scan the QR code. When the file offer appears there, select Accept and save.',
        ],
      },
      {
        q: 'Is there really no size limit?',
        a: [
          'BeamDrop does not set one, because the file is never uploaded. The practical limits are free storage on the receiving device and how long you can keep both devices open. At 10 MB per second, a 10 GB file takes about 17 minutes.',
        ],
      },
      {
        q: 'How long does a code work?',
        a: [
          'A code works for 15 minutes while nobody has joined. Once a device joins, nobody else can use that code.',
        ],
      },
      {
        q: 'Can I send several files or a folder?',
        a: ['One file at a time for now. To send a folder, zip it first and send the zip.'],
      },
      {
        q: 'Can I send to more than one device at once?',
        a: ['Not yet. Each code connects one sender to one receiver.'],
      },
    ],
  },
  {
    title: 'Receiving',
    items: [
      {
        q: 'Where does the file go?',
        a: [
          'In Chrome or Edge on a computer, you choose where to save it. On phones and in other browsers, the browser saves it to your Downloads folder.',
        ],
      },
      {
        q: 'Why does my phone screen need to stay on?',
        a: [
          'The file streams live. If the phone sleeps or you switch to another app, the connection can drop. BeamDrop asks the screen to stay on during a transfer and warns you if you try to leave the page.',
        ],
      },
      {
        q: 'Does it work on iPhone and iPad?',
        a: [
          'BeamDrop is built for current browsers on iPhone and iPad, but iOS limits how browsers handle very large downloads. For files of several gigabytes, receive on a computer or an Android phone if you can.',
        ],
      },
      {
        q: 'Which browsers work?',
        a: [
          'Current versions of Chrome, Edge, Firefox and Safari, on computers and phones. Chrome or Edge on a computer gives the smoothest experience for very large files.',
        ],
      },
    ],
  },
  {
    title: 'Privacy and safety',
    items: [
      {
        q: 'Can you see my files?',
        a: [
          'No. Files go straight from one device to the other over an encrypted connection and never reach our servers. Our service only helps the two devices find each other.',
        ],
      },
      {
        q: 'Who can join my transfer?',
        a: [
          'Anyone who has the code before you share it with the right person, so treat it like a password and do not post it publicly. Nothing is sent until the receiving person accepts, and you can cancel at any time.',
        ],
      },
      {
        q: 'Is it safe to accept a file?',
        a: [
          'Only accept files from people you trust. A file from a stranger can contain malware, whatever app it arrives through.',
        ],
      },
    ],
  },
  {
    title: 'When something goes wrong',
    items: [
      {
        q: 'The two devices cannot connect.',
        a: [
          'Some networks block direct connections. Try these in order: put both devices on the same Wi-Fi, turn off any VPN, use a mobile hotspot on one of them, then start again with a new code.',
        ],
      },
      {
        q: 'The transfer stopped halfway.',
        a: [
          'If either device went to sleep, lost its connection or left the page, the transfer stops. Start a new transfer. BeamDrop cannot resume a stopped transfer yet.',
        ],
      },
      {
        q: 'It says no transfer uses my code.',
        a: [
          'Check the characters. Codes use letters and numbers but never 0, O, 1, I or L. The code may also have expired after 15 minutes, or another device may have joined first. Ask the sender to share a new one.',
        ],
      },
      {
        q: 'The save window did not appear.',
        a: [
          'Your browser only allows it right after you select Accept and save. Select the button again. If you closed the window by mistake, the offer stays on screen.',
        ],
      },
    ],
  },
];

export default function Help() {
  return (
    <DocPage
      title="Help"
      lede="Answers to the most common questions about sending and receiving files with BeamDrop."
      toc={false}
    >
      <div className="faq">
        {GROUPS.map((group) => (
          <section className="faq__group" key={group.title} aria-label={group.title}>
            <h2>{group.title}</h2>
            {group.items.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                {item.a.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </details>
            ))}
          </section>
        ))}
      </div>

      <section className="doc__section" aria-labelledby="still-stuck">
        <h2 id="still-stuck">Still stuck?</h2>
        <p>
          Email <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a> and tell us
          which browser and device each side used, and what you saw on screen. To report misuse, go
          to <Link to="/acceptable-use#report">Report abuse</Link>.
        </p>
      </section>
    </DocPage>
  );
}
