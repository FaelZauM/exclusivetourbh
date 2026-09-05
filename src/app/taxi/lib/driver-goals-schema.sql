-- Driver Goals table (personal goals for each driver)
CREATE TABLE driver_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  personal_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE driver_goals ENABLE ROW LEVEL SECURITY;

-- Drivers can view own goals
CREATE POLICY "Drivers can view own goals" ON driver_goals
  FOR SELECT USING (auth.uid() = user_id);

-- Drivers can insert own goals
CREATE POLICY "Drivers can insert own goals" ON driver_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drivers can update own goals
CREATE POLICY "Drivers can update own goals" ON driver_goals
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin can view all driver goals
CREATE POLICY "Admin can view all driver goals" ON driver_goals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
