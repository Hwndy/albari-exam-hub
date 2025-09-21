-- Update the exam dates to make it available to students
UPDATE public.exams 
SET 
  start_date = '2025-09-21 00:00:00+00',
  end_date = '2025-09-25 23:59:59+00',
  updated_at = now()
WHERE id = '45c42a1d-df3f-48c8-bef5-251f1f3bcd65';