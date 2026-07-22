// Sprint E: consistent client-side upload validation.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export const DOCUMENT_MIME = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

export const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function validateUpload(file: File, opts?: { allow?: Set<string>; maxBytes?: number }): string | null {
  const max = opts?.maxBytes ?? MAX_UPLOAD_BYTES;
  const allow = opts?.allow ?? DOCUMENT_MIME;
  if (file.size > max) return `File is larger than ${(max / 1024 / 1024).toFixed(0)}MB`;
  if (file.type && !allow.has(file.type)) return `File type ${file.type} is not allowed`;
  return null;
}