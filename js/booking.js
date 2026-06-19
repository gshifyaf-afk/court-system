// ============================================================
// CourtBook — Booking Engine Module
// ============================================================

// Memory storage for user booked slots in DEMO_MODE
let demoBookings = [...MOCK_BOOKINGS];
const demoSlotsCache = {}; // courtId -> slots list

async function fetchAvailableSlots(courtId, dateStr) {
  const client = getSupabase();

  if (DEMO_MODE || !client) {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Check if slots are already cached for this court, otherwise generate them
    if (!demoSlotsCache[courtId]) {
      demoSlotsCache[courtId] = generateMockSlots(courtId);
    }

    // Filter slots for the active date
    const daySlots = demoSlotsCache[courtId].filter(s => s.date === dateStr);
    
    // Cross-check with demoBookings to mark active bookings as unavailable
    return daySlots.map(slot => {
      const isBooked = demoBookings.some(b => 
        b.court_id === courtId && 
        b.booking_date === dateStr && 
        b.start_time === slot.start_time &&
        b.status !== 'cancelled'
      );
      return {
        ...slot,
        is_available: slot.is_available && !isBooked
      };
    });
  }

  // Supabase Fetch slots
  const { data, error } = await client
    .from('time_slots')
    .select('*')
    .eq('court_id', courtId)
    .eq('date', dateStr)
    .order('start_time', { ascending: true });

  if (error) {
    console.error("Error fetching slots from Supabase:", error);
    return [];
  }

  return data;
}

// Initiates a booking record. In Supabase mode, it calls SQL transaction confirm_booking
async function initiateBooking(userId, venueId, courtId, slotId, dateStr, startTime, endTime, amount) {
  const client = getSupabase();

  if (DEMO_MODE || !client) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In demo mode: Verify double-booking first
    const isDoubleBooked = demoBookings.some(b => 
      b.court_id === courtId &&
      b.booking_date === dateStr &&
      b.start_time === startTime &&
      b.status !== 'cancelled'
    );

    if (isDoubleBooked) {
      throw new Error("Double-booking prevented. This slot was just booked by another user!");
    }

    // Get venue and court info for display
    const venue = MOCK_VENUES.find(v => v.id === venueId);
    const court = venue?.courts.find(c => c.id === courtId);

    const newBooking = {
      id: 'b-' + Math.random().toString(36).substr(2, 9),
      user_id: userId,
      venue_id: venueId,
      court_id: courtId,
      slot_id: slotId,
      booking_date: dateStr,
      start_time: startTime,
      end_time: endTime,
      status: 'pending', // pending payment
      total_amount: amount,
      created_at: new Date().toISOString(),
      venue_name: venue ? venue.name : 'Unknown Venue',
      court_name: court ? court.name : 'Unknown Court'
    };

    demoBookings.unshift(newBooking);
    return newBooking;
  }

  // Supabase Atomic Booking Confirm Function via RPC
  const { data: bookingId, error } = await client.rpc('confirm_booking', {
    p_user_id: userId,
    p_venue_id: venueId,
    p_court_id: courtId,
    p_slot_id: slotId,
    p_date: dateStr,
    p_start: startTime,
    p_end: endTime,
    p_amount: amount
  });

  if (error) {
    throw new Error(error.message || "Failed to confirm booking transaction.");
  }

  // Fetch full details of the created booking
  const { data: booking, error: fetchError } = await client
    .from('bookings')
    .select('*, venues(name), courts(name)')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    // fallback with basic structure if join fails
    return {
      id: bookingId,
      user_id: userId,
      venue_id: venueId,
      court_id: courtId,
      slot_id: slotId,
      booking_date: dateStr,
      start_time: startTime,
      end_time: endTime,
      status: 'pending',
      total_amount: amount,
      created_at: new Date().toISOString()
    };
  }

  return {
    ...booking,
    venue_name: booking.venues?.name || 'Venue',
    court_name: booking.courts?.name || 'Court'
  };
}

async function fetchUserBookings(userId) {
  const client = getSupabase();

  if (DEMO_MODE || !client) {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Filter bookings belonging to user
    return demoBookings.filter(b => b.user_id === userId);
  }

  // Supabase query
  const { data, error } = await client
    .from('bookings')
    .select('*, venues(name, address), courts(name)')
    .eq('user_id', userId)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) {
    console.error("Error fetching user bookings:", error);
    return [];
  }

  return data.map(b => ({
    ...b,
    venue_name: b.venues?.name || 'Venue',
    venue_address: b.venues?.address || '',
    court_name: b.courts?.name || 'Court'
  }));
}

async function cancelBooking(bookingId) {
  const client = getSupabase();

  // Validate the cancellation window (>24 hours before play time)
  const currentBooking = DEMO_MODE || !client
    ? demoBookings.find(b => b.id === bookingId)
    : await (async () => {
        const { data } = await client.from('bookings').select('*').eq('id', bookingId).single();
        return data;
      })();

  if (!currentBooking) {
    throw new Error("Booking not found.");
  }

  const playDateTime = new Date(`${currentBooking.booking_date}T${currentBooking.start_time}`);
  const now = new Date();
  const diffMs = playDateTime - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < APP_CONFIG.cancelWindowHours) {
    throw new Error(`Cancellations are only allowed at least ${APP_CONFIG.cancelWindowHours} hours in advance.`);
  }

  if (DEMO_MODE || !client) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const idx = demoBookings.findIndex(b => b.id === bookingId);
    if (idx !== -1) {
      demoBookings[idx].status = 'cancelled';
      
      // Make slot available again in mock cache
      const slotId = demoBookings[idx].slot_id;
      const courtId = demoBookings[idx].court_id;
      if (demoSlotsCache[courtId]) {
        const slot = demoSlotsCache[courtId].find(s => s.id === slotId);
        if (slot) slot.is_available = true;
      }
    }
    return { success: true };
  }

  // Supabase update status to cancelled
  const { error: bookingError } = await client
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);

  if (bookingError) throw bookingError;

  // Make the associated slot available again
  const { error: slotError } = await client
    .from('time_slots')
    .update({ is_available: true })
    .eq('id', currentBooking.slot_id);

  if (slotError) {
    console.error("Warning: Updated booking to cancelled but failed to release time slot.", slotError);
  }

  return { success: true };
}

// ── Realtime Subscription ──
function subscribeToSlotChanges(courtId, callback) {
  const client = getSupabase();
  if (DEMO_MODE || !client) {
    // In demo mode, periodically check local storage/state changes
    const interval = setInterval(() => {
      callback();
    }, 4000);
    return () => clearInterval(interval);
  }

  // Supabase realtime subscription
  const subscription = client
    .channel(`public:time_slots:court_id=eq.${courtId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'time_slots',
      filter: `court_id=eq.${courtId}`
    }, () => {
      callback();
    })
    .subscribe();

  return () => {
    client.removeChannel(subscription);
  };
}
