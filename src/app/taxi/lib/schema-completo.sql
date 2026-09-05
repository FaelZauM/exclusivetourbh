-- ============================================
-- EXCLUSIVEPRO - SCHEMA COMPLETO
-- ============================================

-- ============================================
-- 1. TABELAS PRINCIPAIS
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rides table
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
  start_location TEXT,
  end_location TEXT,
  ride_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fuel table
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

-- Fuel price table
CREATE TABLE IF NOT EXISTS fuel_price (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_liter DECIMAL(10,2) NOT NULL,
  recorded_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals table (admin goals)
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
  weekly_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. TABELAS ADICIONAIS
-- ============================================

-- Driver Goals table (personal goals for each driver)
CREATE TABLE IF NOT EXISTS driver_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  personal_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver Cars table (admin assigns cars to drivers)
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

-- Driver Invitations table
CREATE TABLE IF NOT EXISTS driver_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rental Goals table
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

-- ============================================
-- 3. HABILITAR RLS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_price ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_goals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. FUNÇÃO AUXILIAR
-- ============================================

-- Função para verificar se é admin (evita recursão)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. POLÍTICAS RLS - USERS
-- ============================================

-- Users can view own profile
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Admin can view all users
DROP POLICY IF EXISTS "Admin can view all users" ON users;
CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (is_admin());

-- ============================================
-- 6. POLÍTICAS RLS - RIDES
-- ============================================

-- Drivers can view own rides
DROP POLICY IF EXISTS "Drivers can view own rides" ON rides;
CREATE POLICY "Drivers can view own rides" ON rides
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can view all rides
DROP POLICY IF EXISTS "Admin can view all rides" ON rides;
CREATE POLICY "Admin can view all rides" ON rides
  FOR SELECT USING (is_admin());

-- Drivers can insert own rides
DROP POLICY IF EXISTS "Drivers can insert own rides" ON rides;
CREATE POLICY "Drivers can insert own rides" ON rides
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drivers can update own rides
DROP POLICY IF EXISTS "Drivers can update own rides" ON rides;
CREATE POLICY "Drivers can update own rides" ON rides
  FOR UPDATE USING (auth.uid() = user_id);

-- Drivers can delete own rides
DROP POLICY IF EXISTS "Drivers can delete own rides" ON rides;
CREATE POLICY "Drivers can delete own rides" ON rides
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 7. POLÍTICAS RLS - FUEL
-- ============================================

-- Drivers can view own fuel
DROP POLICY IF EXISTS "Drivers can view own fuel" ON fuel;
CREATE POLICY "Drivers can view own fuel" ON fuel
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can view all fuel
DROP POLICY IF EXISTS "Admin can view all fuel" ON fuel;
CREATE POLICY "Admin can view all fuel" ON fuel
  FOR SELECT USING (is_admin());

-- Drivers can insert own fuel
DROP POLICY IF EXISTS "Drivers can insert own fuel" ON fuel;
CREATE POLICY "Drivers can insert own fuel" ON fuel
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drivers can update own fuel
DROP POLICY IF EXISTS "Drivers can update own fuel" ON fuel;
CREATE POLICY "Drivers can update own fuel" ON fuel
  FOR UPDATE USING (auth.uid() = user_id);

-- Drivers can delete own fuel
DROP POLICY IF EXISTS "Drivers can delete own fuel" ON fuel;
CREATE POLICY "Drivers can delete own fuel" ON fuel
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 8. POLÍTICAS RLS - FUEL PRICE
-- ============================================

-- Anyone can view fuel prices
DROP POLICY IF EXISTS "Anyone can view fuel prices" ON fuel_price;
CREATE POLICY "Anyone can view fuel prices" ON fuel_price
  FOR SELECT USING (true);

-- Admin can insert fuel prices
DROP POLICY IF EXISTS "Admin can insert fuel prices" ON fuel_price;
CREATE POLICY "Admin can insert fuel prices" ON fuel_price
  FOR INSERT WITH CHECK (is_admin());

-- ============================================
-- 9. POLÍTICAS RLS - GOALS
-- ============================================

-- Anyone can view goals
DROP POLICY IF EXISTS "Anyone can view goals" ON goals;
CREATE POLICY "Anyone can view goals" ON goals
  FOR SELECT USING (true);

-- Admin can update goals
DROP POLICY IF EXISTS "Admin can update goals" ON goals;
CREATE POLICY "Admin can update goals" ON goals
  FOR UPDATE USING (is_admin());

-- Admin can insert goals
DROP POLICY IF EXISTS "Admin can insert goals" ON goals;
CREATE POLICY "Admin can insert goals" ON goals
  FOR INSERT WITH CHECK (is_admin());

-- ============================================
-- 10. POLÍTICAS RLS - DRIVER GOALS
-- ============================================

-- Drivers can view own goals
DROP POLICY IF EXISTS "Drivers can view own goals" ON driver_goals;
CREATE POLICY "Drivers can view own goals" ON driver_goals
  FOR SELECT USING (auth.uid() = user_id);

-- Drivers can insert own goals
DROP POLICY IF EXISTS "Drivers can insert own goals" ON driver_goals;
CREATE POLICY "Drivers can insert own goals" ON driver_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drivers can update own goals
DROP POLICY IF EXISTS "Drivers can update own goals" ON driver_goals;
CREATE POLICY "Drivers can update own goals" ON driver_goals
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin can view all driver goals
DROP POLICY IF EXISTS "Admin can view all driver goals" ON driver_goals;
CREATE POLICY "Admin can view all driver goals" ON driver_goals
  FOR SELECT USING (is_admin());

-- ============================================
-- 11. POLÍTICAS RLS - DRIVER CARS
-- ============================================

-- Owner can manage their driver cars
DROP POLICY IF EXISTS "Owner can manage driver cars" ON driver_cars;
CREATE POLICY "Owner can manage driver cars" ON driver_cars
  FOR ALL USING (auth.uid() = owner_id);

-- Driver can view their assigned cars
DROP POLICY IF EXISTS "Driver can view assigned cars" ON driver_cars;
CREATE POLICY "Driver can view assigned cars" ON driver_cars
  FOR SELECT USING (auth.uid() = driver_id);

-- ============================================
-- 12. POLÍTICAS RLS - DRIVER INVITATIONS
-- ============================================

-- Owner can manage their invitations
DROP POLICY IF EXISTS "Owner can manage invitations" ON driver_invitations;
CREATE POLICY "Owner can manage invitations" ON driver_invitations
  FOR ALL USING (auth.uid() = owner_id);

-- Driver can view invitations sent to them
DROP POLICY IF EXISTS "Driver can view invitations" ON driver_invitations;
CREATE POLICY "Driver can view invitations" ON driver_invitations
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Driver can update invitation status (accept/reject)
DROP POLICY IF EXISTS "Driver can update invitations" ON driver_invitations;
CREATE POLICY "Driver can update invitations" ON driver_invitations
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================
-- 13. POLÍTICAS RLS - RENTAL GOALS
-- ============================================

-- Admin can manage all rental goals
DROP POLICY IF EXISTS "Admin can manage rental goals" ON rental_goals;
CREATE POLICY "Admin can manage rental goals" ON rental_goals
  FOR ALL USING (is_admin());

-- Drivers can view their own rental goals
DROP POLICY IF EXISTS "Drivers can view own rental goals" ON rental_goals;
CREATE POLICY "Drivers can view own rental goals" ON rental_goals
  FOR SELECT USING (auth.uid() = driver_id);

-- ============================================
-- 14. DADOS INICIAIS
-- ============================================

-- Inserir usuário admin (substitua pelo email criado no Auth)
INSERT INTO users (id, email, nome, role)
SELECT 
  id, 
  email, 
  'Admin' as nome, 
  'admin' as role
FROM auth.users 
WHERE email = 'rafaelregis97@gmail.com'
ON CONFLICT (email) DO NOTHING;

-- Meta inicial
INSERT INTO goals (daily_goal, weekly_goal)
VALUES (200, 1200)
ON CONFLICT DO NOTHING;
