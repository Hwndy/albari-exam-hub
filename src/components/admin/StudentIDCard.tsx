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
      width: 110,
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
      {/* Faded X watermark */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            `linear-gradient(135deg, transparent 0 49.5%, ${GREEN} 49.5% 50.3%, transparent 50.3%), ` +
            `linear-gradient(45deg, transparent 0 49.5%, ${GREEN} 49.5% 50.3%, transparent 50.3%)`,
          opacity: 0.08,
        }}
      />

      {/* TOP DECORATIVE BANDS */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: 95 }}>
        {/* Yellow strip across top-right */}
        <div className="absolute top-0" style={{ left: '42%', right: 0, height: 22, background: YELLOW }} />
        {/* Diagonal green/white stripes right block */}
        <div className="absolute" style={{
          top: 22, left: '48%', right: 0, height: 60,
          backgroundImage: `repeating-linear-gradient(115deg, ${GREEN} 0 8px, #ffffff 8px 16px)`,
        }} />
        {/* Dark charcoal slab (top-left) */}
        <div className="absolute top-0 left-0" style={{
          width: '58%', height: 46, background: DARK,
          clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0 100%)',
        }} />
        {/* Green slab overlapping below charcoal */}
        <div className="absolute left-0" style={{
          top: 30, width: '50%', height: 46, background: GREEN,
          clipPath: 'polygon(0 0, 100% 0, 78% 100%, 0 100%)',
        }} />
        {/* Tiny yellow tab */}
        <div className="absolute" style={{ top: 46, left: 0, width: 14, height: 12, background: YELLOW }} />
      </div>

      {/* Logo + school name */}
      <div className="relative flex items-center gap-2 px-3" style={{ paddingTop: 100 }}>
        <img
          src={logoSrc}
          alt=""
          crossOrigin="anonymous"
          className="object-contain shrink-0"
          style={{ width: 44, height: 44 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
        />
        <p className="font-extrabold uppercase truncate flex-1" style={{ color: GREEN, fontSize: 14, letterSpacing: 0.3 }}>
          {school.name}
        </p>
      </div>

      {/* Photo */}
      <div className="relative flex justify-center" style={{ marginTop: 18 }}>
        <div
          className="rounded-full overflow-hidden bg-gray-100 flex items-center justify-center"
          style={{ width: 190, height: 190, border: `4px solid ${GREEN}` }}
        >
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={student.full_name}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-extrabold" style={{ color: GREEN, fontSize: 44 }}>
              {student.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Name + ID + Class */}
      <div className="relative text-center px-3" style={{ marginTop: 12 }}>
        <p className="font-black uppercase truncate" style={{ fontSize: 17, color: '#000', letterSpacing: 0.2 }}>
          {student.full_name}
        </p>
        <p className="font-semibold" style={{ fontSize: 12, color: '#000', marginTop: 4 }}>
          ID: {student.admission_number || '#########'}
        </p>
        {student.class_name && (
          <p className="font-semibold" style={{ fontSize: 11, color: '#000', marginTop: 2 }}>
            {student.class_name}
          </p>
        )}
      </div>

      {/* QR */}
      <div className="relative flex justify-center" style={{ marginTop: 8 }}>
        <canvas ref={qrRef} className="bg-white" style={{ width: 100, height: 100 }} />
      </div>

      {/* BOTTOM DECORATIVE BANDS */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 60 }}>
        {/* Yellow angled slab (behind, right) */}
        <div className="absolute bottom-0 right-0" style={{
          width: '75%', height: 34, background: YELLOW,
          clipPath: 'polygon(18% 0, 100% 0, 100% 100%, 0 100%)',
        }} />
        {/* Green angled slab (front, left) */}
        <div className="absolute bottom-0 left-0" style={{
          width: '62%', height: 42, background: GREEN,
          clipPath: 'polygon(0 30%, 100% 0, 100% 100%, 0 100%)',
        }} />
        {/* Dark charcoal corner tab */}
        <div className="absolute bottom-0 left-0" style={{ width: 16, height: 20, background: DARK }} />
      </div>
    </div>
  );
};

export default StudentIDCard;