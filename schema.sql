-- ============================================================
-- CourtBook — Supabase Database Schema
-- Run this in the Supabase SQL Editor to bootstrap the DB.
-- ============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  avatar_url TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. VENUES
-- ============================================================
CREATE TABLE public.venues (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  sport_type     TEXT NOT NULL,
  description    TEXT,
  address        TEXT,
  lat            FLOAT,
  lng            FLOAT,
  images         TEXT[] DEFAULT '{}',
  price_per_hour DECIMAL(10,2),
  rating         NUMERIC(3,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venues are viewable by everyone"
  ON public.venues FOR SELECT USING (true);

-- ============================================================
-- 3. AMENITIES
-- ============================================================
CREATE TABLE public.amenities (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT -- key for front-end icon map, e.g. "wifi"
);

ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Amenities are viewable by everyone"
  ON public.amenities FOR SELECT USING (true);

-- ============================================================
-- 4. VENUE ↔ AMENITY (many-to-many)
-- ============================================================
CREATE TABLE public.venue_amenities (
  venue_id   UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  amenity_id INT  REFERENCES public.amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (venue_id, amenity_id)
);

ALTER TABLE public.venue_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue amenities viewable by everyone"
  ON public.venue_amenities FOR SELECT USING (true);

-- ============================================================
-- 5. COURTS / FIELDS
-- ============================================================
CREATE TABLE public.courts (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id  UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  surface   TEXT,
  is_indoor BOOLEAN DEFAULT false
);

ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courts are viewable by everyone"
  ON public.courts FOR SELECT USING (true);

-- ============================================================
-- 6. TIME SLOTS
-- ============================================================
CREATE TABLE public.time_slots (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  court_id       UUID REFERENCES public.courts(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  is_available   BOOLEAN DEFAULT true,
  price_override DECIMAL(10,2)
);

ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time slots viewable by everyone"
  ON public.time_slots FOR SELECT USING (true);

CREATE POLICY "Time slots updatable by authenticated users"
  ON public.time_slots FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- 7. BOOKINGS
-- ============================================================
CREATE TABLE public.bookings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES auth.users(id) NOT NULL,
  venue_id       UUID REFERENCES public.venues(id) NOT NULL,
  court_id       UUID REFERENCES public.courts(id) NOT NULL,
  slot_id        UUID REFERENCES public.time_slots(id) NOT NULL,
  booking_date   DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  status         TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','cancelled','completed')),
  payment_method TEXT,
  total_amount   DECIMAL(10,2),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookings"
  ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 8. PAYMENTS (simulated)
-- ============================================================
CREATE TABLE public.payments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES public.bookings(id) UNIQUE NOT NULL,
  amount     DECIMAL(10,2),
  card_last4 TEXT,
  status     TEXT DEFAULT 'success',
  paid_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for own bookings"
  ON public.payments FOR INSERT
  WITH CHECK (
    booking_id IN (
      SELECT id FROM public.bookings WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 9. ATOMIC BOOKING FUNCTION
-- Locks the slot and creates the booking in one transaction.
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_booking(
  p_user_id   UUID,
  p_venue_id  UUID,
  p_court_id  UUID,
  p_slot_id   UUID,
  p_date      DATE,
  p_start     TIME,
  p_end       TIME,
  p_amount    DECIMAL
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_available  BOOLEAN;
BEGIN
  -- Lock the slot row
  SELECT is_available INTO v_available
    FROM public.time_slots
   WHERE id = p_slot_id
     FOR UPDATE;

  IF NOT v_available THEN
    RAISE EXCEPTION 'Slot is no longer available';
  END IF;

  -- Mark slot as booked
  UPDATE public.time_slots SET is_available = false WHERE id = p_slot_id;

  -- Create booking
  INSERT INTO public.bookings (user_id, venue_id, court_id, slot_id, booking_date, start_time, end_time, status, total_amount)
  VALUES (p_user_id, p_venue_id, p_court_id, p_slot_id, p_date, p_start, p_end, 'pending', p_amount)
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- ============================================================
-- 11. SEED DATA
-- ============================================================

-- 11a. Amenities
INSERT INTO public.amenities (name, icon) VALUES
  ('WiFi',            'wifi'),
  ('Parking',         'parking'),
  ('Changing Rooms',  'changing_rooms'),
  ('Floodlights',     'floodlights'),
  ('Equipment Rental','equipment'),
  ('Café',            'cafe'),
  ('First Aid',       'first_aid'),
  ('Scoreboard',      'scoreboard'),
  ('Seating',         'seating'),
  ('Water Station',   'water'),
  ('Lockers',         'locker'),
  ('Air Conditioning','air_conditioning');

-- 11b. Venues
INSERT INTO public.venues (id, name, sport_type, description, address, lat, lng, price_per_hour, rating) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'SkyDunk Arena',       'basketball', 'Premium indoor basketball complex with 4 regulation courts, professional lighting, and live scoreboard.', '42 Neon Boulevard, Sector 7',      28.6139, 77.2090, 45.00,  4.80),
  ('a2222222-2222-2222-2222-222222222222', 'AceSpin Tennis Club',  'tennis',     'World-class outdoor and indoor tennis courts with both clay and hard surfaces.',                        '88 Pulse Street, Downtown',        28.6200, 77.2150, 55.00,  4.60),
  ('a3333333-3333-3333-3333-333333333333', 'Thunderfield Stadium', 'football',   'Full-size and 5-a-side football pitches with FIFA-quality synthetic turf.',                            '15 Gravity Lane, Sports District', 28.6300, 77.2200, 80.00,  4.90),
  ('a4444444-4444-4444-4444-444444444444', 'ShuttleZone Hub',      'badminton',  'Air-conditioned badminton hall with 6 BWF-standard courts, maple wood flooring.',                      '7 Quantum Road, Tech Park',        28.6050, 77.2050, 30.00,  4.50),
  ('a5555555-5555-5555-5555-555555555555', 'Boundary Kings Ground','cricket',    'Professional cricket ground with practice nets, bowling machines, and a full-size pitch.',              '200 Legacy Avenue, Greenfield',    28.6400, 77.2300, 100.00, 4.70),
  ('a6666666-6666-6666-6666-666666666666', 'VolleyVault Indoor',   'volleyball', 'Dedicated indoor volleyball center with professional-grade Gerflor flooring.',                         '33 Orbit Plaza, Central Hub',      28.6180, 77.2120, 35.00,  4.40);

-- 11c. Venue ↔ Amenity links
INSERT INTO public.venue_amenities (venue_id, amenity_id)
SELECT v.id, a.id FROM public.venues v, public.amenities a
WHERE v.name = 'SkyDunk Arena'       AND a.icon IN ('wifi','parking','changing_rooms','scoreboard','water','first_aid')
UNION ALL
SELECT v.id, a.id FROM public.venues v, public.amenities a
WHERE v.name = 'AceSpin Tennis Club'  AND a.icon IN ('wifi','parking','equipment','cafe','changing_rooms','floodlights')
UNION ALL
SELECT v.id, a.id FROM public.venues v, public.amenities a
WHERE v.name = 'Thunderfield Stadium' AND a.icon IN ('parking','floodlights','changing_rooms','first_aid','seating','water')
UNION ALL
SELECT v.id, a.id FROM public.venues v, public.amenities a
WHERE v.name = 'ShuttleZone Hub'      AND a.icon IN ('air_conditioning','equipment','parking','water','locker','changing_rooms')
UNION ALL
SELECT v.id, a.id FROM public.venues v, public.amenities a
WHERE v.name = 'Boundary Kings Ground' AND a.icon IN ('parking','equipment','floodlights','seating','cafe','first_aid')
UNION ALL
SELECT v.id, a.id FROM public.venues v, public.amenities a
WHERE v.name = 'VolleyVault Indoor'   AND a.icon IN ('air_conditioning','water','changing_rooms','equipment','wifi','locker');

-- 11d. Courts
INSERT INTO public.courts (id, venue_id, name, surface, is_indoor) VALUES
  -- SkyDunk Arena
  ('b1111111-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'Court Alpha',    'hardwood',        true),
  ('b1111111-0001-0001-0001-000000000002', 'a1111111-1111-1111-1111-111111111111', 'Court Beta',     'hardwood',        true),
  ('b1111111-0001-0001-0001-000000000003', 'a1111111-1111-1111-1111-111111111111', 'Court Gamma',    'synthetic',       true),
  -- AceSpin Tennis Club
  ('b2222222-0002-0002-0002-000000000001', 'a2222222-2222-2222-2222-222222222222', 'Centre Court',   'clay',            false),
  ('b2222222-0002-0002-0002-000000000002', 'a2222222-2222-2222-2222-222222222222', 'Court 2',        'hard',            true),
  -- Thunderfield Stadium
  ('b3333333-0003-0003-0003-000000000001', 'a3333333-3333-3333-3333-333333333333', 'Main Pitch',     'synthetic turf',  false),
  ('b3333333-0003-0003-0003-000000000002', 'a3333333-3333-3333-3333-333333333333', '5-a-Side Arena', 'synthetic turf',  true),
  -- ShuttleZone Hub
  ('b4444444-0004-0004-0004-000000000001', 'a4444444-4444-4444-4444-444444444444', 'Court 1',        'maple wood',      true),
  ('b4444444-0004-0004-0004-000000000002', 'a4444444-4444-4444-4444-444444444444', 'Court 2',        'maple wood',      true),
  ('b4444444-0004-0004-0004-000000000003', 'a4444444-4444-4444-4444-444444444444', 'Court 3',        'maple wood',      true),
  -- Boundary Kings Ground
  ('b5555555-0005-0005-0005-000000000001', 'a5555555-5555-5555-5555-555555555555', 'Main Ground',    'natural grass',   false),
  ('b5555555-0005-0005-0005-000000000002', 'a5555555-5555-5555-5555-555555555555', 'Practice Nets',  'synthetic',       false),
  -- VolleyVault Indoor
  ('b6666666-0006-0006-0006-000000000001', 'a6666666-6666-6666-6666-666666666666', 'Court A',        'gerflor',         true),
  ('b6666666-0006-0006-0006-000000000002', 'a6666666-6666-6666-6666-666666666666', 'Court B',        'gerflor',         true);

-- 11e. Generate time slots for next 7 days
-- Uses a function to bulk-insert slots
DO $$
DECLARE
  court_rec RECORD;
  d INT;
  h INT;
  slot_date DATE;
BEGIN
  FOR court_rec IN SELECT id FROM public.courts LOOP
    FOR d IN 0..6 LOOP
      slot_date := CURRENT_DATE + d;
      FOR h IN 8..21 LOOP
        INSERT INTO public.time_slots (court_id, date, start_time, end_time, is_available)
        VALUES (
          court_rec.id,
          slot_date,
          make_time(h, 0, 0),
          make_time(h + 1, 0, 0),
          -- Randomly mark ~15% as already booked for realism
          random() > 0.15
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
