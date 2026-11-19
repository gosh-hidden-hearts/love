/**
 * GOSH TOAST NOTIFICATION COMPONENT
 */

import { Icons } from './icons.js';

class ToastManager {
  constructor() {
    this.container = null;
  }

  init() {
    if (typeof document === 'undefined') return;
    if (!this.container) {
      this.container = document.getElementById('toast-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        document.body.appendChild(this.container);
      }
    }
  }

  show(type = 'info', title = '', message = '', duration = 4000) {
    if (typeof document === 'undefined') {
      console.log(`[TOAST MOCK ${type.toUpperCase()}] ${title}: ${message}`);
      return null;
    }
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = Icons.info;
    if (type === 'success') iconSvg = Icons.check;
    if (type === 'warning') iconSvg = Icons.alert;
    if (type === 'error') iconSvg = Icons.alert;

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close-btn" aria-label="Close notification" style="color: var(--text-subtle); padding: 2px;">
        ${Icons.close}
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn.addEventListener('click', () => this.dismiss(toast));

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }

    return toast;
  }

  dismiss(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }

  success(title, message, duration) { return this.show('success', title, message, duration); }
  info(title, message, duration) { return this.show('info', title, message, duration); }
  warning(title, message, duration) { return this.show('warning', title, message, duration); }
  error(title, message, duration) { return this.show('error', title, message, duration); }
}

export const Toast = new ToastManager();
