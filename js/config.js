// ============================================================
// CourtBook — Configuration
// ============================================================

// ── Supabase credentials ──
// Replace these with your actual Supabase project values
const SUPABASE_URL = 'https://xooyjgynlchuptjuneyr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_J5eYxLQ2L3en6V1Cpj4d6A_mfF941su';

// ── Demo mode ──
// When true, the app uses mock data and skips Supabase calls.
// Set to false once you've connected your Supabase project.
const DEMO_MODE = false;

// ── App constants ──
const APP_CONFIG = {
  name: 'CourtBook',
  currency: '$',
  dateFormat: 'en-US',
  maxBookingDays: 7,           // show slots for next N days
  cancelWindowHours: 24,       // allow cancel if >24 h before
  slotDurationMinutes: 60,     // 1-hour blocks
  paymentProcessingMs: 2500,   // fake payment delay
};

// ── Sport types ──
const SPORT_TYPES = [
  { key: 'all', label: 'All', icon: '🏟️' },
  { key: 'basketball', label: 'Basketball', icon: '🏀' },
  { key: 'tennis', label: 'Tennis', icon: '🎾' },
  { key: 'football', label: 'Football', icon: '⚽' },
  { key: 'badminton', label: 'Badminton', icon: '🏸' },
  { key: 'cricket', label: 'Cricket', icon: '🏏' },
  { key: 'volleyball', label: 'Volleyball', icon: '🏐' },
];

// ── Amenity icon map ──
const AMENITY_ICONS = {
  wifi: '📶',
  parking: '🅿️',
  changing_rooms: '🚿',
  floodlights: '💡',
  equipment: '🎒',
  cafe: '☕',
  first_aid: '🏥',
  scoreboard: '📊',
  seating: '💺',
  water: '🚰',
  locker: '🔐',
  air_conditioning: '❄️',
};

// ── Demo / Mock Data ──
const MOCK_VENUES = [
  {
    id: 'v1',
    name: 'SkyDunk Arena',
    sport_type: 'basketball',
    description: 'Premium indoor basketball complex with 4 regulation courts, professional lighting, and live scoreboard. Home to local league tournaments and open pickup games every weekend.',
    address: '42 Neon Boulevard, Sector 7',
    lat: 28.6139,
    lng: 77.2090,
    images: [],
    price_per_hour: 45,
    rating: 4.8,
    amenities: ['wifi', 'parking', 'changing_rooms', 'scoreboard', 'water', 'first_aid'],
    courts: [
      { id: 'c1', name: 'Court Alpha', surface: 'hardwood', is_indoor: true },
      { id: 'c2', name: 'Court Beta', surface: 'hardwood', is_indoor: true },
      { id: 'c3', name: 'Court Gamma', surface: 'synthetic', is_indoor: true },
    ],
    distance: '2.3 km',
  },
  {
    id: 'v2',
    name: 'AceSpin Tennis Club',
    sport_type: 'tennis',
    description: 'World-class outdoor and indoor tennis courts with both clay and hard surfaces. Professional coaching available. Features a club lounge with panoramic court views.',
    address: '88 Pulse Street, Downtown',
    lat: 28.6200,
    lng: 77.2150,
    images: [],
    price_per_hour: 55,
    rating: 4.6,
    amenities: ['wifi', 'parking', 'equipment', 'cafe', 'changing_rooms', 'floodlights'],
    courts: [
      { id: 'c4', name: 'Centre Court', surface: 'clay', is_indoor: false },
      { id: 'c5', name: 'Court 2', surface: 'hard', is_indoor: true },
    ],
    distance: '3.1 km',
  },
  {
    id: 'v3',
    name: 'Thunderfield Stadium',
    sport_type: 'football',
    description: 'Full-size and 5-a-side football pitches with FIFA-quality synthetic turf. Night matches under state-of-the-art LED floodlights. Spectator seating for 200.',
    address: '15 Gravity Lane, Sports District',
    lat: 28.6300,
    lng: 77.2200,
    images: [],
    price_per_hour: 80,
    rating: 4.9,
    amenities: ['parking', 'floodlights', 'changing_rooms', 'first_aid', 'seating', 'water'],
    courts: [
      { id: 'c6', name: 'Main Pitch', surface: 'synthetic turf', is_indoor: false },
      { id: 'c7', name: '5-a-Side Arena', surface: 'synthetic turf', is_indoor: true },
    ],
    distance: '1.8 km',
  },
  {
    id: 'v4',
    name: 'ShuttleZone Hub',
    sport_type: 'badminton',
    description: 'Air-conditioned badminton hall with 6 BWF-standard courts, maple wood flooring, and anti-glare lighting. Equipment rental and coaching sessions available.',
    address: '7 Quantum Road, Tech Park',
    lat: 28.6050,
    lng: 77.2050,
    images: [],
    price_per_hour: 30,
    rating: 4.5,
    amenities: ['air_conditioning', 'equipment', 'parking', 'water', 'locker', 'changing_rooms'],
    courts: [
      { id: 'c8', name: 'Court 1', surface: 'maple wood', is_indoor: true },
      { id: 'c9', name: 'Court 2', surface: 'maple wood', is_indoor: true },
      { id: 'c10', name: 'Court 3', surface: 'maple wood', is_indoor: true },
    ],
    distance: '4.0 km',
  },
  {
    id: 'v5',
    name: 'Boundary Kings Ground',
    sport_type: 'cricket',
    description: 'Professional cricket ground with practice nets, bowling machines, and a full-size pitch. Hosts weekend tournaments and corporate cricket events.',
    address: '200 Legacy Avenue, Greenfield',
    lat: 28.6400,
    lng: 77.2300,
    images: [],
    price_per_hour: 100,
    rating: 4.7,
    amenities: ['parking', 'equipment', 'floodlights', 'seating', 'cafe', 'first_aid'],
    courts: [
      { id: 'c11', name: 'Main Ground', surface: 'natural grass', is_indoor: false },
      { id: 'c12', name: 'Practice Nets', surface: 'synthetic', is_indoor: false },
    ],
    distance: '5.5 km',
  },
  {
    id: 'v6',
    name: 'VolleyVault Indoor',
    sport_type: 'volleyball',
    description: 'Dedicated indoor volleyball center with professional-grade Gerflor flooring, adjustable net heights, and a practice wall. Open for casual games and league matches.',
    address: '33 Orbit Plaza, Central Hub',
    lat: 28.6180,
    lng: 77.2120,
    images: [],
    price_per_hour: 35,
    rating: 4.4,
    amenities: ['air_conditioning', 'water', 'changing_rooms', 'equipment', 'wifi', 'locker'],
    courts: [
      { id: 'c13', name: 'Court A', surface: 'gerflor', is_indoor: true },
      { id: 'c14', name: 'Court B', surface: 'gerflor', is_indoor: true },
    ],
    distance: '2.9 km',
  },
];

// Generate mock time slots for next 7 days
function generateMockSlots(courtId) {
  const slots = [];
  const today = new Date();
  for (let d = 0; d < APP_CONFIG.maxBookingDays; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    for (let h = 8; h <= 21; h++) {
      const startH = String(h).padStart(2, '0');
      const endH = String(h + 1).padStart(2, '0');
      // Randomly mark ~20% as booked for realism
      const isAvailable = Math.random() > 0.2;
      slots.push({
        id: `s-${courtId}-${dateStr}-${startH}`,
        court_id: courtId,
        date: dateStr,
        start_time: `${startH}:00`,
        end_time: `${endH}:00`,
        is_available: isAvailable,
        price_override: null,
      });
    }
  }
  return slots;
}

// Mock bookings for demo
const MOCK_BOOKINGS = [
  {
    id: 'b1',
    user_id: 'demo-user',
    venue_id: 'v1',
    court_id: 'c1',
    slot_id: 's-c1-upcoming',
    booking_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    start_time: '18:00',
    end_time: '19:00',
    status: 'confirmed',
    payment_method: 'card',
    total_amount: 45,
    created_at: new Date().toISOString(),
    venue_name: 'SkyDunk Arena',
    court_name: 'Court Alpha',
  },
  {
    id: 'b2',
    user_id: 'demo-user',
    venue_id: 'v3',
    court_id: 'c6',
    slot_id: 's-c6-past',
    booking_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '11:00',
    status: 'completed',
    payment_method: 'card',
    total_amount: 80,
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    venue_name: 'Thunderfield Stadium',
    court_name: 'Main Pitch',
  },
];

// Demo user profile
const MOCK_USER = {
  id: 'demo-user',
  email: 'player@courtbook.io',
  full_name: 'Alex Starfield',
  avatar_url: '',
  phone: '+1 555 0199',
  created_at: '2025-01-15T00:00:00Z',
};
