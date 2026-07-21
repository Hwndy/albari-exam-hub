import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { buildScanUrl } from '@/lib/scan-url';

export interface IDCardStudent {
  user_id: string;
  full_name: string;
  admission_number?: string | null;
  photo_url?: string | null;
  class_name?: string | null;
  date_of_birth?: string | null;
  blood_group?: string | null;
  emergency_contact?: string | null;
  session?: string | null;
  qr_token?: string | null;
}

export interface IDCardSchool {
  name: string;
  address?: string;
  logo_url?: string | null;
  motto?: string;
  phone?: string;
}

interface Props {
  student: IDCardStudent;
  school: IDCardSchool;
  /** When true, both front & back are stacked (for PNG/PDF export). Default true. */
  showBack?: boolean;
}

const BRAND = 'hsl(142 61% 30%)';         // primary green
const BRAND_DARK = 'hsl(142 61% 20%)';
const LEMON = 'hsl(80 75% 50%)';           // gold/lemon
const INK = '#0f1a12';
const CARD_W = 340;
const CARD_H = 540;

/** Portrait ID card (54 × 86mm). Front + optional Back stacked vertically. */
export const StudentIDCard: React.FC<Props> = ({ student, school, showBack = true }) => {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const logoSrc = school.logo_url || '/albari_logo.jpg';

  useEffect(() => {
    if (!qrRef.current) return;
    // Prefer token URL; fallback to raw token or admission number.
    const payload = student.qr_token
      ? buildScanUrl(student.qr_token)
      : (student.admission_number || '');
    QRCode.toCanvas(qrRef.current, payload, {
      width: 150,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: INK, light: '#ffffff' },
    }).catch(() => {});
  }, [student]);

  const initials = student.full_name
    .split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <div id="student-id-card" className="mx-auto flex flex-col items-center gap-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ============ FRONT ============ */}
      <div
        className="relative bg-white text-black overflow-hidden shadow-2xl"
        style={{ width: CARD_W, height: CARD_H, borderRadius: 18 }}
      >
        {/* Top brand band — arched */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: 168,
            background: `linear-gradient(160deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
            clipPath: 'ellipse(140% 100% at 50% 0%)',
          }}
        />
        {/* Lemon accent ribbon */}
        <div
          className="absolute"
          style={{ top: 152, left: 0, right: 0, height: 6, background: LEMON }}
        />

        {/* Monogram watermark */}
        <div
          aria-hidden
          className="absolute pointer-events-none select-none"
          style={{
            right: -30, top: 200,
            fontSize: 260, lineHeight: 1,
            fontWeight: 900,
            color: BRAND,
            opacity: 0.04,
            letterSpacing: -8,
          }}
        >A</div>

        {/* Header — logo + school */}
        <div className="relative flex items-center gap-2 px-4" style={{ paddingTop: 14 }}>
          <div
            className="shrink-0 rounded-full bg-white flex items-center justify-center overflow-hidden"
            style={{ width: 36, height: 36, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          >
            <img
              src={logoSrc}
              alt=""
              crossOrigin="anonymous"
              className="object-contain"
              style={{ width: 30, height: 30 }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-extrabold uppercase leading-tight truncate" style={{ fontSize: 12, letterSpacing: 0.6 }}>
              {school.name}
            </p>
            <p className="text-white/80 uppercase leading-tight" style={{ fontSize: 8, letterSpacing: 1.2 }}>
              Student Identity Card
            </p>
          </div>
        </div>

        {/* Photo */}
        <div className="relative flex justify-center" style={{ marginTop: 26 }}>
          <div className="relative" style={{ width: 152, height: 152 }}>
            {/* Ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: LEMON, padding: 4 }}
            >
              <div
                className="rounded-full overflow-hidden bg-gray-100 w-full h-full flex items-center justify-center"
                style={{ border: '4px solid #fff' }}
              >
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.full_name}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-black" style={{ color: BRAND, fontSize: 46 }}>
                    {initials}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="relative text-center px-4" style={{ marginTop: 16 }}>
          <p
            className="font-black uppercase truncate"
            style={{ fontSize: 18, color: INK, letterSpacing: 0.4, fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {student.full_name}
          </p>
          {student.class_name && (
            <p
              className="mt-1 inline-block px-3 py-0.5 rounded-full font-semibold"
              style={{ background: `${BRAND}15`, color: BRAND, fontSize: 10, letterSpacing: 0.5 }}
            >
              {student.class_name}
            </p>
          )}
        </div>

        {/* Info rows */}
        <div className="relative px-6 mt-4 space-y-1.5" style={{ fontSize: 10 }}>
          <InfoRow label="REG NO" value={student.admission_number || '—'} mono />
          {student.date_of_birth && (
            <InfoRow label="DOB" value={formatDate(student.date_of_birth)} />
          )}
          {student.session && (
            <InfoRow label="SESSION" value={student.session} />
          )}
        </div>

        {/* Signature strip footer */}
        <div
          className="absolute bottom-0 inset-x-0 flex items-center justify-between px-4"
          style={{ height: 44, background: `linear-gradient(90deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}
        >
          <div className="text-white" style={{ fontSize: 8, letterSpacing: 1 }}>
            <p className="opacity-70">PRINCIPAL</p>
            <p className="font-bold" style={{ fontFamily: 'Georgia, serif', fontSize: 11 }}>Al-Bari</p>
          </div>
          <div className="text-white text-right" style={{ fontSize: 7, letterSpacing: 1 }}>
            <p className="opacity-70">SECURE ID</p>
            <p className="font-mono opacity-90">
              {(student.qr_token || student.user_id).slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* ============ BACK ============ */}
      {showBack && (
        <div
          className="relative bg-white text-black overflow-hidden shadow-2xl"
          style={{ width: CARD_W, height: CARD_H, borderRadius: 18 }}
        >
          {/* Slim brand header */}
          <div
            className="absolute inset-x-0 top-0 flex items-center px-4"
            style={{ height: 52, background: `linear-gradient(160deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}
          >
            <p className="text-white uppercase font-bold" style={{ fontSize: 10, letterSpacing: 1.5 }}>
              Verified Identity
            </p>
            <div className="ml-auto" style={{ height: 8, width: 48, background: LEMON, borderRadius: 4 }} />
          </div>

          {/* QR */}
          <div className="relative flex flex-col items-center" style={{ marginTop: 72 }}>
            <div className="p-2 bg-white" style={{ border: `2px solid ${BRAND}`, borderRadius: 12 }}>
              <canvas ref={qrRef} style={{ width: 150, height: 150 }} />
            </div>
            <p className="mt-2 text-center font-semibold" style={{ fontSize: 9, color: INK, letterSpacing: 0.5 }}>
              SCAN TO VERIFY / MARK ATTENDANCE
            </p>
          </div>

          {/* Details */}
          <div className="absolute inset-x-0 px-5" style={{ top: 300 }}>
            <div className="rounded-lg p-3" style={{ background: `${BRAND}08`, border: `1px solid ${BRAND}22` }}>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5" style={{ fontSize: 9 }}>
                <Field k="Blood Group" v={student.blood_group || '—'} />
                <Field k="Class" v={student.class_name || '—'} />
                <Field k="Emergency" v={student.emergency_contact || school.phone || '—'} />
                <Field k="Session" v={student.session || '—'} />
              </div>
            </div>

            <p className="mt-3 text-center" style={{ fontSize: 8, color: '#555', lineHeight: 1.5 }}>
              This card remains the property of {school.name}. If found, please return to the school office.
              Misuse is a punishable offence.
            </p>
          </div>

          {/* Microtext strip */}
          <div
            className="absolute inset-x-0 bottom-0 overflow-hidden"
            style={{ height: 24, background: INK }}
          >
            <p
              className="whitespace-nowrap text-white/70"
              style={{ fontSize: 6, letterSpacing: 2, lineHeight: '24px', textAlign: 'center' }}
            >
              {`ALBARI • ALBARI • ALBARI • ALBARI • ALBARI • ALBARI • ALBARI • ALBARI • ALBARI • ALBARI • ALBARI`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-center justify-between border-b" style={{ borderColor: '#00000010', paddingBottom: 3 }}>
    <span className="uppercase" style={{ color: '#666', letterSpacing: 0.8 }}>{label}</span>
    <span
      className="font-bold truncate max-w-[60%] text-right"
      style={{ color: INK, fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined }}
    >{value}</span>
  </div>
);

const Field: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div>
    <p className="uppercase" style={{ color: '#666', fontSize: 7, letterSpacing: 0.8 }}>{k}</p>
    <p className="font-bold truncate" style={{ color: INK }}>{v}</p>
  </div>
);

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

export default StudentIDCard;