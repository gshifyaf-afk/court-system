// ============================================================
// CourtBook — Venues & Discovery Module
// ============================================================

async function fetchVenues(sportType = 'all', searchQuery = '') {
  const client = getSupabase();

  if (DEMO_MODE || !client) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    let results = [...MOCK_VENUES];

    if (sportType && sportType !== 'all') {
      results = results.filter(v => v.sport_type.toLowerCase() === sportType.toLowerCase());
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(v => 
        v.name.toLowerCase().includes(q) || 
        v.description.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q)
      );
    }

    return results;
  }

  // Supabase Fetch
  let query = client
    .from('venues')
    .select('*, venue_amenities(amenities(name, icon))');

  if (sportType && sportType !== 'all') {
    query = query.eq('sport_type', sportType);
  }

  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching venues from Supabase:", error);
    return [];
  }

  // Format amenities to match mock structure
  return data.map(v => {
    const amenitiesList = v.venue_amenities
      ? v.venue_amenities.map(va => va.amenities?.icon).filter(Boolean)
      : [];
    return {
      ...v,
      amenities: amenitiesList,
      distance: `${(Math.random() * 4 + 1).toFixed(1)} km` // static demo distance
    };
  });
}

async function fetchVenueById(id) {
  const client = getSupabase();

  if (DEMO_MODE || !client) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const venue = MOCK_VENUES.find(v => v.id === id);
    if (!venue) return null;
    return { ...venue };
  }

  // Supabase Fetch Detail
  const { data: venue, error } = await client
    .from('venues')
    .select('*, courts(*), venue_amenities(amenities(name, icon))')
    .eq('id', id)
    .single();

  if (error || !venue) {
    console.error("Error fetching venue detail:", error);
    return null;
  }

  // Re-format for easy rendering
  const amenitiesList = venue.venue_amenities
    ? venue.venue_amenities.map(va => va.amenities).filter(Boolean)
    : [];

  return {
    id: venue.id,
    name: venue.name,
    sport_type: venue.sport_type,
    description: venue.description,
    address: venue.address,
    lat: venue.lat,
    lng: venue.lng,
    price_per_hour: venue.price_per_hour,
    rating: venue.rating,
    images: venue.images,
    amenities: amenitiesList.map(a => a.icon),
    amenities_details: amenitiesList, // keep both structure formats
    courts: venue.courts || [],
    distance: `${(Math.random() * 4 + 1).toFixed(1)} km`
  };
}

// ── Rendering Functions ──

function renderVenueCards(venuesList, container) {
  if (!container) return;

  if (venuesList.length === 0) {
    container.innerHTML = `
      <div class="ag-empty">
        <div class="ag-empty-icon">🏟️</div>
        <h3>No Venues Found</h3>
        <p>Try searching for a different sport or clearing your filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = venuesList.map(venue => {
    // Generate star rating SVG elements
    const fullStars = Math.floor(venue.rating);
    const halfStar = venue.rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) starsHtml += '<span class="ag-rating-star">★</span>';
    if (halfStar) starsHtml += '<span class="ag-rating-star">★</span>'; // simplification
    for (let i = 0; i < emptyStars; i++) starsHtml += '<span class="ag-rating-star empty">★</span>';

    // Highlight top 3 amenities
    const topAmenities = venue.amenities.slice(0, 3).map(amKey => {
      const emoji = AMENITY_ICONS[amKey] || '✨';
      const label = amKey.replace('_', ' ');
      return `<span class="ag-badge" title="${label}">${emoji}</span>`;
    }).join(' ');

    const sportLabel = SPORT_TYPES.find(s => s.key === venue.sport_type)?.label || venue.sport_type;
    const imageSource = venue.images && venue.images[0]
      ? venue.images[0]
      : ''; // Empty will trigger placeholder style in CSS/HTML

    const priceText = `${APP_CONFIG.currency}${parseFloat(venue.price_per_hour).toFixed(0)}`;

    return `
      <div class="ag-card-float" onclick="location.hash = '#/venue/${venue.id}'">
        ${imageSource 
          ? `<img src="${imageSource}" class="ag-card-img" alt="${venue.name}" onerror="this.outerHTML='<div class=ag-card-img-placeholder>🏟️</div>'">`
          : `<div class="ag-card-img-placeholder">🏟️</div>`
        }
        <div class="ag-card-body">
          <div class="ag-flex-between">
            <span class="ag-badge ag-badge-cyan ag-text-sm" style="text-transform: uppercase;">${sportLabel}</span>
            <div class="ag-rating">
              ${starsHtml}
              <span class="ag-rating-value">${venue.rating.toFixed(1)}</span>
            </div>
          </div>
          <h3 class="ag-card-title ag-mt-sm">${venue.name}</h3>
          <p class="ag-text-muted ag-text-sm ag-mt-xs" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${venue.description}
          </p>
          <div class="ag-flex ag-mt-md ag-gap-sm">
            ${topAmenities}
          </div>
        </div>
        <div class="ag-card-footer">
          <div class="ag-card-meta">
            📍 <span>${venue.distance}</span>
          </div>
          <div class="ag-price">
            ${priceText}<span class="ag-price-unit">/hr</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
