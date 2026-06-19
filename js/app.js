// ============================================================
// CourtBook — Main Orchestrator & UI Renderers
// ============================================================

let currentUser = null;
let currentSelectedSlot = null; // Store slot chosen from details picker
let activeDateStr = new Date().toISOString().split('T')[0];
let activeCourtId = null;

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `ag-toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `
    <span>${icon}</span>
    <div>${message}</div>
  `;
  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.classList.add('leaving');
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

// ── Auth Modal Interactions ──
function showAuthModal(mode = 'signin') {
  const modalOverlay = document.getElementById('auth-modal');
  if (!modalOverlay) return;

  const signinForm = document.getElementById('auth-signin-form');
  const signupForm = document.getElementById('auth-signup-form');
  const title = document.getElementById('auth-modal-title');

  if (mode === 'signin') {
    signinForm.style.display = 'flex';
    signupForm.style.display = 'none';
    title.innerText = 'Access Hyperdrive';
  } else {
    signinForm.style.display = 'none';
    signupForm.style.display = 'flex';
    title.innerText = 'Initialize Profile';
  }

  modalOverlay.style.display = 'flex';
}

function hideAuthModal() {
  const modalOverlay = document.getElementById('auth-modal');
  if (modalOverlay) modalOverlay.style.display = 'none';
}

// ── Page Views Rendering ──

// Loading screen template
function showSkeleton(container) {
  container.innerHTML = `
    <div class="ag-container ag-page-enter">
      <div style="height: 120px; margin-bottom: 40px;" class="ag-skeleton"></div>
      <div class="ag-grid ag-grid-3">
        <div class="ag-skeleton ag-skeleton-card"></div>
        <div class="ag-skeleton ag-skeleton-card"></div>
        <div class="ag-skeleton ag-skeleton-card"></div>
      </div>
    </div>
  `;
}

// 1. VENUES LIST PAGE (Home)
async function renderVenuesPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="ag-hero ag-page-enter">
      <div class="ag-container">
        <h1>Book Your Next <span class="ag-glow-text">Court</span></h1>
        <p>Real-time slot availability, instant checkout, and premier athletic complexes in the palm of your hand.</p>
      </div>
    </div>
    
    <div class="ag-container ag-page-enter">
      <!-- Search and Filter Bar -->
      <div class="ag-glass" style="padding: 24px; margin-bottom: 40px;">
        <div class="ag-grid ag-grid-2" style="grid-template-columns: 2fr 1fr; align-items: end;">
          <div class="ag-search">
            <span class="ag-search-icon">🔍</span>
            <input type="text" id="search-input" class="ag-input" placeholder="Search venues by name, address or amenities...">
          </div>
          <div class="ag-input-group">
            <label>Filter Sport</label>
            <select id="sport-select" class="ag-input" style="cursor: pointer;">
              ${SPORT_TYPES.map(s => `<option value="${s.key}">${s.icon} ${s.label}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Venues Grid -->
      <div id="venues-grid" class="ag-grid ag-grid-3"></div>
      <div style="height: 60px;"></div>
    </div>
  `;

  const venuesGrid = document.getElementById('venues-grid');
  const searchInput = document.getElementById('search-input');
  const sportSelect = document.getElementById('sport-select');

  // Initial load
  showSkeleton(venuesGrid);
  const venues = await fetchVenues('all', '');
  renderVenueCards(venues, venuesGrid);

  // Search & Filter event handlers
  let debounceTimeout;
  const triggerFilters = () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      venuesGrid.innerHTML = `
        <div class="ag-flex-center" style="grid-column: 1/-1; padding: 60px 0;">
          <div class="ag-spinner"></div>
        </div>
      `;
      const sport = sportSelect.value;
      const query = searchInput.value;
      const filtered = await fetchVenues(sport, query);
      renderVenueCards(filtered, venuesGrid);
    }, 250);
  };

  searchInput.addEventListener('input', triggerFilters);
  sportSelect.addEventListener('change', triggerFilters);
}

// 2. VENUE DETAIL PAGE
async function renderVenueDetailPage(params) {
  const app = document.getElementById('app');
  const id = params.id;
  
  app.innerHTML = `
    <div class="ag-container ag-page-enter" style="padding-top: 30px;">
      <div class="ag-flex ag-mb-md">
        <button class="ag-btn ag-btn-secondary ag-btn-sm" onclick="location.hash = '#/'">← Back to discovery</button>
      </div>
      <div id="venue-detail-content">
        <div class="ag-flex-center" style="padding: 100px 0;"><div class="ag-spinner"></div></div>
      </div>
    </div>
  `;

  const content = document.getElementById('venue-detail-content');
  const venue = await fetchVenueById(id);

  if (!venue) {
    content.innerHTML = `
      <div class="ag-empty">
        <div class="ag-empty-icon">⚠️</div>
        <h3>Venue Not Found</h3>
        <p>The sports complex you requested does not exist or has been removed.</p>
      </div>
    `;
    return;
  }

  // Active dates calculation (next 7 days starting today)
  const datePillsHtml = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 0; i < APP_CONFIG.maxBookingDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getDay()];
    const dayNum = d.getDate();
    const isActive = dateStr === activeDateStr ? 'active' : '';

    datePillsHtml.push(`
      <div class="ag-date-item ${isActive}" data-date="${dateStr}" onclick="selectBookingDate(this, '${dateStr}')">
        <div class="ag-date-day">${dayName}</div>
        <div class="ag-date-num">${dayNum}</div>
      </div>
    `);
  }

  // Active Court check
  if (!activeCourtId && venue.courts.length > 0) {
    activeCourtId = venue.courts[0].id;
  }

  const courtTabsHtml = venue.courts.map((court, idx) => {
    const isActive = court.id === activeCourtId ? 'active' : '';
    return `
      <button class="ag-tab ${isActive}" data-court="${court.id}" onclick="selectCourtTab(this, '${court.id}')">
        ${court.name} (${court.is_indoor ? 'Indoor' : 'Outdoor'})
      </button>
    `;
  }).join('');

  // Rating Stars
  const fullStars = Math.floor(venue.rating);
  let starsHtml = '';
  for (let i = 0; i < 5; i++) {
    starsHtml += `<span class="ag-rating-star ${i < fullStars ? '' : 'empty'}">★</span>`;
  }

  content.innerHTML = `
    <div class="ag-detail-grid">
      <!-- Main Content Left -->
      <div>
        <div class="ag-gallery-hero">
          <div style="font-size: 5rem;">🏟️</div>
        </div>
        
        <h1 class="ag-mt-md">${venue.name}</h1>
        <div class="ag-flex ag-mt-sm">
          <div class="ag-rating">${starsHtml} <span class="ag-rating-value">${venue.rating.toFixed(1)}</span></div>
          <span class="ag-text-muted">•</span>
          <span class="ag-text-muted">📍 ${venue.address}</span>
        </div>

        <h3 class="ag-mt-lg">About this venue</h3>
        <p class="ag-text-muted ag-mt-xs">${venue.description}</p>

        <h3 class="ag-mt-lg">Amenities</h3>
        <div class="ag-flex-wrap ag-mt-md">
          ${venue.amenities.map(key => {
            const icon = AMENITY_ICONS[key] || '✨';
            const label = key.replace('_', ' ');
            return `<span class="ag-chip">${icon} ${label}</span>`;
          }).join('')}
        </div>

        <div class="ag-divider"></div>

        <!-- Time Picker Engine -->
        <h3 class="ag-mt-lg">Schedule Slot</h3>
        
        <!-- Date Horizontal Scroll Picker -->
        <div class="ag-date-scroll ag-mt-md">
          ${datePillsHtml.join('')}
        </div>

        <!-- Court Tabs Selection -->
        <div class="ag-tabs ag-mt-md" style="align-self: start;">
          ${courtTabsHtml}
        </div>

        <!-- Time Slot Selection Grid -->
        <div id="slots-picker-grid" class="ag-grid ag-grid-4 ag-mt-lg">
          <!-- Populated dynamically -->
          <div class="ag-flex-center" style="grid-column: 1/-1; padding: 40px 0;"><div class="ag-spinner"></div></div>
        </div>
      </div>

      <!-- Sticky Booking Checkout Column Right -->
      <div class="ag-detail-sidebar">
        <div class="ag-glass ag-card-float" style="padding: 24px; animation: none; cursor: default;">
          <h2 class="ag-glow-text" style="font-size: 1.3rem;">Order Summary</h2>
          <div class="ag-divider"></div>
          
          <div id="booking-sidebar-summary">
            <p class="ag-text-muted" style="text-align: center; padding: 20px 0;">Select an available court and time slot to begin your booking booking details.</p>
          </div>

          <button id="book-now-btn" class="ag-btn ag-btn-primary" style="width: 100%; margin-top: 24px;" disabled onclick="checkoutSelectedSlot('${venue.id}')">
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
    <div style="height: 80px;"></div>
  `;

  // Fetch and display active court times
  await refreshSlotsPicker();

  // Subscribe to real-time changes
  const unsubscribe = subscribeToSlotChanges(activeCourtId, () => {
    refreshSlotsPicker(true); // silent refresh
  });

  // Save cleanup listener to element
  content.dataset.unsubscribe = 'true';
  window.addEventListener('hashchange', function cleanup() {
    unsubscribe();
    window.removeEventListener('hashchange', cleanup);
  });
}

// Sub-renderers for Venue Details Picker
async function refreshSlotsPicker(silent = false) {
  const grid = document.getElementById('slots-picker-grid');
  if (!grid) return;

  if (!silent) {
    grid.innerHTML = '<div class="ag-flex-center" style="grid-column:1/-1; padding:40px 0;"><div class="ag-spinner"></div></div>';
  }

  const slots = await fetchAvailableSlots(activeCourtId, activeDateStr);
  
  if (slots.length === 0) {
    grid.innerHTML = `
      <div class="ag-empty" style="grid-column: 1/-1;">
        <p>No operating time slots configured for this date.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = slots.map(slot => {
    let stateClass = 'ag-pill--available';
    if (!slot.is_available) {
      stateClass = 'ag-pill--booked';
    } else if (currentSelectedSlot && currentSelectedSlot.id === slot.id) {
      stateClass = 'ag-pill--selected';
    }

    const clickAction = slot.is_available 
      ? `onclick="selectTimeSlot(this, ${JSON.stringify(slot).replace(/"/g, '&quot;')})"`
      : '';

    return `
      <div class="ag-pill ${stateClass}" ${clickAction}>
        ${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}
      </div>
    `;
  }).join('');
}

window.selectBookingDate = async function(element, dateStr) {
  document.querySelectorAll('.ag-date-item').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
  activeDateStr = dateStr;
  currentSelectedSlot = null;
  updateBookingSidebar(null);
  await refreshSlotsPicker();
};

window.selectCourtTab = async function(element, courtId) {
  document.querySelectorAll('.ag-tab').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
  activeCourtId = courtId;
  currentSelectedSlot = null;
  updateBookingSidebar(null);
  await refreshSlotsPicker();
};

window.selectTimeSlot = function(element, slot) {
  document.querySelectorAll('.ag-pill').forEach(el => {
    if (el.classList.contains('ag-pill--selected')) {
      el.classList.remove('ag-pill--selected');
      el.classList.add('ag-pill--available');
    }
  });

  element.classList.remove('ag-pill--available');
  element.classList.add('ag-pill--selected');
  
  currentSelectedSlot = slot;
  updateBookingSidebar(slot);
};

async function updateBookingSidebar(slot) {
  const summary = document.getElementById('booking-sidebar-summary');
  const btn = document.getElementById('book-now-btn');
  if (!summary || !btn) return;

  if (!slot) {
    summary.innerHTML = `<p class="ag-text-muted" style="text-align: center; padding: 20px 0;">Select an available court and time slot to begin booking details.</p>`;
    btn.disabled = true;
    return;
  }

  // Get active venue details
  const venue = MOCK_VENUES.find(v => v.courts.some(c => c.id === slot.court_id));
  const courtName = venue?.courts.find(c => c.id === slot.court_id)?.name || 'Court';
  const price = slot.price_override || venue?.price_per_hour || 0;

  summary.innerHTML = `
    <div class="ag-flex-col ag-gap-sm ag-mt-sm">
      <div class="ag-flex-between">
        <span class="ag-text-muted">Court</span>
        <span>${courtName}</span>
      </div>
      <div class="ag-flex-between">
        <span class="ag-text-muted">Date</span>
        <span>${slot.date}</span>
      </div>
      <div class="ag-flex-between">
        <span class="ag-text-muted">Time</span>
        <span>${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}</span>
      </div>
      <div class="ag-flex-between">
        <span class="ag-text-muted">Duration</span>
        <span>1 hour</span>
      </div>
      <div class="ag-divider"></div>
      <div class="ag-flex-between">
        <span style="font-weight: 700;">Hourly Rate</span>
        <span class="ag-price">${APP_CONFIG.currency}${price}</span>
      </div>
      <div class="ag-flex-between">
        <span style="font-weight: 700; font-size:1.1rem;">Total Amount</span>
        <span class="ag-price ag-price-lg">${APP_CONFIG.currency}${price}</span>
      </div>
    </div>
  `;
  btn.disabled = false;
}

window.checkoutSelectedSlot = function(venueId) {
  if (!currentUser) {
    showToast("Please log in to continue booking this court.", "error");
    showAuthModal('signin');
    return;
  }
  
  if (!currentSelectedSlot) return;

  // Stash target selection in local storage to preserve state across page hops
  localStorage.setItem('cb_checkout_data', JSON.stringify({
    venueId,
    courtId: activeCourtId,
    slot: currentSelectedSlot
  }));

  location.hash = '#/checkout';
};

// 3. CHECKOUT PAGE
async function renderCheckoutPage() {
  const app = document.getElementById('app');
  const dataStr = localStorage.getItem('cb_checkout_data');
  
  if (!dataStr) {
    app.innerHTML = `
      <div class="ag-container ag-page-enter" style="padding: 100px 24px; text-align: center;">
        <h2 class="ag-glow-text">Empty Cart</h2>
        <p class="ag-text-muted ag-mt-md">Please navigate back and choose a venue court to book.</p>
        <button class="ag-btn ag-btn-primary ag-mt-md" onclick="location.hash = '#/'">Return Home</button>
      </div>
    `;
    return;
  }

  const checkoutData = JSON.parse(dataStr);
  const venue = await fetchVenueById(checkoutData.venueId);
  const courtName = venue?.courts.find(c => c.id === checkoutData.courtId)?.name || 'Court';
  const price = checkoutData.slot.price_override || venue?.price_per_hour || 0;

  app.innerHTML = `
    <div class="ag-container ag-page-enter" style="padding-top: 40px; max-width: 900px;">
      <h1 class="ag-text-center ag-glow-text">Complete Secure Booking</h1>
      <p class="ag-text-center ag-text-muted ag-mb-md">Enter payment details to authorize booking reservations.</p>

      <div class="ag-grid ag-grid-2 ag-mt-lg">
        <!-- Summary Card -->
        <div class="ag-glass" style="padding: 24px; align-self: start;">
          <h3>Booking Summary</h3>
          <div class="ag-divider"></div>
          
          <div class="ag-flex-col ag-gap-sm">
            <div>
              <span class="ag-text-muted ag-text-sm" style="text-transform: uppercase;">Sports Complex</span>
              <div style="font-weight: 700; font-size:1.1rem; color: #fff;">${venue?.name}</div>
            </div>
            <div class="ag-mt-sm">
              <span class="ag-text-muted ag-text-sm" style="text-transform: uppercase;">Arena court</span>
              <div>${courtName} (${venue?.sport_type})</div>
            </div>
            <div class="ag-grid ag-grid-2 ag-mt-sm" style="gap: 12px;">
              <div>
                <span class="ag-text-muted ag-text-sm" style="text-transform: uppercase;">Date</span>
                <div>${checkoutData.slot.date}</div>
              </div>
              <div>
                <span class="ag-text-muted ag-text-sm" style="text-transform: uppercase;">Time Slot</span>
                <div>${checkoutData.slot.start_time.substring(0, 5)} - ${checkoutData.slot.end_time.substring(0, 5)}</div>
              </div>
            </div>
            <div class="ag-divider"></div>
            <div class="ag-flex-between">
              <span style="font-weight: 700;">Price Rate</span>
              <span class="ag-price">${APP_CONFIG.currency}${price}</span>
            </div>
            <div class="ag-flex-between">
              <span style="font-weight: 700; font-size: 1.15rem;">Subtotal</span>
              <span class="ag-price ag-price-lg">${APP_CONFIG.currency}${price}</span>
            </div>
          </div>
        </div>

        <!-- Simulated Card Form -->
        <div class="ag-glass" style="padding: 24px;">
          <h3>Secure Payment Simulation</h3>
          <div class="ag-divider"></div>

          <form id="payment-form" class="ag-flex-col" style="gap: 16px;" onsubmit="handlePaymentSubmit(event, '${checkoutData.venueId}', '${checkoutData.courtId}', '${checkoutData.slot.id}', '${checkoutData.slot.date}', '${checkoutData.slot.start_time}', '${checkoutData.slot.end_time}', ${price})">
            <div class="ag-input-group">
              <label>Cardholder Name</label>
              <input type="text" id="card-name" class="ag-input" placeholder="e.g. Alex Starfield" required>
            </div>
            <div class="ag-input-group">
              <label>Credit Card Number</label>
              <div style="position: relative;">
                <input type="text" id="card-number" class="ag-input" placeholder="0000 0000 0000 0000" maxlength="19" required>
                <span style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-size:1.2rem;">💳</span>
              </div>
            </div>
            <div class="ag-grid ag-grid-2" style="gap: 16px;">
              <div class="ag-input-group">
                <label>Expiry Date</label>
                <input type="text" id="card-expiry" class="ag-input" placeholder="MM/YY" maxlength="5" required>
              </div>
              <div class="ag-input-group">
                <label>CVV / CVC</label>
                <input type="password" id="card-cvv" class="ag-input" placeholder="***" maxlength="3" required>
              </div>
            </div>
            
            <button type="submit" id="pay-submit-btn" class="ag-btn ag-btn-primary" style="width:100%; margin-top:16px;">
              Authorize & Pay ${APP_CONFIG.currency}${price}
            </button>
          </form>
        </div>
      </div>
      <div style="height: 80px;"></div>
    </div>
  `;

  // Autotyping space filters
  const ccInput = document.getElementById('card-number');
  const expInput = document.getElementById('card-expiry');
  const cvvInput = document.getElementById('card-cvv');

  ccInput?.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let matches = value.match(/\d{4,16}/g);
    let match = matches && matches[0] || '';
    let parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      e.target.value = parts.join(' ');
    } else {
      e.target.value = value;
    }
  });

  expInput?.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^0-9]/gi, '');
    if (value.length >= 2) {
      e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
    } else {
      e.target.value = value;
    }
  });

  cvvInput?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/gi, '');
  });
}

// Payment execution submission
window.handlePaymentSubmit = async function(event, venueId, courtId, slotId, dateStr, startTime, endTime, amount) {
  event.preventDefault();
  
  const submitBtn = document.getElementById('pay-submit-btn');
  const ccInput = document.getElementById('card-number');
  
  if (!submitBtn || !currentUser) return;
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="ag-spinner ag-spinner-sm"></span> Processing Authorization...`;

  try {
    // 1. Double check lock reservation with Booking Engine
    const pendingBooking = await initiateBooking(currentUser.id, venueId, courtId, slotId, dateStr, startTime, endTime, amount);
    
    // 2. Perform simulated payment
    const last4 = ccInput.value.slice(-4);
    await confirmPayment(pendingBooking.id, last4, amount);
    
    // Success: clear checkout state, trigger FX, and render success splash
    localStorage.removeItem('cb_checkout_data');
    triggerSuccessParticles();
    
    showToast("Booking Reservation Secured Successfully!", "success");
    
    // Render Booking Success View
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="ag-container ag-page-enter ag-text-center" style="padding: 100px 24px; max-width: 600px;">
        <div style="font-size: 5rem; animation: success-check 0.8s var(--ag-spring); margin-bottom: 24px;">🎉</div>
        <h1 class="ag-glow-text">Reservation Secured!</h1>
        <p class="ag-text-muted ag-mt-md">Your slot at court has been validated. Check-in details and barcode entry tags have been stored on your profile dashboard.</p>
        
        <div class="ag-glass ag-mt-lg" style="padding: 24px; display: inline-block;">
          <canvas id="success-qr" width="180" height="180"></canvas>
          <div class="ag-text-sm ag-text-muted ag-mt-sm">Booking ID: ${pendingBooking.id}</div>
        </div>

        <div class="ag-flex-center ag-mt-lg ag-gap-lg">
          <button class="ag-btn ag-btn-primary" onclick="location.hash = '#/bookings'">My Bookings</button>
          <button class="ag-btn ag-btn-secondary" onclick="location.hash = '#/'">Return Home</button>
        </div>
      </div>
    `;
    drawQRPlaceholder('success-qr', pendingBooking.id);
  } catch (error) {
    showToast(error.message || "Failed to finalize checkout.", "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = `Authorize & Pay ${APP_CONFIG.currency}${amount}`;
  }
};

// 4. BOOKINGS HISTORY PAGE
async function renderBookingsPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="ag-container ag-page-enter" style="padding-top: 40px; max-width: 900px;">
      <h1 class="ag-glow-text">My Bookings</h1>
      <p class="ag-text-muted">Review upcoming reservations and scan entry barcode credentials.</p>

      <div class="ag-tabs ag-mt-lg" style="align-self: start;">
        <button class="ag-tab active" onclick="switchBookingsTab(this, 'upcoming')">Upcoming Slots</button>
        <button class="ag-tab" onclick="switchBookingsTab(this, 'past')">Past Sessions</button>
      </div>

      <div id="bookings-list" class="ag-flex-col ag-mt-lg" style="gap: 20px;">
        <div class="ag-flex-center" style="padding:60px 0;"><div class="ag-spinner"></div></div>
      </div>
    </div>
  `;

  await populateBookingsList('upcoming');
}

window.switchBookingsTab = async function(element, tab) {
  document.querySelectorAll('.ag-tab').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
  await populateBookingsList(tab);
};

async function populateBookingsList(tab = 'upcoming') {
  const container = document.getElementById('bookings-list');
  if (!container || !currentUser) return;

  const bookings = await fetchUserBookings(currentUser.id);
  const now = new Date();

  // Filter criteria
  const filtered = bookings.filter(b => {
    const playDateTime = new Date(`${b.booking_date}T${b.start_time}`);
    const isPast = playDateTime < now || b.status === 'cancelled' || b.status === 'completed';
    return tab === 'upcoming' ? !isPast : isPast;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="ag-empty">
        <div class="ag-empty-icon">📅</div>
        <h3>No ${tab === 'upcoming' ? 'upcoming' : 'previous'} reservations.</h3>
        <p>Book a field session on our courts grid search.</p>
        <button class="ag-btn ag-btn-secondary ag-btn-sm ag-mt-md" onclick="location.hash = '#/'">Browse Venues</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(b => {
    let statusClass = 'pending';
    if (b.status === 'confirmed') statusClass = 'confirmed';
    if (b.status === 'completed') statusClass = 'completed';
    if (b.status === 'cancelled') statusClass = 'cancelled';

    // Show cancel option only for upcoming slots (>24 hours play window)
    const playDateTime = new Date(`${b.booking_date}T${b.start_time}`);
    const diffHours = (playDateTime - now) / (1000 * 60 * 60);
    const allowCancel = b.status === 'confirmed' && diffHours >= APP_CONFIG.cancelWindowHours;

    return `
      <div class="ag-glass ag-card-float" style="padding: 24px; cursor: default; animation: none;">
        <div class="ag-grid ag-grid-2" style="grid-template-columns: 2fr 1fr; align-items: start;">
          <div>
            <div class="ag-flex" style="gap: 8px;">
              <span class="ag-status-dot ${statusClass}"></span>
              <span class="ag-badge ag-badge-cyan ag-text-sm" style="text-transform: uppercase;">${b.status}</span>
            </div>
            <h3 class="ag-mt-sm">${b.venue_name}</h3>
            <p class="ag-text-muted ag-text-sm">${b.court_name}</p>
            
            <div class="ag-grid ag-grid-3 ag-mt-md" style="gap: 16px;">
              <div>
                <span class="ag-text-muted ag-text-sm">Date</span>
                <div style="font-weight:600;">${b.booking_date}</div>
              </div>
              <div>
                <span class="ag-text-muted ag-text-sm">Time</span>
                <div style="font-weight:600;">${b.start_time.substring(0, 5)} - ${b.end_time.substring(0, 5)}</div>
              </div>
              <div>
                <span class="ag-text-muted ag-text-sm">Amount Paid</span>
                <div style="font-weight:600; color:var(--ag-cyan);">${APP_CONFIG.currency}${parseFloat(b.total_amount).toFixed(2)}</div>
              </div>
            </div>
          </div>

          <!-- Ticket Checkin QR Code Area -->
          <div class="ag-flex-col" style="align-items: flex-end; justify-content: space-between; height: 100%;">
            ${b.status !== 'cancelled' ? `
              <div class="ag-flex-col" style="align-items: center; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px;">
                <canvas id="qr-${b.id}" width="90" height="90"></canvas>
                <span class="ag-text-sm ag-text-muted ag-mt-xs" style="font-size: 0.65rem;">Scan at court entry</span>
              </div>
            ` : `<div style="height:90px; display:flex; align-items:center; color:var(--ag-error);">Reservation Revoked</div>`}
            
            ${allowCancel ? `
              <button class="ag-btn ag-btn-danger ag-btn-sm ag-mt-md" onclick="promptCancelBooking('${b.id}')">
                Cancel Booking
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Generate the Canvas QR tags post-dom inject
  filtered.forEach(b => {
    if (b.status !== 'cancelled') {
      drawQRPlaceholder(`qr-${b.id}`, b.id);
    }
  });
}

// Prompt and handle cancellations
window.promptCancelBooking = async function(bookingId) {
  if (confirm("Are you sure you want to cancel this booking? This will immediately free up the court slot.")) {
    try {
      await cancelBooking(bookingId);
      showToast("Booking cancellation completed.", "success");
      await populateBookingsList('upcoming');
    } catch (e) {
      showToast(e.message || "Failed to cancel booking.", "error");
    }
  }
};

// 5. PROFILE PAGE
async function renderProfilePage() {
  const app = document.getElementById('app');
  const stats = await fetchProfileStats(currentUser.id);

  app.innerHTML = `
    <div class="ag-container ag-page-enter" style="padding-top: 40px; max-width: 800px;">
      <h1 class="ag-glow-text">User Profile</h1>
      <p class="ag-text-muted">Manage account data profiles and review statistics.</p>

      <div class="ag-grid ag-grid-2 ag-mt-lg" style="grid-template-columns: 280px 1fr;">
        <!-- Left details panel -->
        <div class="ag-glass ag-flex-col ag-gap-lg" style="padding: 24px; align-items: center; text-align: center;">
          <div class="ag-avatar">
            ${currentUser.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3>${currentUser.full_name}</h3>
            <p class="ag-text-muted ag-text-sm">${currentUser.email}</p>
          </div>
          <div class="ag-divider" style="width:100%; margin:0;"></div>
          
          <div class="ag-flex-col ag-gap-sm" style="width:100%;">
            <div class="ag-flex-between">
              <span class="ag-text-muted ag-text-sm">Total Bookings</span>
              <span class="ag-badge">${stats.totalBookings}</span>
            </div>
            <div class="ag-flex-between">
              <span class="ag-text-muted ag-text-sm">Active Slots</span>
              <span class="ag-badge ag-badge-success">${stats.activeBookings}</span>
            </div>
            <div class="ag-flex-between">
              <span class="ag-text-muted ag-text-sm">Total Invested</span>
              <span class="ag-badge ag-badge-cyan">${APP_CONFIG.currency}${stats.totalSpent.toFixed(0)}</span>
            </div>
          </div>

          <button class="ag-btn ag-btn-danger ag-btn-sm" style="width:100%;" onclick="handleSignOutSubmit()">
            Sign Out Session
          </button>
        </div>

        <!-- Edit Form Right -->
        <div class="ag-glass" style="padding: 24px;">
          <h3>Update Credentials</h3>
          <div class="ag-divider"></div>

          <form id="profile-edit-form" class="ag-flex-col" style="gap: 16px;" onsubmit="handleProfileEditSubmit(event)">
            <div class="ag-input-group">
              <label>Email Address</label>
              <input type="text" class="ag-input" value="${currentUser.email}" disabled style="opacity: 0.6;">
            </div>
            <div class="ag-input-group">
              <label>Full Name</label>
              <input type="text" id="profile-name" class="ag-input" value="${currentUser.full_name || ''}" required>
            </div>
            <div class="ag-input-group">
              <label>Phone Number</label>
              <input type="text" id="profile-phone" class="ag-input" value="${currentUser.phone || ''}" placeholder="e.g. +1 555 0199">
            </div>
            
            <button type="submit" id="profile-save-btn" class="ag-btn ag-btn-primary" style="align-self: flex-start; margin-top: 16px;">
              Update Profile Details
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}

window.handleProfileEditSubmit = async function(event) {
  event.preventDefault();
  const saveBtn = document.getElementById('profile-save-btn');
  const nameInput = document.getElementById('profile-name');
  const phoneInput = document.getElementById('profile-phone');

  if (!saveBtn) return;
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="ag-spinner ag-spinner-sm"></span> Modifying...`;

  try {
    await updateProfile({
      full_name: nameInput.value,
      phone: phoneInput.value
    });
    showToast("Profile details updated successfully.", "success");
  } catch (error) {
    showToast(error.message || "Failed to update profile.", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = "Update Profile Details";
  }
};

window.handleSignOutSubmit = async function() {
  try {
    await signOut();
    showToast("Signed out successfully.", "info");
    location.hash = '#/';
  } catch (error) {
    showToast(error.message || "Failed to sign out.", "error");
  }
};

// ── Application Initialization ──

document.addEventListener('DOMContentLoaded', () => {
  const router = new Router();

  // Define SPA navigation map
  router
    .add('/', renderVenuesPage)
    .add('/venue/:id', renderVenueDetailPage)
    .add('/checkout', renderCheckoutPage, true)
    .add('/bookings', renderBookingsPage, true)
    .add('/profile', renderProfilePage, true);

  // Router Authenticator Guard checks login redirects
  router.setGuard(async () => {
    if (currentUser !== null) return true;
    const user = await getCurrentUserWithProfile();
    if (user) currentUser = user;
    return currentUser !== null;
  });

  // Track user login state listeners globally
  onAuthChange((user) => {
    currentUser = user;
    const authBtn = document.getElementById('nav-auth-btn');
    const userContainer = document.getElementById('nav-user-container');
    const userAvatar = document.getElementById('nav-user-avatar');

    if (user) {
      if (authBtn) authBtn.style.display = 'none';
      if (userContainer) userContainer.style.display = 'flex';
      if (userAvatar) {
        userAvatar.innerText = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
      }

      // Check if user came from a route block redirect
      const target = localStorage.getItem('cb_redirect_target');
      if (target) {
        localStorage.removeItem('cb_redirect_target');
        location.hash = target;
      }
    } else {
      if (authBtn) authBtn.style.display = 'block';
      if (userContainer) userContainer.style.display = 'none';
    }
  });

  // Register general global modal click binds
  window.addEventListener('click', (e) => {
    const authModal = document.getElementById('auth-modal');
    if (e.target === authModal) {
      hideAuthModal();
    }
  });

  // Global Auth Form Handlers binding
  const signinForm = document.getElementById('auth-signin-form');
  const signupForm = document.getElementById('auth-signup-form');

  signinForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value;
    const pass = document.getElementById('signin-password').value;
    const btn = signinForm.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.innerHTML = `<span class="ag-spinner ag-spinner-sm"></span> Signing In...`;

    try {
      await signIn(email, pass);
      hideAuthModal();
      showToast("Access Granted. Welcome back!", "success");
    } catch (err) {
      showToast(err.message || "Invalid credentials.", "error");
    } finally {
      btn.disabled = false;
      btn.innerText = "Authorize Connection";
    }
  });

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const pass = document.getElementById('signup-password').value;
    const btn = signupForm.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.innerHTML = `<span class="ag-spinner ag-spinner-sm"></span> Creating Profile...`;

    try {
      await signUp(email, pass, name);
      hideAuthModal();
      showToast("Profile Initialized. Welcome!", "success");
    } catch (err) {
      showToast(err.message || "Failed to sign up.", "error");
    } finally {
      btn.disabled = false;
      btn.innerText = "Initialize Profile";
    }
  });
  
  // Mobile navbar toggle bind
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.querySelector('.ag-nav-links');
  navToggle?.addEventListener('click', () => {
    navLinks?.classList.toggle('open');
  });

  // Trigger Routing logic
  router.handleRoute();
});

// Expose modal functions to window context
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;
