// Shared printable HTML generator for report cards.
// Kept in sync with ReportCardGenerator; consumed by admin/parent/student portals.

export interface ReportCardGrade {
  subject_name: string;
  test1_score: number;
  test2_score: number;
  exam_score: number;
  total: number;
  grade: string;
  subject_position: number;
  class_average: number;
  highest_in_class: number;
  lowest_in_class: number;
  remark: string;
}

export interface ReportCardData {
  student_name: string;
  registration_number: string;
  class_name: string;
  section?: string;
  term: string;
  academic_year: string;
  age: number | null;
  gender: string;
  weight: number | null;
  height: number | null;
  photo_url: string | null;
  grades: ReportCardGrade[];
  total_obtained: number;
  total_max: number;
  average: number;
  position: number;
  total_students: number;
  overall_grade: string;
  attendance: {
    days_school_opened: number;
    days_present: number;
    days_absent: number;
  };
  comments: {
    class_teacher_comment: string;
    head_teacher_comment: string;
    principal_comment: string;
  };
  class_average: number;
  highest_average: number;
  lowest_average: number;
}

export interface ReportCardSchoolInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  motto?: string;
  logo_url?: string;
}

export interface ReportCardAutomation {
  below_max: number;
  average_max: number;
  above_max: number;
  principal_remark_below: string;
  principal_remark_average: string;
  principal_remark_above: string;
  principal_remark_distinction: string;
  show_parent_signature: boolean;
}

export const DEFAULT_REPORT_CARD_AUTOMATION: ReportCardAutomation = {
  below_max: 39,
  average_max: 59,
  above_max: 74,
  principal_remark_below: 'Below Average. Needs to work much harder next term.',
  principal_remark_average: 'A bit above average. Keep pushing to improve.',
  principal_remark_above: 'Far above average. Well done, keep it up.',
  principal_remark_distinction: 'Distinction. Excellent performance!',
  show_parent_signature: false,
};

export const REPORT_CARD_GRADING_SCALE = [
  { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
  { min: 60, max: 69, grade: 'B', remark: 'Very Good' },
  { min: 50, max: 59, grade: 'C', remark: 'Good' },
  { min: 40, max: 49, grade: 'D', remark: 'Pass' },
  { min: 30, max: 39, grade: 'E', remark: 'Poor' },
  { min: 0, max: 29, grade: 'F', remark: 'Fail' },
];

export function getReportCardGrade(percentage: number) {
  return (
    REPORT_CARD_GRADING_SCALE.find(s => percentage >= s.min && percentage <= s.max) || {
      grade: 'F',
      remark: 'Fail',
    }
  );
}

export function generateReportCardHTML(
  card: ReportCardData,
  schoolInfo: ReportCardSchoolInfo,
  automation: ReportCardAutomation = DEFAULT_REPORT_CARD_AUTOMATION,
): string {
  const autoRemark = (avg: number): string => {
    if (avg <= automation.below_max) return automation.principal_remark_below;
    if (avg <= automation.average_max) return automation.principal_remark_average;
    if (avg <= automation.above_max) return automation.principal_remark_above;
    return automation.principal_remark_distinction;
  };
  const principalText =
    card.comments.principal_comment && card.comments.principal_comment.trim()
      ? card.comments.principal_comment
      : autoRemark(card.average);

  const gradeRows = card.grades
    .map(
      g => `
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: left;">${g.subject_name}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${g.test1_score}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${g.test2_score}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${g.exam_score}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${g.total}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${g.grade}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${g.subject_position}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${g.class_average}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${g.highest_in_class}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${g.lowest_in_class}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: left;">${g.remark}</td>
      </tr>`,
    )
    .join('');

  const gradingScaleHTML = REPORT_CARD_GRADING_SCALE.map(
    s => `<span style="margin-right: 15px;"><strong>${s.grade}</strong> (${s.min}-${s.max}%): ${s.remark}</span>`,
  ).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Report Card - ${card.student_name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Times New Roman', serif; max-width: 900px; margin: 0 auto; padding: 20px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
        .school-logo { width: 80px; height: 80px; margin: 0 auto 10px; }
        .school-name { font-size: 22px; font-weight: bold; color: #1a365d; text-transform: uppercase; }
        .school-address { font-size: 11px; color: #333; margin: 5px 0; }
        .school-motto { font-style: italic; color: #666; margin: 5px 0; }
        .report-title { font-size: 16px; font-weight: bold; margin-top: 10px; text-decoration: underline; }
        .info-row { display: flex; gap: 5px; }
        .info-label { font-weight: bold; min-width: 120px; }
        .grades-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
        .grades-table th { background: #1a365d; color: white; padding: 8px 4px; text-align: center; border: 1px solid #000; }
        .grades-table th.subject { text-align: left; }
        .summary-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
        .summary-box { border: 1px solid #000; padding: 10px; text-align: center; }
        .summary-value { font-size: 18px; font-weight: bold; color: #1a365d; }
        .summary-label { font-size: 10px; color: #666; }
        .attendance-row { display: flex; gap: 30px; }
        .attendance-item { display: flex; gap: 5px; }
        .comment-box { border: 1px solid #000; padding: 10px; margin: 10px 0; min-height: 50px; }
        .comment-label { font-weight: bold; margin-bottom: 5px; background: #f0f0f0; padding: 5px; }
        .grading-scale { margin-top: 15px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; font-size: 10px; }
        .signatures { display: grid; grid-template-columns: repeat(${automation.show_parent_signature ? 3 : 2}, 1fr); gap: 30px; margin-top: 40px; }
        .signature-box { text-align: center; }
        .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .grades-table th { background: #1a365d !important; color: white !important; } }
      </style>
    </head>
    <body>
      <div class="header">
        ${schoolInfo.logo_url ? `<img src="${schoolInfo.logo_url}" class="school-logo" alt="School Logo" />` : ''}
        <div class="school-name">${schoolInfo.name || 'School Name'}</div>
        ${schoolInfo.address ? `<div class="school-address">${schoolInfo.address}</div>` : ''}
        ${(schoolInfo.phone || schoolInfo.email) ? `<div class="school-address">${schoolInfo.phone ? 'Tel: ' + schoolInfo.phone : ''}${schoolInfo.phone && schoolInfo.email ? ' | ' : ''}${schoolInfo.email ? 'Email: ' + schoolInfo.email : ''}</div>` : ''}
        ${schoolInfo.motto ? `<div class="school-motto">"${schoolInfo.motto}"</div>` : ''}
        <div class="report-title">STUDENT TERMINAL REPORT</div>
      </div>

      <div style="display:grid;grid-template-columns:110px 1fr 1fr;gap:8px;margin:15px 0;padding:10px;border:1px solid #000;">
        <div style="grid-row: span 5; display:flex; align-items:center; justify-content:center;">
          ${card.photo_url
            ? `<img src="${card.photo_url}" alt="Student" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid #1a365d;" />`
            : `<div style="width:100px;height:100px;border-radius:50%;background:#1a365d;color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;">${(card.student_name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>`
          }
        </div>
        <div class="info-row"><span class="info-label">Name:</span> ${card.student_name}</div>
        <div class="info-row"><span class="info-label">Session:</span> ${card.academic_year}</div>
        <div class="info-row"><span class="info-label">Reg. No:</span> ${card.registration_number}</div>
        <div class="info-row"><span class="info-label">Term:</span> ${card.term}</div>
        <div class="info-row"><span class="info-label">Class:</span> ${card.class_name}${card.section ? ' (' + card.section + ')' : ''}</div>
        <div class="info-row"><span class="info-label">Age:</span> ${card.age || 'N/A'} years</div>
        <div class="info-row"><span class="info-label">Gender:</span> ${card.gender}</div>
        <div class="info-row"><span class="info-label">Weight:</span> ${card.weight ? card.weight + ' kg' : 'N/A'}</div>
        <div class="info-row"><span class="info-label">Position:</span> ${card.position} out of ${card.total_students}</div>
        <div class="info-row"><span class="info-label">Height:</span> ${card.height ? card.height + ' cm' : 'N/A'}</div>
      </div>

      <table class="grades-table">
        <thead>
          <tr>
            <th class="subject">SUBJECT</th>
            <th>TEST 1<br/>(20)</th>
            <th>TEST 2<br/>(20)</th>
            <th>EXAM<br/>(60)</th>
            <th>TOTAL<br/>(100)</th>
            <th>GRADE</th>
            <th>POS.</th>
            <th>CLASS<br/>AVG</th>
            <th>HIGH</th>
            <th>LOW</th>
            <th>REMARK</th>
          </tr>
        </thead>
        <tbody>
          ${gradeRows}
          <tr style="font-weight: bold; background: #f0f0f0;">
            <td style="border: 1px solid #000; padding: 6px;">TOTAL / AVERAGE</td>
            <td colspan="3" style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${card.total_obtained}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${card.overall_grade}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${card.position}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${card.class_average}%</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${card.highest_average}%</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${card.lowest_average}%</td>
            <td style="border: 1px solid #000; padding: 6px;">Average: ${card.average}%</td>
          </tr>
        </tbody>
      </table>

      <div class="summary-section">
        <div class="summary-box"><div class="summary-value">${card.total_obtained}/${card.total_max}</div><div class="summary-label">TOTAL SCORE</div></div>
        <div class="summary-box"><div class="summary-value">${card.average}%</div><div class="summary-label">AVERAGE PERCENTAGE</div></div>
        <div class="summary-box"><div class="summary-value">${card.position}/${card.total_students}</div><div class="summary-label">POSITION IN CLASS</div></div>
      </div>

      <div style="margin:15px 0;">
        <strong>ATTENDANCE RECORD:</strong>
        <div class="attendance-row" style="margin-top: 5px;">
          <div class="attendance-item"><span class="info-label">Days School Opened:</span> ${card.attendance.days_school_opened}</div>
          <div class="attendance-item"><span class="info-label">Days Present:</span> ${card.attendance.days_present}</div>
          <div class="attendance-item"><span class="info-label">Days Absent:</span> ${card.attendance.days_absent}</div>
        </div>
      </div>

      <div style="margin:15px 0;">
        <div class="comment-box"><div class="comment-label">CLASS TEACHER'S REMARKS:</div><div>${card.comments.class_teacher_comment || 'No comment'}</div></div>
        <div class="comment-box"><div class="comment-label">HEAD TEACHER'S REMARKS:</div><div>${card.comments.head_teacher_comment || 'No comment'}</div></div>
        <div class="comment-box"><div class="comment-label">PRINCIPAL'S REMARKS:</div><div>${principalText}</div></div>
      </div>

      <div class="grading-scale"><strong>GRADING SCALE:</strong> ${gradingScaleHTML}</div>

      <div class="signatures">
        <div class="signature-box"><div class="signature-line">Class Teacher's Signature</div></div>
        <div class="signature-box"><div class="signature-line">Principal's Signature</div></div>
        ${automation.show_parent_signature ? `<div class="signature-box"><div class="signature-line">Parent/Guardian's Signature</div></div>` : ''}
      </div>
    </body>
    </html>
  `;
}

export function openReportCardPrintWindow(html: string) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
  return true;
}