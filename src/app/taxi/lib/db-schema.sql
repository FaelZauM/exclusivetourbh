-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rides table
CREATE TABLE rides (
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
CREATE TABLE fuel (
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
CREATE TABLE fuel_price (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_liter DECIMAL(10,2) NOT NULL,
  recorded_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
  weekly_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_price ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Rides policies
CREATE POLICY "Drivers can view own rides" ON rides
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all rides" ON rides
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Drivers can insert own rides" ON rides
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own rides" ON rides
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Drivers can delete own rides" ON rides
  FOR DELETE USING (auth.uid() = user_id);

-- Fuel policies
CREATE POLICY "Drivers can view own fuel" ON fuel
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all fuel" ON fuel
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Drivers can insert own fuel" ON fuel
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own fuel" ON fuel
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Drivers can delete own fuel" ON fuel
  FOR DELETE USING (auth.uid() = user_id);

-- Fuel price policies (everyone can view, admin can manage)
CREATE POLICY "Anyone can view fuel prices" ON fuel_price
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert fuel prices" ON fuel_price
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Goals policies (everyone can view, admin can manage)
CREATE POLICY "Anyone can view goals" ON goals
  FOR SELECT USING (true);

CREATE POLICY "Admin can update goals" ON goals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can insert goals" ON goals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );