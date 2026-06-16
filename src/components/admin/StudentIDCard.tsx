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
      width: 180,
      margin: 1,
      color: { dark: '#0a3d1f', light: '#ffffff' },
    }).catch(() => {});
  }, [student, school]);

  return (
    <div
      id="student-id-card"
      className="relative mx-auto bg-white text-black overflow-hidden shadow-2xl"
      style={{ width: 340, height: 560, borderRadius: 14 }}
    >
      {/* Top decorative bands */}
      <div className="absolute top-0 left-0 w-full h-24 pointer-events-none">
        <div className="absolute top-0 left-0 w-2/3 h-12 bg-[#1a3d1a]" style={{ clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0% 100%)' }} />
        <div className="absolute top-0 right-0 w-1/2 h-6 bg-[#facc15]" />
        <div className="absolute top-6 right-0 w-1/2 h-8" style={{
          backgroundImage: 'repeating-linear-gradient(135deg, #1a3d1a 0 8px, transparent 8px 18px)',
        }} />
        <div className="absolute top-3 left-1/4 w-10 h-3 bg-[#facc15]" />
      </div>

      {/* Header content */}
      <div className="relative pt-6 px-4 flex items-start gap-3">
        {school.logo_url ? (
          <img src={school.logo_url} alt="" className="w-14 h-14 object-contain shrink-0" crossOrigin="anonymous" />
        ) : (
          <div className="w-14 h-14 rounded bg-[#1a3d1a] text-white flex items-center justify-center text-xs font-bold shrink-0">
            LOGO
          </div>
        )}
        <div className="leading-tight">
          <p className="font-extrabold text-[#1a3d1a] text-sm uppercase">{school.name}</p>
          {school.address && (
            <p className="text-[10px] text-[#1a3d1a] mt-1 font-semibold">{school.address}</p>
          )}
        </div>
      </div>

      {/* Faded school watermark */}
      <div className="absolute inset-x-0 top-32 bottom-32 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(180deg, transparent 0%, #1a3d1a 100%)',
        }}
      />

      {/* Photo */}
      <div className="relative mt-6 flex justify-center">
        <div className="rounded-full overflow-hidden border-[5px] border-[#0a3d1f] bg-muted" style={{ width: 170, height: 170 }}>
          {student.photo_url ? (
            <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#0a3d1f] bg-gray-100">
              {student.full_name.split(' ').map(s => s[0]).slice(0, 2).join('')}
            </div>
          )}
        </div>
      </div>

      {/* Name and ID */}
      <div className="relative mt-4 text-center px-3">
        <p className="font-black text-lg uppercase tracking-wide text-black truncate">
          {student.full_name}
        </p>
        <p className="text-sm font-semibold text-black mt-0.5">
          ID: {student.admission_number || '#########'}
        </p>
        {student.class_name && (
          <p className="text-xs text-[#1a3d1a] font-semibold mt-0.5">{student.class_name}</p>
        )}
      </div>

      {/* QR Code */}
      <div className="relative mt-3 flex justify-center">
        <canvas ref={qrRef} className="bg-white p-1" />
      </div>

      {/* Bottom decorative bands */}
      <div className="absolute bottom-0 left-0 w-full h-16 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-2/3 h-10 bg-[#1a3d1a]" style={{ clipPath: 'polygon(0 100%, 100% 100%, 70% 0, 0 0)' }} />
        <div className="absolute bottom-0 right-0 w-1/2 h-6 bg-[#facc15]" />
        <div className="absolute bottom-6 right-0 w-1/3 h-6" style={{
          backgroundImage: 'repeating-linear-gradient(135deg, #1a3d1a 0 6px, transparent 6px 14px)',
        }} />
      </div>
    </div>
  );
};

export default StudentIDCard;