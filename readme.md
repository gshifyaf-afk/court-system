# 🏟️ CourtBook — Sports Venue Booking Platform

CourtBook is a futuristic, floating, high-tech sports venue and court scheduling system built in 24 hours. Users can browse athletic complexes, filter by sport types, search by query, check live schedule availability, simulate card payments (complete with neon particle explosions), and review their booking history/ticket codes—all wrapped in a premium **Antigravity Glassmorphic UI Theme** with deep void backgrounds and pulsing neon accents.

---

## 🚀 Key Stack
- **Frontend Core:** Vanilla HTML5, CSS3, and JavaScript (ES6 Modules/Vanilla JS).
- **Design System:** Custom CSS (`antigravity.css`) implementing backdrop glass blurs, neon gradients, pulsing glows, floating animations, and mobile-first media queries.
- **Backend/DB:** Supabase (Auth, PostgreSQL DB, Realtime subscriptions, and atomic PL/pgSQL database locks).

---

## 🎨 Antigravity UI Aesthetics
- **Core Background:** `#0A0E17` (Deep Void Space)
- **Surfaces:** `rgba(255, 255, 255, 0.05)` with `backdrop-filter: blur(20px)` (Frosted Glass panels)
- **Primary Accent:** `#00F0FF` (Glowing Cyber Cyan)
- **Secondary Accent:** `#B200FF` (Glowing Purple Aura)
- **Text Styles:** Futuristic Orbitron headings and clean Inter body typography.
- **Micro-interactions:** Glowing outline inputs, hover-induced card floats, pulsing time-slot availability pills, and canvas-based particle bursts.

---

## 🛠️ Project Structure
```
court system/
├── index.html              # Single Page Application (SPA) entrypoint shell
├── schema.sql              # Supabase PostgreSQL database schemas & seed mock data
├── readme.md               # Setup and project documentation
├── css/
│   └── antigravity.css     # Complete visual design system & utility classes
└── js/
    ├── config.js           # Supabase credentials, app configuration & mock seeds
    ├── router.js           # Hash-based SPA Router with authenticated route guards
    ├── auth.js             # Authentication module (local storage simulation & Supabase integration)
    ├── venues.js           # Venue listing, detail loading, search filters & ratings
    ├── booking.js          # Booking picker, availability checkers, and slot locks
    ├── payment.js          # Simulated credit card form, procedural QR, and canvas animations
    ├── profile.js          # User transaction & reservation statistics compiler
    └── app.js              # Application controller orchestrating components & events
```

---

## 🚀 Getting Started

### 1. Run in Demo Mode (Zero Setup)
By default, the application is configured in **Demo Mode**. You do not need any database or server setup to play with it.
1. Open the [index.html](file:///c:/Users/garsh/OneDrive/Desktop/court%20system/index.html) file directly in any modern browser (or serve it with an extension like Live Server in VS Code).
2. Click **Sign In** in the top right.
3. Login using the default credentials:
   - **Email:** `player@courtbook.io`
   - **Password:** *Anything works!*
4. Explore searching, filtering, picking courts, selecting available slots (marked with a pulsing cyan border), checking out, paying, and reviewing ticket bar-codes under **My Bookings**.

---

### 2. Connect Your Supabase Backend
To wire CourtBook to your real Supabase backend, perform the following steps:

#### Step A: Configure the Database
1. Go to your [Supabase Dashboard](https://supabase.com).
2. Create a new project.
3. Open the **SQL Editor** in the left sidebar.
4. Copy the entire contents of [schema.sql](file:///c:/Users/garsh/OneDrive/Desktop/court%20system/schema.sql) and paste it into the query editor.
5. Click **Run** to generate the tables (`profiles`, `venues`, `courts`, `time_slots`, `bookings`, `payments`), database triggers, row-level security (RLS) policies, atomic slot-locking functions (`confirm_booking`), and mock athletic complexes data.

#### Step B: Set Up Project Credentials
1. Go to **Project Settings** -> **API** in the Supabase Dashboard.
2. Retrieve your **Project URL** and **anon public API key**.
3. Open [js/config.js](file:///c:/Users/garsh/OneDrive/Desktop/court%20system/js/config.js).
4. Update the values:
   ```javascript
   const SUPABASE_URL = 'https://your-project-id.supabase.co';
   const SUPABASE_ANON_KEY = 'your-actual-anon-key-string';
   const DEMO_MODE = false; // Set to false to disable mock data
   ```
5. Reload the webpage. All authentication, booking slot checks, real-time syncs, profile updates, and cancellations will now write directly to your database.

---

## 🛡️ Atomic Double-Booking Prevention
When a player schedules a booking, race conditions are prevented:
- **Supabase Mode:** The application calls the Postgres transaction function `confirm_booking(p_user_id, ...)` via Remote Procedure Call (RPC). It acquires a row-level write lock (`FOR UPDATE`) on the target `time_slots` row to guarantee that slots are allocated on a first-come, first-served basis, instantly rejecting concurrent requests.
- **Demo Mode:** An in-memory cache check blocks booking operations if a slot state changes before authorization is submitted.

---

## 🌟 Visual Features Included
- **Floating Arena Cards:** Staggered floating cards (`.ag-card-float`) that elevate and glow neon on mouseover.
- **Live Slot Picker:** Interactive grid items showing available slots (cyan borders), selected slots (glowing purple background), and booked slots (greyed out with strike-through).
- **Simulated Checkout Card Form:** Text formatting script automatically formats inputs (spaces credit card inputs every 4 digits and adds slashes to expiry dates).
- **High-Tech Payment Splash:** Upon click, a custom HTML5 canvas burst function initiates, rendering 150 glowing gravity-affected neon particles that drift down the page.
- **High-Tech QR Code Generator:** Uses canvas rendering to draw high-tech glowing scan patterns matching the exact Booking ID for entry-gate ticket simulation.
