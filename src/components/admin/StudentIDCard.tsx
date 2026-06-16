import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export interface IDCardStudent {
  user_id: string;
  full_name: string;
  admission_number?: string | null;
  photo_url?: string | null;
  class_name?: string | null;
}

export interface IDCardSchool {
  name: string;
  address?: string;
  logo_url?: string | null;
  motto?: string;
}

interface Props {
  student: IDCardStudent;
  school: IDCardSchool;
}

export const StudentIDCard: React.FC<Props> = ({ student, school }) => {
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!qrRef.current) return;
    const payload = JSON.stringify({
      id: student.user_id,
      name: student.full_name,
      adm: student.admission_number || '',
      sch: school.name,
    });
    QRCode.toCanvas(qrRef.current, payload, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(() => {});
  }, [student, school]);

  const GREEN = '#0a4f1f';
  const YELLOW = '#fbbf24';
  const DARK = '#1f1f1f';
  const logoSrc = school.logo_url || '/albari_logo.jpg';

  return (
    <div
      id="student-id-card"
      className="relative mx-auto bg-white text-black overflow-hidden shadow-2xl"
      style={{ width: 340, height: 540, borderRadius: 14, fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Faded building/diagonal watermark background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            `linear-gradient(135deg, transparent 0 60%, ${GREEN}11 60% 62%, transparent 62%), ` +
            `linear-gradient(45deg, transparent 0 65%, ${GREEN}11 65% 67%, transparent 67%)`,
          opacity: 0.5,
        }}
      />

      {/* TOP DECORATIVE BANDS */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: 110 }}>
        {/* dark charcoal slab (left) */}
        <div className="absolute top-0 left-0" style={{
          width: '55%', height: 56, background: DARK,
          clipPath: 'polygon(0 0, 100% 0, 86% 100%, 0 100%)',
        }} />
        {/* small yellow tab under it */}
        <div className="absolute" style={{ top: 56, left: 0, width: 16, height: 14, background: YELLOW }} />
        {/* green slab on left */}
        <div className="absolute" style={{
          top: 24, left: 0, width: '45%', height: 56, background: GREEN,
          clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0 100%)',
        }} />
        {/* yellow band right */}
        <div className="absolute top-0 right-0" style={{ width: '55%', height: 24, background: YELLOW }} />
        {/* diagonal green stripes right */}
        <div className="absolute" style={{
          top: 24, right: 0, width: '55%', height: 50,
          backgroundImage: `repeating-linear-gradient(115deg, ${GREEN} 0 7px, #ffffff 7px 13px)`,
        }} />
      </div>

      {/* Header text + logo */}
      <div className="relative flex items-start gap-2 px-3" style={{ paddingTop: 86 }}>
        <img
          src={logoSrc}
          alt=""
          crossOrigin="anonymous"
          className="object-contain shrink-0"
          style={{ width: 52, height: 52 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
        />
        <div className="leading-tight flex-1 min-w-0">
          <p className="font-extrabold uppercase truncate" style={{ color: GREEN, fontSize: 13 }}>
            {school.name}
          </p>
          {school.address && (
            <p className="font-semibold mt-0.5" style={{ color: GREEN, fontSize: 9, lineHeight: 1.2 }}>
              {school.address}
            </p>
          )}
        </div>
      </div>

      {/* Photo */}
      <div className="relative flex justify-center" style={{ marginTop: 24 }}>
        <div
          className="rounded-full overflow-hidden bg-gray-100 flex items-center justify-center"
          style={{ width: 180, height: 180, border: `5px solid ${GREEN}` }}
        >
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={student.full_name}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl font-bold" style={{ color: GREEN }}>
              {student.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Name + ID */}
      <div className="relative text-center px-3" style={{ marginTop: 14 }}>
        <p className="font-black uppercase tracking-tight truncate" style={{ fontSize: 18, color: '#000' }}>
          {student.full_name}
        </p>
        <p className="font-semibold mt-1" style={{ fontSize: 14, color: '#000' }}>
          ID: {student.admission_number || '#########'}
        </p>
        {student.class_name && (
          <p className="font-semibold mt-0.5" style={{ fontSize: 11, color: GREEN }}>
            {student.class_name}
          </p>
        )}
      </div>

      {/* QR */}
      <div className="relative flex justify-center" style={{ marginTop: 10 }}>
        <canvas ref={qrRef} className="bg-white" />
      </div>

      {/* BOTTOM DECORATIVE BANDS */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 70 }}>
        <div className="absolute bottom-0 left-0" style={{
          width: '55%', height: 36, background: GREEN,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 14% 100%)',
        }} />
        <div className="absolute bottom-0 right-0" style={{
          width: '60%', height: 28, background: YELLOW,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 8% 100%)',
        }} />
        <div className="absolute bottom-0 left-0" style={{
          width: 18, height: 22, background: DARK,
        }} />
      </div>
    </div>
  );
};

export default StudentIDCard;