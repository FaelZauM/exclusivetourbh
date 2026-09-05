-- ============================================
-- EXCLUSIVEPRO - SQL COMPLETO (执行一次)
-- ============================================

-- 1. FUNÇÃO is_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. DROP TODAS AS POLÍTICAS EXISTENTES
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
  END LOOP;
END $$;

-- 3. TABELAS (CREATE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('own', 'passed')),
  category TEXT NOT NULL CHECK (category IN ('app', 'taximeter', 'cooperative', 'private', 'invoiced')),
  value DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2),
  driver_name TEXT,
  passenger_name TEXT,
  dispatcher_name TEXT,
  company_name TEXT,
  start_location TEXT,
  end_location TEXT,
  ride_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by_admin BOOLEAN DEFAULT false,
  received_with_client BOOLEAN DEFAULT false,
  paid_to_driver BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS fuel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  fuel_date TIMESTAMP WITH TIME ZONE NOT NULL,
  liters DECIMAL(10,2),
  total_value DECIMAL(10,2) NOT NULL,
  km_start DECIMAL(10,2),
  km_end DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuel_price (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_liter DECIMAL(10,2) NOT NULL,
  recorded_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
  weekly_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  personal_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  car_model TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  car_type TEXT NOT NULL CHECK (car_type IN ('executive', 'taxi')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rental_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  start_day INTEGER NOT NULL CHECK (start_day >= 1 AND start_day <= 31),
  end_day INTEGER NOT NULL CHECK (end_day >= 1 AND end_day <= 31),
  goal_value DECIMAL(10,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. HABILITAR RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_price ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_goals ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (is_admin());

CREATE POLICY "Drivers can view own rides" ON rides
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all rides" ON rides
  FOR SELECT USING (is_admin());

CREATE POLICY "Drivers can insert own rides" ON rides
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can insert rides" ON rides
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Drivers can update own rides" ON rides
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can update rides" ON rides
  FOR UPDATE USING (is_admin());

CREATE POLICY "Drivers can delete own rides" ON rides
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin can delete rides" ON rides
  FOR DELETE USING (is_admin());

CREATE POLICY "Drivers can view own fuel" ON fuel
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all fuel" ON fuel
  FOR SELECT USING (is_admin());

CREATE POLICY "Drivers can insert own fuel" ON fuel
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own fuel" ON fuel
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Drivers can delete own fuel" ON fuel
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view fuel prices" ON fuel_price
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert fuel prices" ON fuel_price
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Anyone can view goals" ON goals
  FOR SELECT USING (true);

CREATE POLICY "Admin can update goals" ON goals
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admin can insert goals" ON goals
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Drivers can view own goals" ON driver_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Drivers can insert own goals" ON driver_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own goals" ON driver_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all driver goals" ON driver_goals
  FOR SELECT USING (is_admin());

CREATE POLICY "Owner can manage driver cars" ON driver_cars
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Driver can view assigned cars" ON driver_cars
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "Owner can manage invitations" ON driver_invitations
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Driver can view invitations" ON driver_invitations
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Driver can update invitations" ON driver_invitations
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Admin can manage rental goals" ON rental_goals
  FOR ALL USING (is_admin());

CREATE POLICY "Drivers can view own rental goals" ON rental_goals
  FOR SELECT USING (auth.uid() = driver_id);

-- 6. DADOS INICIAIS
INSERT INTO users (id, email, nome, role)
SELECT id, email, 'Admin' as nome, 'admin' as role
FROM auth.users 
WHERE email = 'rafaelregis97@gmail.com'
ON CONFLICT (email) DO NOTHING;

INSERT INTO goals (daily_goal, weekly_goal)
VALUES (200, 1200)
ON CONFLICT DO NOTHING;
