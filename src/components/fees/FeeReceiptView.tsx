import React from 'react';
import { SchoolBranding } from '@/lib/school-branding';

export interface ReceiptViewField {
  label: string;
  value?: string | null;
}

export interface FeeReceiptViewProps {
  title?: string;
  receiptNumber?: string | null;
  date?: string | null;
  fields: ReceiptViewField[];
  amountLabel?: string;
  amount: number;
  footerNote?: string;
  school: SchoolBranding;
}

const money = (n: number) =>
  '\u20A6' + new Intl.NumberFormat('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n || 0);

/**
 * Branded fee receipt. Uses plain inline styles (no theme tokens) so it renders
 * identically on screen, on paper and inside html2canvas snapshots.
 */
export const FeeReceiptView = React.forwardRef<HTMLDivElement, FeeReceiptViewProps>(
  ({ title = 'FEE RECEIPT', receiptNumber, date, fields, amountLabel = 'Amount Paid', amount, footerNote, school }, ref) => {
    const rows = fields.filter((f) => f.value !== undefined && f.value !== null && String(f.value).trim() !== '');
    const contact = [school.phone && `Tel: ${school.phone}`, school.email && `Email: ${school.email}`]
      .filter(Boolean)
      .join('  |  ');

    return (
      <div
        ref={ref}
        style={{
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          padding: 24,
          boxSizing: 'border-box',
          background: '#ffffff',
          color: '#111827',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          {school.logo_url && (
            <img
              src={school.logo_url}
              alt={`${school.name} logo`}
              crossOrigin="anonymous"
              style={{ height: 64, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }}
            />
          )}
          <h2 style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>{school.name}</h2>
          {school.address && <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{school.address}</p>}
          {contact && <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>{contact}</p>}
          {school.motto && (
            <p style={{ fontSize: 12, fontStyle: 'italic', color: '#6b7280', margin: '2px 0 0' }}>“{school.motto}”</p>
          )}
        </div>

        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            textAlign: 'center',
            margin: '0 0 16px',
            padding: '8px 0',
            borderTop: '1px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          {title}
        </h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Receipt No</p>
            <p style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 0' }}>{receiptNumber || 'N/A'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Date</p>
            <p style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 0' }}>{date || new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div style={{ background: '#f4f6f5', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          {rows.map((f) => (
            <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 14, color: '#6b7280' }}>{f.label}:</span>
              <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{String(f.value)}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#e8f3ee',
            borderRadius: 8,
            padding: 16,
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500, color: '#104e3a' }}>{amountLabel}:</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#104e3a' }}>{money(amount)}</span>
        </div>

        <div style={{ display: 'flex', gap: 32, paddingTop: 24 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px dashed #9ca3af', paddingTop: 8 }}>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                {school.principal_name || 'Authorized Signature'}
              </p>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px dashed #9ca3af', paddingTop: 8 }}>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>School Stamp</p>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 11, textAlign: 'center', color: '#6b7280', marginTop: 24 }}>
          {footerNote || 'This is a computer generated receipt.'}
        </p>
      </div>
    );
  },
);
FeeReceiptView.displayName = 'FeeReceiptView';
