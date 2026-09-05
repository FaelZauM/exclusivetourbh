-- Rental Goals table (for drivers who rent cars from the owner)
CREATE TABLE rental_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  start_day INTEGER NOT NULL CHECK (start_day >= 1 AND start_day <= 31),
  end_day INTEGER NOT NULL CHECK (end_day >= 1 AND end_day <= 31),
  goal_value DECIMAL(10,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rental_goals ENABLE ROW LEVEL SECURITY;

-- Admin can manage all rental goals
CREATE POLICY "Admin can manage rental goals" ON rental_goals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Drivers can view their own rental goals
CREATE POLICY "Drivers can view own rental goals" ON rental_goals
  FOR SELECT USING (auth.uid() = driver_id);
