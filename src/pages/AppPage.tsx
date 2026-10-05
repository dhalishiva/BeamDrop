import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Progress } from '../components/Progress';
import { QrCode } from '../components/QrCode';
import { SiteHeader } from '../components/Layout';
import { CODE_PATTERN, cleanCode, receiveLink, warmUpSignaling } from '../lib/config';
import { formatBytes, groupCode } from '../lib/format';
import { usePageTitle, useReceive, useSend } from '../lib/hooks';
import { registerDownloadWorker, saveSupport } from '../lib/sink';

type Mode = 'send' | 'receive';

// Spoken once per status change for screen reader users; progress ticks are not announced.
const SEND_ANNOUNCEMENTS: Record<string, string> = {
  starting: 'Setting up your transfer.',
  waiting: 'Your code is ready. Waiting for the other device.',
  connecting: 'Connecting to the other device.',
  'awaiting-accept': 'Connected. Waiting for them to accept the file.',
  sending: 'Sending the file.',
  finishing: 'Everything is sent. Waiting for the other device to finish saving.',
  done: 'The file was sent.',
  failed: 'The transfer did not finish.',
};
const RECEIVE_ANNOUNCEMENTS: Record<string, string> = {
  connecting: 'Connecting to the sending device.',
  offer: 'A file is waiting for you to accept it.',
  receiving: 'Receiving the file.',
  finishing: 'Finishing up.',
  done: 'The file was received.',
  failed: 'The transfer did not finish.',
};

export default function AppPage() {
  usePageTitle('BeamDrop: send or receive a file');
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('mode') === 'receive' ? 'receive' : 'send';

  const send = useSend();
  const receive = useReceive();
  const busy = send.active || receive.active;
  const announcement =
    mode === 'send' ? SEND_ANNOUNCEMENTS[send.snapshot?.status ?? ''] : RECEIVE_ANNOUNCEMENTS[receive.snapshot?.status ?? ''];

  // Register the download worker early so receiving can stream straight to disk.
  useEffect(() => {
    void registerDownloadWorker();
    warmUpSignaling();
  }, []);

  const choose = (next: Mode) => {
    if (busy || next === mode) return;
    const nextParams = new URLSearchParams(params);
    nextParams.set('mode', next);
    if (next === 'send') nextParams.delete('code');
    setParams(nextParams, { replace: true });
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main className="app-main" id="main">
        <h1 className="app-title">{mode === 'send' ? 'Send a file' : 'Receive a file'}</h1>
        <p className="app-sub">
          {mode === 'send'
            ? 'Choose a file and share the code. It streams straight to the other device and is never uploaded.'
            : 'Enter the code from the sending device. You choose whether to accept the file.'}
        </p>

        <div className="modes" role="tablist" aria-label="Send or receive">
          {(['send', 'receive'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              className="modes__tab"
              aria-selected={mode === m}
              aria-disabled={busy && mode !== m}
              title={busy && mode !== m ? 'Finish or cancel the current transfer first' : undefined}
              onClick={() => choose(m)}
            >
              {m === 'send' ? 'Send' : 'Receive'}
            </button>
          ))}
        </div>

        <p className="visually-hidden" role="status">
          {announcement}
        </p>

        <div className="panel" role="tabpanel">
          {mode === 'send' ? <SendPanel send={send} /> : <ReceivePanel receive={receive} initialCode={params.get('code')} />}
        </div>
      </main>
    </div>
  );
}

/* ================================================================= SEND */

function SendPanel({ send }: { send: ReturnType<typeof useSend> }) {
  const { snapshot, start, cancel, reset } = send;
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const status = snapshot?.status;
  const peer = snapshot?.peerDevice ?? 'the other device';

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const copyLink = async () => {
    if (!snapshot?.code) return;
    try {
      await navigator.clipboard.writeText(receiveLink(snapshot.code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the code and QR are still on screen */
    }
  };

  // Nothing started yet, or the person cancelled.
  if (!snapshot || status === 'cancelled') {
    if (!file) {
      return (
        <label
          className={dragging ? 'drop drop--over' : 'drop'}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={input}
            className="visually-hidden"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <span className="drop__title">Choose a file to send</span>
          <span className="drop__hint">or drop it here. Any size.</span>
        </label>
      );
    }
    return (
      <div className="stack">
        <FileCard name={file.name} size={file.size} />
        <div className="row">
          <button className="btn btn--primary" type="button" onClick={() => start(file)}>
            Share file
          </button>
          <button className="btn btn--ghost" type="button" onClick={() => setFile(null)}>
            Choose a different file
          </button>
        </div>
      </div>
    );
  }

  if (status === 'starting') {
    return (
      <p>
        <span className="spinner" aria-hidden="true" />
        Setting up your transfer…
        <SlowHint />
      </p>
    );
  }

  if (status === 'waiting' && snapshot.code) {
    return (
      <div className="stack">
        <div>
          <h2 className="panel__title">Waiting for the other device</h2>
          <p className="panel__text">
            On the other device, open BeamDrop, choose Receive, and enter this code. The code works
            for 15 minutes.
          </p>
        </div>
        <div className="share">
          <div className="stack">
            <p className="code" aria-label={`Code ${snapshot.code.split('').join(' ')}`}>
              {groupCode(snapshot.code)}
            </p>
            <div className="row">
              <button className="btn btn--ghost btn--small" type="button" onClick={copyLink}>
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            </div>
          </div>
          <QrCode value={receiveLink(snapshot.code)} label="QR code that opens BeamDrop with this code filled in" />
        </div>
        <FileCard name={snapshot.name} size={snapshot.size} />
        <div className="row">
          <button className="btn btn--ghost" type="button" onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="stack">
        <p>
          <span className="spinner" aria-hidden="true" />
          Connecting to the other device…
        </p>
        <div className="row">
          <button className="btn btn--ghost" type="button" onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (status === 'awaiting-accept') {
    return (
      <div className="stack">
        <div>
          <h2 className="panel__title">Waiting for them to accept</h2>
          <p className="panel__text">
            Connected to {peer}. The transfer starts as soon as they accept the file.
          </p>
        </div>
        <FileCard name={snapshot.name} size={snapshot.size} />
        <div className="row">
          <button className="btn btn--ghost" type="button" onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (status === 'sending' || status === 'finishing') {
    return (
      <div className="stack">
        <div>
          <h2 className="panel__title">{status === 'sending' ? `Sending to ${peer}` : 'Almost done'}</h2>
          <p className="panel__text">
            {status === 'sending'
              ? 'Keep both devices open and online until it finishes.'
              : `Everything is sent. Waiting for ${peer} to finish saving the file.`}
          </p>
        </div>
        <FileCard name={snapshot.name} size={snapshot.size} />
        <Progress
          done={snapshot.sent}
          total={snapshot.size}
          speed={snapshot.speed}
          label="Sending"
        />
        <div className="row">
          <button className="btn btn--ghost" type="button" onClick={cancel}>
            Cancel transfer
          </button>
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="stack">
        <div className="notice notice--ok" role="status">
          <strong>Sent</strong>
          {snapshot.name} ({formatBytes(snapshot.size)}) reached {peer}.
        </div>
        <Progress done={snapshot.size} total={snapshot.size} speed={0} label="Sent" finished />
        <div className="row">
          <button
            className="btn btn--primary"
            type="button"
            onClick={() => {
              reset();
              setFile(null);
            }}
          >
            Send another file
          </button>
        </div>
      </div>
    );
  }

  // failed
  return (
    <div className="stack">
      <div className="notice notice--error" role="alert">
        <strong>The transfer did not finish</strong>
        {snapshot.error?.message}
      </div>
      <div className="row">
        <button className="btn btn--primary" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}

/* =============================================================== RECEIVE */

function ReceivePanel({
  receive,
  initialCode,
}: {
  receive: ReturnType<typeof useReceive>;
  initialCode: string | null;
}) {
  const { snapshot, connect, accept, decline, cancel, reset } = receive;
  const [code, setCode] = useState(cleanCode(initialCode ?? ''));

  // Opening a link or scanning the QR code connects straight away. The cleanup makes this safe
  // when React replays effects in development: the first session is dropped before the second starts.
  useEffect(() => {
    const fromLink = cleanCode(initialCode ?? '');
    if (!CODE_PATTERN.test(fromLink)) return;
    connect(fromLink);
    return () => reset();
    // Only on first show: later changes to the URL must not restart a transfer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = snapshot?.status;
  const offer = snapshot?.offer;

  if (!snapshot || status === 'cancelled') {
    const ready = CODE_PATTERN.test(code);
    return (
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) connect(code);
        }}
      >
        <div>
          <label className="field-label" htmlFor="code">
            Code from the sending device
          </label>
          <input
            id="code"
            className="code-input"
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            placeholder="ABC123"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={6}
            enterKeyHint="go"
          />
        </div>
        <div className="row">
          <button className="btn btn--primary" type="submit" disabled={!ready}>
            Connect
          </button>
        </div>
      </form>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="stack">
        <p>
          <span className="spinner" aria-hidden="true" />
          Connecting to the sending device…
        </p>
        <SlowHint />
        <div className="row">
          <button className="btn btn--ghost" type="button" onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (status === 'offer' && offer) {
    const support = saveSupport(offer.size);
    return (
      <div className="stack">
        <div>
          <h2 className="panel__title">{offer.device} wants to send you a file</h2>
          <p className="panel__text">Only accept files from people you trust.</p>
        </div>
        <FileCard name={offer.name} size={offer.size} />

        {!support.ok ? (
          <div className="notice notice--error" role="alert">
            <strong>This browser cannot save a file this large</strong>
            Open BeamDrop in a current version of Chrome or Edge, then ask the sender to start again.
          </div>
        ) : (
          <p className="small">
            {support.kind === 'filesystem'
              ? 'You will choose where to save it.'
              : 'It will be saved to your Downloads folder.'}
          </p>
        )}

        {snapshot.saveDismissed ? (
          <div className="notice" role="status">
            You closed the save dialog. Accept again when you are ready.
          </div>
        ) : null}

        <div className="row">
          {support.ok ? (
            <button className="btn btn--primary" type="button" onClick={accept}>
              Accept and save
            </button>
          ) : null}
          <button className="btn btn--ghost" type="button" onClick={decline}>
            Decline
          </button>
        </div>
      </div>
    );
  }

  if ((status === 'receiving' || status === 'finishing') && offer) {
    return (
      <div className="stack">
        <div>
          <h2 className="panel__title">{status === 'receiving' ? 'Receiving' : 'Finishing up'}</h2>
          <p className="panel__text">
            {status === 'receiving'
              ? 'Keep both devices open and online until it finishes.'
              : 'Closing the file. This can take a moment for large files.'}
          </p>
        </div>
        <FileCard name={offer.name} size={offer.size} />
        <Progress
          done={snapshot.received}
          total={offer.size}
          speed={snapshot.speed}
          label="Receiving"
        />
        {status === 'receiving' ? (
          <div className="row">
            <button className="btn btn--ghost" type="button" onClick={cancel}>
              Cancel transfer
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (status === 'done' && offer) {
    const kind = saveSupport(offer.size);
    return (
      <div className="stack">
        <div className="notice notice--ok" role="status">
          <strong>Received</strong>
          {offer.name} ({formatBytes(offer.size)}){' '}
          {kind.ok && kind.kind === 'filesystem'
            ? 'was saved where you chose.'
            : 'was saved to your Downloads folder.'}
        </div>
        <Progress done={offer.size} total={offer.size} speed={0} label="Received" finished />
        <div className="row">
          <button
            className="btn btn--primary"
            type="button"
            onClick={() => {
              reset();
              setCode('');
            }}
          >
            Receive another file
          </button>
        </div>
      </div>
    );
  }

  // failed
  return (
    <div className="stack">
      <div className="notice notice--error" role="alert">
        <strong>The transfer did not finish</strong>
        {snapshot.error?.message}
      </div>
      <div className="row">
        <button className="btn btn--primary" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}

/** After a few seconds, explain why: an idle connection service can take up to a minute to wake. */
function SlowHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 6000);
    return () => clearTimeout(timer);
  }, []);
  return show ? (
    <span className="small" style={{ display: 'block', marginTop: '0.5rem' }}>
      Still connecting. If the service was idle, it can take up to a minute to wake up.
    </span>
  ) : null;
}

function FileCard({ name, size }: { name: string; size: number }) {
  return (
    <div className="file">
      <span className="file__name">{name}</span>
      <span className="file__meta">{formatBytes(size)}</span>
    </div>
  );
}
