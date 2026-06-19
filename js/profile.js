// ============================================================
// CourtBook — Profile Page Logic
// ============================================================

async function fetchProfileStats(userId) {
  const bookings = await fetchUserBookings(userId);
  const activeBookings = bookings.filter(b => b.status === 'confirmed');
  const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'confirmed'); // simplify count
  
  return {
    totalBookings: bookings.length,
    activeBookings: activeBookings.length,
    completedBookings: bookings.filter(b => b.status === 'completed').length,
    cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
    totalSpent: bookings.reduce((sum, b) => b.status !== 'cancelled' ? sum + parseFloat(b.total_amount) : sum, 0)
  };
}
