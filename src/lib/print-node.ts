/**
 * Print a single DOM element without touching the rest of the page.
 *
 * Clones the node (plus every stylesheet on the page) into an offscreen
 * iframe and prints that document. This avoids global `visibility: hidden`
 * print hacks, which silently blank out unrelated pages.
 */
export interface PrintNodeOptions {
  /** CSS @page size, e.g. "A4" or "54mm 85.6mm". Defaults to "A4". */
  pageSize?: string;
  /** CSS @page margin. Defaults to "12mm". */
  pageMargin?: string;
  /** Document title used by the browser's print dialog. */
  title?: string;
}

export async function printNode(
  node: HTMLElement | null,
  { pageSize = 'A4', pageMargin = '12mm', title }: PrintNodeOptions = {},
): Promise<void> {
  if (!node) return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return;
  }

  // Copy stylesheets / inline styles from the host document.
  const head = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style'),
  )
    .map((el) => el.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title ? escapeHtml(title) : document.title}</title>
${head}
<style>
  @page { size: ${pageSize}; margin: ${pageMargin}; }
  html, body {
    background: #fff;
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .no-print { display: none !important; }
</style>
</head>
<body></body>
</html>`);
  doc.close();

  doc.body.appendChild(doc.importNode(node, true));

  // Wait for fonts + images inside the clone before printing.
  await waitForAssets(doc);

  try {
    win.focus();
    win.print();
  } finally {
    // Give the print dialog time to grab the document before teardown.
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  }
}

async function waitForAssets(doc: Document) {
  const images = Array.from(doc.images);
  await Promise.all([
    ...images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
    (doc as any).fonts?.ready ?? Promise.resolve(),
    new Promise<void>((resolve) => window.setTimeout(resolve, 150)),
  ]);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}