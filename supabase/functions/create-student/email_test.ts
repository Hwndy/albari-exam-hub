import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { generateStudentEmail } from './email.ts';

Deno.test('student email is generated from the full name at albari.com.ng', () => {
  assertEquals(
    generateStudentEmail('KAREEMAT AYOMIDE ADEOSUN'),
    'kareemat.ayomide.adeosun@albari.com.ng',
  );
});

Deno.test('student email gets a numeric suffix when the same name repeats', () => {
  assertEquals(
    generateStudentEmail('Kareemat Ayomide Adeosun', 2),
    'kareemat.ayomide.adeosun.2@albari.com.ng',
  );
});