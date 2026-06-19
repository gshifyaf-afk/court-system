// ============================================================
// CourtBook — Router Module
// ============================================================

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.routeGuard = null;
    
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  // Define route paths and their render handlers
  add(path, handler, isProtected = false) {
    this.routes[path] = { handler, isProtected };
    return this;
  }

  // Add guard callback (e.g. check login state)
  setGuard(guardCallback) {
    this.routeGuard = guardCallback;
    return this;
  }

  // Parse path to match route with optional dynamic parameters (e.g., /venue/:id)
  match(hash) {
    const cleanHash = hash.replace(/^#/, '') || '/';
    const hashParts = cleanHash.split('/').filter(Boolean);

    for (const routePath in this.routes) {
      const routeParts = routePath.split('/').filter(Boolean);

      if (routeParts.length !== hashParts.length) continue;

      const params = {};
      let isMatch = true;

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          const paramName = routeParts[i].slice(1);
          params[paramName] = hashParts[i];
        } else if (routeParts[i] !== hashParts[i]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        return {
          route: this.routes[routePath],
          params
        };
      }
    }

    return null;
  }

  async handleRoute() {
    const hash = window.location.hash || '#/';
    const matchResult = this.match(hash);

    if (!matchResult) {
      console.warn("Route not found:", hash);
      // Fallback to home/venues
      window.location.hash = '#/';
      return;
    }

    const { route, params } = matchResult;

    // Check route guard (e.g., authentication check)
    if (route.isProtected && this.routeGuard) {
      const isAllowed = await this.routeGuard();
      if (!isAllowed) {
        console.warn("Access denied: Route is protected. Redirecting...");
        // Save target route for post-login redirect
        localStorage.setItem('cb_redirect_target', hash);
        window.location.hash = '#/';
        // Open sign-in modal
        if (typeof showAuthModal === 'function') {
          showAuthModal('signin');
        }
        return;
      }
    }

    // Execute route handler
    try {
      this.currentRoute = hash;
      
      // Update navigation active state
      document.querySelectorAll('.ag-nav-link').forEach(link => {
        const linkHash = link.getAttribute('onclick')
          ? link.getAttribute('onclick').match(/'([^']+)'/)[1]
          : '';
        if (linkHash && hash.startsWith(linkHash)) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      // Close mobile menu if open
      const navLinks = document.querySelector('.ag-nav-links');
      if (navLinks) {
        navLinks.classList.remove('open');
      }

      await route.handler(params);
    } catch (error) {
      console.error("Error executing route handler:", error);
    }
  }

  navigate(path) {
    window.location.hash = path;
  }
}
