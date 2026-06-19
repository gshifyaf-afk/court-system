// ============================================================
// CourtBook — Authentication Module
// ============================================================

let supabaseClient = null;

// Initialize Supabase if not in DEMO_MODE
function initSupabase() {
  if (DEMO_MODE) {
    console.log("CourtBook running in DEMO MODE. Supabase client skipped.");
    return null;
  }
  
  if (typeof supabase === 'undefined') {
    console.error("Supabase script is not loaded in HTML.");
    return null;
  }

  if (SUPABASE_URL === 'https://YOUR_PROJECT.supabase.co' || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY') {
    console.warn("Using default placeholder Supabase credentials. Falling back to Demo Mode.");
    return null;
  }

  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  } catch (error) {
    console.error("Error initializing Supabase client:", error);
    return null;
  }
}

// Get the current supabase client
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = initSupabase();
  }
  return supabaseClient;
}

// ── Auth Functions ──

async function signUp(email, password, fullName) {
  const client = getSupabase();
  
  if (DEMO_MODE || !client) {
    // Simulate signup in Demo Mode
    await new Promise(resolve => setTimeout(resolve, 800));
    const users = JSON.parse(localStorage.getItem('cb_mock_users') || '[]');
    if (users.find(u => u.email === email)) {
      throw new Error("User already exists with this email.");
    }
    const mockUser = {
      id: 'mock-user-' + Math.random().toString(36).substr(2, 9),
      email: email,
      full_name: fullName,
      phone: '',
      avatar_url: '',
      created_at: new Date().toISOString()
    };
    users.push(mockUser);
    localStorage.setItem('cb_mock_users', JSON.stringify(users));
    localStorage.setItem('cb_current_user', JSON.stringify(mockUser));
    triggerAuthListeners(mockUser);
    return { user: mockUser, error: null };
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) throw error;
  return { user: data?.user, error: null };
}

async function signIn(email, password) {
  const client = getSupabase();

  if (DEMO_MODE || !client) {
    // Simulate login in Demo Mode
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Check main mock user
    if (email === MOCK_USER.email) {
      localStorage.setItem('cb_current_user', JSON.stringify(MOCK_USER));
      triggerAuthListeners(MOCK_USER);
      return { user: MOCK_USER, error: null };
    }

    // Check newly registered users
    const users = JSON.parse(localStorage.getItem('cb_mock_users') || '[]');
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error("Invalid login credentials.");
    }
    
    localStorage.setItem('cb_current_user', JSON.stringify(user));
    triggerAuthListeners(user);
    return { user, error: null };
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return { user: data?.user, error: null };
}

async function signOut() {
  const client = getSupabase();

  if (DEMO_MODE || !client) {
    localStorage.removeItem('cb_current_user');
    triggerAuthListeners(null);
    return { error: null };
  }

  const { error } = await client.auth.signOut();
  return { error };
}

function getUser() {
  const client = getSupabase();

  if (DEMO_MODE || !client) {
    const userStr = localStorage.getItem('cb_current_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Get active session user
  const session = client.auth.session ? client.auth.session() : null; // older client
  const user = client.auth.user ? client.auth.user() : null; // older client
  
  // Try new Supabase JS standard if older didn't return
  return client.auth.getUser ? client.auth.getUser() : { data: { user: null } };
}

// Wrapper to safely fetch current user details (including profile)
async function getCurrentUserWithProfile() {
  const client = getSupabase();
  const user = getUser();
  
  // If it's a promise (new Supabase client getUser())
  let authUser = user;
  if (user instanceof Promise) {
    const { data } = await user;
    authUser = data?.user;
  }

  if (!authUser) return null;

  if (DEMO_MODE || !client) {
    return authUser; // in demo mode user object already has full_name, phone, etc.
  }

  // Fetch profiles table for user details
  const { data: profile, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error || !profile) {
    return {
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
      avatar_url: '',
      phone: ''
    };
  }

  return {
    id: authUser.id,
    email: authUser.email,
    ...profile
  };
}

async function updateProfile(data) {
  const client = getSupabase();
  const currentUser = await getCurrentUserWithProfile();
  
  if (!currentUser) throw new Error("Not authenticated");

  if (DEMO_MODE || !client) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const updatedUser = { ...currentUser, ...data };
    
    // Save back to storage
    localStorage.setItem('cb_current_user', JSON.stringify(updatedUser));
    
    // If it's in registered users list
    const users = JSON.parse(localStorage.getItem('cb_mock_users') || '[]');
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
      users[idx] = updatedUser;
      localStorage.setItem('cb_mock_users', JSON.stringify(users));
    }
    
    triggerAuthListeners(updatedUser);
    return { data: updatedUser, error: null };
  }

  // Update profiles table
  const { data: profile, error } = await client
    .from('profiles')
    .update({
      full_name: data.full_name,
      avatar_url: data.avatar_url,
      phone: data.phone
    })
    .eq('id', currentUser.id)
    .select()
    .single();

  return { data: profile, error };
}

// ── Auth Change Subscription ──
const authListeners = new Set();

function onAuthChange(callback) {
  authListeners.add(callback);
  
  // Instantly invoke with current state
  getCurrentUserWithProfile().then(user => {
    callback(user);
  });

  const client = getSupabase();
  if (!DEMO_MODE && client) {
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      const user = await getCurrentUserWithProfile();
      callback(user);
    });
    return () => subscription.unsubscribe();
  }

  return () => {
    authListeners.delete(callback);
  };
}

function triggerAuthListeners(user) {
  authListeners.forEach(callback => callback(user));
}
