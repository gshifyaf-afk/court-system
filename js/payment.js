// ============================================================
// CourtBook — Payment Module (Simulated)
// ============================================================

async function confirmPayment(bookingId, cardLast4, totalAmount) {
  const client = getSupabase();

  if (DEMO_MODE || !client) {
    await new Promise(resolve => setTimeout(resolve, APP_CONFIG.paymentProcessingMs));
    
    // In demo mode: Find and confirm booking
    const booking = demoBookings.find(b => b.id === bookingId);
    if (booking) {
      booking.status = 'confirmed';
      booking.payment_method = 'card';
    }
    return { success: true };
  }

  // Supabase implementation:
  // 1. Insert payment record
  const { error: paymentError } = await client
    .from('payments')
    .insert({
      booking_id: bookingId,
      amount: totalAmount,
      card_last4: cardLast4,
      status: 'success'
    });

  if (paymentError) throw paymentError;

  // 2. Update booking status to confirmed
  const { error: bookingError } = await client
    .from('bookings')
    .update({ 
      status: 'confirmed',
      payment_method: 'card'
    })
    .eq('id', bookingId);

  if (bookingError) throw bookingError;

  return { success: true };
}

// ── Antigravity Success Particle Burst Animation ──
function triggerSuccessParticles() {
  const canvas = document.createElement('canvas');
  canvas.className = 'ag-particle-canvas';
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  let animationFrameId;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const particles = [];
  const colors = ['#00F0FF', '#B200FF', '#00FF88', '#EAEAEA'];
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Create particles
  for (let i = 0; i < 150; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 4;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (Math.random() * 2), // slight gravity float
      radius: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.02 + 0.01
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let activeParticles = 0;
    particles.forEach(p => {
      if (p.alpha <= 0) return;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravity pull
      p.alpha -= p.decay;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      // Glow effect for neon colors
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.restore();

      activeParticles++;
    });

    if (activeParticles > 0) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      canvas.remove();
    }
  }

  animate();
}

// ── QR Code Placeholder Generator ──
// Draws a clean, glowing high-tech QR code styling using canvas
function drawQRPlaceholder(canvasId, text) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);

  // Background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fillRect(0, 0, size, size);

  // Border outline
  ctx.strokeStyle = '#00F0FF';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  // QR outer corners (aiming targets)
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(12, 12, 40, 40);
  ctx.fillStyle = '#0A0E17';
  ctx.fillRect(20, 20, 24, 24);
  ctx.fillStyle = '#B200FF';
  ctx.fillRect(26, 26, 12, 12);

  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(size - 52, 12, 40, 40);
  ctx.fillStyle = '#0A0E17';
  ctx.fillRect(size - 44, 20, 24, 24);
  ctx.fillStyle = '#B200FF';
  ctx.fillRect(size - 38, 26, 12, 12);

  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(12, size - 52, 40, 40);
  ctx.fillStyle = '#0A0E17';
  ctx.fillRect(20, size - 44, 24, 24);
  ctx.fillStyle = '#B200FF';
  ctx.fillRect(26, size - 38, 12, 12);

  // Grid random boxes (looks like QR)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  const cols = 21;
  const unit = (size - 24) / cols;
  
  // Use hash of text for random seed reproducibility
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed += text.charCodeAt(i);
  }

  function pseudorandom() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  for (let r = 0; r < cols; r++) {
    for (let c = 0; c < cols; c++) {
      // Avoid corners
      const isTopLeft = r < 7 && c < 7;
      const isTopRight = r < 7 && c >= cols - 7;
      const isBottomLeft = r >= cols - 7 && c < 7;
      
      if (!isTopLeft && !isTopRight && !isBottomLeft) {
        if (pseudorandom() > 0.5) {
          ctx.fillStyle = pseudorandom() > 0.3 ? '#EAEAEA' : '#00F0FF';
          ctx.fillRect(12 + c * unit, 12 + r * unit, unit - 0.5, unit - 0.5);
        }
      }
    }
  }

  // Neon scanning line across QR code
  // Just static visual decoration
  ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.fillRect(8, size / 2 - 2, size - 16, 4);
}
