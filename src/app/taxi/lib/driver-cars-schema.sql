-- Driver Cars table (admin assigns cars to drivers)
CREATE TABLE driver_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  car_model TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  car_type TEXT NOT NULL CHECK (car_type IN ('executive', 'taxi')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE driver_cars ENABLE ROW LEVEL SECURITY;

-- Owner can manage their driver cars
CREATE POLICY "Owner can manage driver cars" ON driver_cars
  FOR ALL USING (auth.uid() = owner_id);

-- Driver can view their assigned cars
CREATE POLICY "Driver can view assigned cars" ON driver_cars
  FOR SELECT USING (auth.uid() = driver_id);

-- Driver Invitations table
CREATE TABLE driver_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE driver_invitations ENABLE ROW LEVEL SECURITY;

-- Owner can manage their invitations
CREATE POLICY "Owner can manage invitations" ON driver_invitations
  FOR ALL USING (auth.uid() = owner_id);
