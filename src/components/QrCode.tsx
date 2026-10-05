import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Renders `value` as a QR code the other device can scan to open the receive screen. */
export function QrCode({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      margin: 1,
      width: 352,
      errorCorrectionLevel: 'M',
      color: { dark: '#101b33', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) return null;
  return <img className="qr" src={src} alt={label} width={176} height={176} />;
}
