/**
 * GOSH ACCESSIBLE MODAL & CONFIRMATION SYSTEM
 */

import { Icons } from './icons.js';

class ModalManager {
  constructor() {
    this.activeModals = [];
    this.initKeyboardListeners();
  }

  initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModals.length > 0) {
        this.close(this.activeModals[this.activeModals.length - 1]);
      }
    });
  }

  open({ title = '', content = '', footer = null, onOpen = null, onClose = null }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    const modalId = 'modal-' + Math.random().toString(36).substring(2, 9);
    backdrop.id = modalId;

    const modal = document.createElement('div');
    modal.className = 'modal-card';

    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="card-title">${title}</h3>
        <button class="btn btn-icon btn-ghost modal-close-btn" aria-label="Close dialog">
          ${Icons.close}
        </button>
      </div>
      <div class="modal-body">${typeof content === 'string' ? content : ''}</div>
    `;

    if (typeof content !== 'string' && content instanceof HTMLElement) {
      modal.querySelector('.modal-body').appendChild(content);
    }

    if (footer) {
      const footerEl = document.createElement('div');
      footerEl.className = 'modal-footer';
      if (typeof footer === 'string') {
        footerEl.innerHTML = footer;
      } else if (footer instanceof HTMLElement) {
        footerEl.appendChild(footer);
      }
      modal.appendChild(footerEl);
    }

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Event handlers
    const closeBtn = modal.querySelector('.modal-close-btn');
    closeBtn.addEventListener('click', () => this.close(backdrop, onClose));

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.close(backdrop, onClose);
      }
    });

    // Animate open
    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      this.activeModals.push(backdrop);
      if (onOpen) onOpen(modal);
    });

    return backdrop;
  }

  confirm({
    title = 'Security Confirmation',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = false,
    onConfirm = () => {},
    onCancel = () => {}
  }) {
    const footerEl = document.createElement('div');
    footerEl.className = 'flex items-center gap-2';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = cancelText;

    const confirmBtn = document.createElement('button');
    confirmBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
    confirmBtn.textContent = confirmText;

    footerEl.appendChild(cancelBtn);
    footerEl.appendChild(confirmBtn);

    const bodyHtml = `
      <div class="flex items-center gap-4">
        <div style="color: ${isDanger ? 'var(--color-danger)' : 'var(--accent-secondary)'}; flex-shrink: 0;">
          ${isDanger ? Icons.alert : Icons.info}
        </div>
        <p style="margin: 0;">${message}</p>
      </div>
    `;

    const modal = this.open({
      title,
      content: bodyHtml,
      footer: footerEl
    });

    cancelBtn.addEventListener('click', () => {
      this.close(modal);
      onCancel();
    });

    confirmBtn.addEventListener('click', () => {
      this.close(modal);
      onConfirm();
    });

    return modal;
  }

  close(backdrop, onClose = null) {
    if (!backdrop) return;
    backdrop.classList.remove('open');
    this.activeModals = this.activeModals.filter(m => m !== backdrop);

    setTimeout(() => {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
      if (onClose) onClose();
    }, 240);
  }
}

export const Modal = new ModalManager();
