-- Create notification templates table
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id),
  name TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sms', 'email')),
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notification queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id),
  template_id UUID REFERENCES public.notification_templates(id),
  recipient_type VARCHAR(50),
  recipients JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create student ID cards table for tracking generated cards
CREATE TABLE IF NOT EXISTS public.student_id_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id),
  student_id UUID NOT NULL,
  card_number VARCHAR(50) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_id_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_templates
CREATE POLICY "Users can view notification templates from their school" ON public.notification_templates
  FOR SELECT USING (is_same_school(school_id));

CREATE POLICY "Admins can manage notification templates" ON public.notification_templates
  FOR ALL USING (is_admin() AND is_same_school(school_id));

-- RLS Policies for notification_queue
CREATE POLICY "Users can view notification queue from their school" ON public.notification_queue
  FOR SELECT USING (is_same_school(school_id));

CREATE POLICY "Admins can manage notification queue" ON public.notification_queue
  FOR ALL USING (is_admin() AND is_same_school(school_id));

-- RLS Policies for student_id_cards
CREATE POLICY "Users can view student ID cards from their school" ON public.student_id_cards
  FOR SELECT USING (is_same_school(school_id));

CREATE POLICY "Admins can manage student ID cards" ON public.student_id_cards
  FOR ALL USING (is_admin() AND is_same_school(school_id));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_school ON public.notification_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_school ON public.notification_queue(school_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_student_id_cards_school ON public.student_id_cards(school_id);
CREATE INDEX IF NOT EXISTS idx_student_id_cards_student ON public.student_id_cards(student_id);