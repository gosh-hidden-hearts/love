/**
 * GOSH CLIENT-SIDE SPA HASH ROUTER
 * Seamless, zero-compilation, GitHub Pages compatible.
 */

import { State } from './state.js';
import { Auth } from './services/auth.service.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.viewContainer = null;
  }

  init(containerId = 'main-view-container') {
    this.viewContainer = document.getElementById(containerId);
    
    window.addEventListener('hashchange', () => this.handleRouting());
    
    // Initial route handling
    this.handleRouting();
  }

  register(routeName, handler) {
    this.routes.set(routeName, handler);
  }

  navigate(routeName) {
    window.location.hash = `#${routeName}`;
  }

  getCurrentRoute() {
    const rawHash = window.location.hash.slice(1);
    const cleanRoute = rawHash.split('?')[0].replace(/^\//, '');
    return cleanRoute || 'home';
  }

  async handleRouting() {
    let routeName = this.getCurrentRoute();

    // ROUTE SECURITY GUARD
    const isAuthed = Auth.isAuthenticated();
    if (!isAuthed && routeName !== 'auth' && routeName !== 'recovery') {
      console.log(`[GOSH ROUTER] Unauthenticated access to #${routeName} blocked. Redirecting to #auth.`);
      window.location.hash = '#auth';
      return;
    }

    if (isAuthed && routeName === 'auth') {
      window.location.hash = '#home';
      return;
    }

    const handler = this.routes.get(routeName) || this.routes.get('home');

    if (!handler) {
      console.warn(`No handler registered for route: "${routeName}"`);
      return;
    }

    // Call unmount on previous route handler if exists
    if (this.currentRoute && this.currentRoute.unmount) {
      try {
        this.currentRoute.unmount();
      } catch (err) {
        console.error('Error during route unmount:', err);
      }
    }

    State.set('activeRoute', routeName);

    // Update active class on navigation links
    this.updateActiveNavLinks(routeName);

    // Render new route
    if (this.viewContainer) {
      this.viewContainer.classList.add('loading');
      
      try {
        const content = await handler.render();
        if (typeof content === 'string') {
          this.viewContainer.innerHTML = content;
        } else if (content instanceof HTMLElement) {
          this.viewContainer.innerHTML = '';
          this.viewContainer.appendChild(content);
        }

        if (handler.mount) {
          handler.mount(this.viewContainer);
        }

        this.currentRoute = handler;
      } catch (err) {
        console.error(`Error rendering route "${routeName}":`, err);
        this.viewContainer.innerHTML = `
          <div class="empty-state">
            <h3 class="card-title text-danger">Failed to load view</h3>
            <p class="text-muted">${err.message || 'An unexpected error occurred.'}</p>
            <button class="btn btn-secondary" onclick="window.location.reload()" style="margin-top: 1rem;">
              Reload
            </button>
          </div>
        `;
      } finally {
        this.viewContainer.classList.remove('loading');
      }
    }
  }

  updateActiveNavLinks(activeRoute) {
    // Desktop sidebar links
    document.querySelectorAll('.nav-item').forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${activeRoute}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Mobile bottom nav links
    document.querySelectorAll('.bottom-nav-item').forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${activeRoute}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}

export const AppRouter = new Router();
