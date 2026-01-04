-- Drop tables if they were partially created
DROP TABLE IF EXISTS fee_reminder_logs CASCADE;
DROP TABLE IF EXISTS fee_installments CASCADE;
DROP TABLE IF EXISTS fee_installment_plans CASCADE;
DROP TABLE IF EXISTS staff_attendance CASCADE;
DROP TABLE IF EXISTS staff_details CASCADE;
DROP TABLE IF EXISTS promotion_history CASCADE;

-- Student Promotion History
CREATE TABLE promotion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  student_id UUID NOT NULL REFERENCES students(id),
  from_class_id UUID REFERENCES classes(id),
  to_class_id UUID REFERENCES classes(id),
  academic_year VARCHAR(20) NOT NULL,
  promotion_type VARCHAR(20) NOT NULL CHECK (promotion_type IN ('promoted', 'repeated', 'graduated', 'transferred')),
  promoted_at TIMESTAMPTZ DEFAULT NOW(),
  promoted_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Details
CREATE TABLE staff_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  school_id UUID REFERENCES schools(id),
  employee_id VARCHAR(50),
  department VARCHAR(100),
  designation VARCHAR(100),
  join_date DATE,
  qualifications JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  bank_details JSONB DEFAULT '{}',
  salary DECIMAL(10,2),
  employment_type VARCHAR(20) DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave', 'terminated')),
  emergency_contact JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Attendance
CREATE TABLE staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  staff_id UUID NOT NULL,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'leave', 'half-day', 'late')),
  leave_type VARCHAR(50),
  notes TEXT,
  marked_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- Fee Installment Plans
CREATE TABLE fee_installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  student_id UUID NOT NULL REFERENCES students(id),
  fee_structure_id UUID REFERENCES fee_structures(id),
  total_amount DECIMAL(10,2) NOT NULL,
  number_of_installments INTEGER NOT NULL,
  start_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee Installments
CREATE TABLE fee_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES fee_installment_plans(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  installment_number INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  payment_id UUID REFERENCES fee_payments(id),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee Reminders Log
CREATE TABLE fee_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  student_id UUID REFERENCES students(id),
  installment_id UUID REFERENCES fee_installments(id),
  fee_structure_id UUID REFERENCES fee_structures(id),
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('email', 'sms', 'push')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent',
  error_message TEXT
);

-- Enable RLS on all new tables
ALTER TABLE promotion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_reminder_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for promotion_history
CREATE POLICY "Users can view promotion history for their school" ON promotion_history
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage promotion history" ON promotion_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for staff_details
CREATE POLICY "Users can view staff details for their school" ON staff_details
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can manage staff details" ON staff_details
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR user_id = auth.uid()
  );

-- RLS Policies for staff_attendance
CREATE POLICY "Users can view staff attendance for their school" ON staff_attendance
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage staff attendance" ON staff_attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for fee_installment_plans
CREATE POLICY "Users can view fee installment plans for their school" ON fee_installment_plans
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage fee installment plans" ON fee_installment_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for fee_installments
CREATE POLICY "Users can view fee installments for their school" ON fee_installments
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage fee installments" ON fee_installments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for fee_reminder_logs
CREATE POLICY "Admins can view fee reminder logs" ON fee_reminder_logs
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert fee reminder logs" ON fee_reminder_logs
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_promotion_history_school ON promotion_history(school_id);
CREATE INDEX idx_promotion_history_student ON promotion_history(student_id);
CREATE INDEX idx_staff_details_school ON staff_details(school_id);
CREATE INDEX idx_staff_details_user ON staff_details(user_id);
CREATE INDEX idx_staff_attendance_school ON staff_attendance(school_id);
CREATE INDEX idx_staff_attendance_date ON staff_attendance(date);
CREATE INDEX idx_fee_installment_plans_school ON fee_installment_plans(school_id);
CREATE INDEX idx_fee_installment_plans_student ON fee_installment_plans(student_id);
CREATE INDEX idx_fee_installments_plan ON fee_installments(plan_id);
CREATE INDEX idx_fee_installments_due_date ON fee_installments(due_date);
CREATE INDEX idx_fee_reminder_logs_school ON fee_reminder_logs(school_id);