import React from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FeeReceiptView, FeeReceiptViewProps } from '@/components/fees/FeeReceiptView';
import { fetchSchoolBranding, SchoolBranding } from '@/lib/school-branding';
import { printNode } from '@/lib/print-node';

export type ReceiptViewData = Omit<FeeReceiptViewProps, 'school'> & { school?: SchoolBranding };

/** Renders the receipt offscreen, hands the node to `fn`, then cleans up. */
async function withRenderedReceipt<T>(
  data: ReceiptViewData,
  fn: (node: HTMLElement) => Promise<T>,
): Promise<T> {
  const school = data.school || (await fetchSchoolBranding());

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '760px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(React.createElement(FeeReceiptView, { ...data, school }));

  // Let React paint, then wait for the logo image + fonts.
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  await Promise.all([
    ...Array.from(host.querySelectorAll('img')).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
    (document as any).fonts?.ready ?? Promise.resolve(),
  ]);

  const node = host.firstElementChild as HTMLElement;
  try {
    return await fn(node || host);
  } finally {
    root.unmount();
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}

/** Prints the branded receipt exactly as previewed, on A4. */
export async function printReceiptView(data: ReceiptViewData, title?: string): Promise<void> {
  await withRenderedReceipt(data, async (node) => {
    await printNode(node, { pageSize: 'A4', pageMargin: '12mm', title: title || data.receiptNumber || 'Receipt' });
  });
}

/** Downloads the branded receipt as an A4 PDF, matching the preview pixel for pixel. */
export async function downloadReceiptView(data: ReceiptViewData, filename: string): Promise<void> {
  await withRenderedReceipt(data, async (node) => {
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const maxW = pageW - margin * 2;
    const imgH = (canvas.height / canvas.width) * maxW;
    const height = Math.min(imgH, pageH - margin * 2);
    const width = height < imgH ? (canvas.width / canvas.height) * height : maxW;
    doc.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      (pageW - width) / 2,
      margin,
      width,
      height,
    );
    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  });
}
