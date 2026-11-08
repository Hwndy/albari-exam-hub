import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getStudentCreationPassword } from './password.ts';

Deno.test('staff-created student accounts use the requested preset password', () => {
  assertEquals(getStudentCreationPassword(), 'password123');
});