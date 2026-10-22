// DeepSeek Toolbox - Dialog Utilities
// Custom themed dialogs to replace browser native alert/confirm/prompt

const DialogUtils = (function() {
  'use strict';
  
  function getThemeColors() {
    const isDark = document.body.classList.contains('dark');
    return {
      bg: isDark ? '#1e1e1e' : '#ffffff',
      bgSecondary: isDark ? '#2a2a2a' : '#f5f5f5',
      text: isDark ? '#e4e4e4' : '#1a1a1a',
      textSecondary: isDark ? '#888888' : '#666666',
      border: isDark ? '#333333' : '#e0e0e0',
      hover: isDark ? '#2a2a2a' : '#f0f0f0',
      accent: '#4d6bfe',
      danger: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981'
    };
  }
  
  function getTypeColor(type, colors) {
    switch (type) {
      case 'danger': return colors.danger;
      case 'warning': return colors.warning;
      case 'success': return colors.success;
      default: return colors.accent;
    }
  }
  
  function getTypeIcon(type, color) {
    switch (type) {
      case 'danger':
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`;
      case 'warning':
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`;
      case 'success':
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>`;
      default:
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>`;
    }
  }
  
  function createBackdrop(colors, onClose) {
    const backdrop = document.createElement('div');
    backdrop.className = 'ds-dialog-backdrop';
    backdrop.style.cssText = `
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px); z-index: 100010;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.15s ease;
    `;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && onClose) onClose();
    });
    return backdrop;
  }
  
  function createDialogBox(colors, width = '400px') {
    const dialog = document.createElement('div');
    dialog.className = 'ds-dialog-box';
    dialog.style.cssText = `
      background: ${colors.bg}; border-radius: 12px; padding: 24px;
      max-width: ${width}; width: 90%; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
      transform: scale(0.95); opacity: 0; transition: all 0.15s ease;
    `;
    ToolboxI18n.applyDirection(dialog);
    return dialog;
  }
  
  function animateIn(backdrop, dialog) {
    ToolboxI18n.applyDirection(backdrop);
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      dialog.style.opacity = '1';
      dialog.style.transform = 'scale(1)';
    });
  }
  
  function animateOut(backdrop, dialog) {
    return new Promise(resolve => {
      backdrop.style.opacity = '0';
      dialog.style.opacity = '0';
      dialog.style.transform = 'scale(0.95)';
      setTimeout(() => {
        backdrop.remove();
        resolve();
      }, 150);
    });
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show a confirmation dialog
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} [options.confirmText='Confirm'] - Confirm button text
   * @param {string} [options.cancelText='Cancel'] - Cancel button text
   * @param {string} [options.type='info'] - Dialog type: 'info', 'danger', 'warning', 'success'
   * @returns {Promise<boolean>} - Resolves true if confirmed, false if cancelled
   */
  function showConfirm(options = {}) {
    const {
      title = ToolboxI18n.t("Confirm"),
      message = ToolboxI18n.t("Are you sure?"),
      confirmText = ToolboxI18n.t("Confirm"),
      cancelText = ToolboxI18n.t("Cancel"),
      type = 'info'
    } = options;
    
    return new Promise(resolve => {
      const colors = getThemeColors();
      const typeColor = getTypeColor(type, colors);
      
      let resolved = false;
      const cleanup = (result) => {
        if (resolved) return;
        resolved = true;
        document.removeEventListener('keydown', handleKeydown);
        animateOut(backdrop, dialog).then(() => resolve(result));
      };
      
      const handleKeydown = (e) => {
        if (e.key === 'Escape') cleanup(false);
        if (e.key === 'Enter') cleanup(true);
      };
      
      const backdrop = createBackdrop(colors, () => cleanup(false));
      const dialog = createDialogBox(colors);
      
      dialog.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px;">
          <div style="flex-shrink: 0;">${getTypeIcon(type, typeColor)}</div>
          <div style="flex: 1; min-width: 0;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${colors.text};">${escapeHtml(title)}</h3>
            <p style="margin: 0; font-size: 14px; color: ${colors.textSecondary}; line-height: 1.5;">${escapeHtml(message)}</p>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button class="ds-dialog-cancel" style="
            padding: 10px 20px; border: 1px solid ${colors.border}; background: transparent;
            color: ${colors.text}; border-radius: 8px; font-size: 14px; cursor: pointer;
            transition: background 0.15s ease;
          ">${escapeHtml(cancelText)}</button>
          <button class="ds-dialog-confirm" style="
            padding: 10px 20px; border: none; background: ${type === 'danger' ? colors.danger : colors.accent};
            color: white; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
            transition: opacity 0.15s ease;
          ">${escapeHtml(confirmText)}</button>
        </div>
      `;
      
      backdrop.appendChild(dialog);
      
      dialog.querySelector('.ds-dialog-cancel').addEventListener('click', () => cleanup(false));
      dialog.querySelector('.ds-dialog-confirm').addEventListener('click', () => cleanup(true));
      
      // Hover effects
      const cancelBtn = dialog.querySelector('.ds-dialog-cancel');
      cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.background = colors.hover);
      cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.background = 'transparent');
      
      const confirmBtn = dialog.querySelector('.ds-dialog-confirm');
      confirmBtn.addEventListener('mouseenter', () => confirmBtn.style.opacity = '0.9');
      confirmBtn.addEventListener('mouseleave', () => confirmBtn.style.opacity = '1');
      
      document.addEventListener('keydown', handleKeydown);
      animateIn(backdrop, dialog);
      
      // Focus confirm button
      setTimeout(() => confirmBtn.focus(), 50);
    });
  }

  /**
   * Show a prompt dialog for user input
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string} [options.message] - Optional message
   * @param {string} [options.placeholder] - Input placeholder
   * @param {string} [options.defaultValue=''] - Default input value
   * @param {string} [options.confirmText='OK'] - Confirm button text
   * @param {string} [options.cancelText='Cancel'] - Cancel button text
   * @returns {Promise<string|null>} - Resolves with input value or null if cancelled
   */
  function showPrompt(options = {}) {
    const {
      title = ToolboxI18n.t("Enter value"),
      message = '',
      placeholder = '',
      defaultValue = '',
      confirmText = ToolboxI18n.t("OK"),
      cancelText = ToolboxI18n.t("Cancel")
    } = options;
    
    return new Promise(resolve => {
      const colors = getThemeColors();
      
      let resolved = false;
      const cleanup = (result) => {
        if (resolved) return;
        resolved = true;
        document.removeEventListener('keydown', handleKeydown);
        animateOut(backdrop, dialog).then(() => resolve(result));
      };
      
      const handleKeydown = (e) => {
        if (e.key === 'Escape') cleanup(null);
        if (e.key === 'Enter') {
          const input = dialog.querySelector('.ds-dialog-input');
          cleanup(input.value);
        }
      };
      
      const backdrop = createBackdrop(colors, () => cleanup(null));
      const dialog = createDialogBox(colors);
      
      dialog.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${colors.text};">${escapeHtml(title)}</h3>
          ${message ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: ${colors.textSecondary}; line-height: 1.5;">${escapeHtml(message)}</p>` : ''}
          <input type="text" class="ds-dialog-input" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}" style="
            width: 100%; padding: 12px 14px; background: ${colors.bgSecondary};
            border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.text};
            font-size: 14px; outline: none; box-sizing: border-box;
            transition: border-color 0.15s ease;
          "/>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button class="ds-dialog-cancel" style="
            padding: 10px 20px; border: 1px solid ${colors.border}; background: transparent;
            color: ${colors.text}; border-radius: 8px; font-size: 14px; cursor: pointer;
            transition: background 0.15s ease;
          ">${escapeHtml(cancelText)}</button>
          <button class="ds-dialog-confirm" style="
            padding: 10px 20px; border: none; background: ${colors.accent};
            color: white; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
            transition: opacity 0.15s ease;
          ">${escapeHtml(confirmText)}</button>
        </div>
      `;
      
      backdrop.appendChild(dialog);
      
      const input = dialog.querySelector('.ds-dialog-input');
      input.addEventListener('focus', () => input.style.borderColor = colors.accent);
      input.addEventListener('blur', () => input.style.borderColor = colors.border);
      
      dialog.querySelector('.ds-dialog-cancel').addEventListener('click', () => cleanup(null));
      dialog.querySelector('.ds-dialog-confirm').addEventListener('click', () => cleanup(input.value));
      
      // Hover effects
      const cancelBtn = dialog.querySelector('.ds-dialog-cancel');
      cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.background = colors.hover);
      cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.background = 'transparent');
      
      const confirmBtn = dialog.querySelector('.ds-dialog-confirm');
      confirmBtn.addEventListener('mouseenter', () => confirmBtn.style.opacity = '0.9');
      confirmBtn.addEventListener('mouseleave', () => confirmBtn.style.opacity = '1');
      
      document.addEventListener('keydown', handleKeydown);
      animateIn(backdrop, dialog);
      
      // Focus and select input
      setTimeout(() => {
        input.focus();
        input.select();
      }, 50);
    });
  }

  /**
   * Show an alert dialog
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} [options.buttonText='OK'] - Button text
   * @param {string} [options.type='info'] - Dialog type: 'info', 'danger', 'warning', 'success'
   * @returns {Promise<void>} - Resolves when dialog is closed
   */
  function showAlert(options = {}) {
    const {
      title = ToolboxI18n.t("Alert"),
      message = '',
      buttonText = ToolboxI18n.t("OK"),
      type = 'info'
    } = options;
    
    return new Promise(resolve => {
      const colors = getThemeColors();
      const typeColor = getTypeColor(type, colors);
      
      let resolved = false;
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        document.removeEventListener('keydown', handleKeydown);
        animateOut(backdrop, dialog).then(() => resolve());
      };
      
      const handleKeydown = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') cleanup();
      };
      
      const backdrop = createBackdrop(colors, cleanup);
      const dialog = createDialogBox(colors);
      
      dialog.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px;">
          <div style="flex-shrink: 0;">${getTypeIcon(type, typeColor)}</div>
          <div style="flex: 1; min-width: 0;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${colors.text};">${escapeHtml(title)}</h3>
            <p style="margin: 0; font-size: 14px; color: ${colors.textSecondary}; line-height: 1.5;">${escapeHtml(message)}</p>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <button class="ds-dialog-confirm" style="
            padding: 10px 24px; border: none; background: ${colors.accent};
            color: white; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
            transition: opacity 0.15s ease;
          ">${escapeHtml(buttonText)}</button>
        </div>
      `;
      
      backdrop.appendChild(dialog);
      
      const confirmBtn = dialog.querySelector('.ds-dialog-confirm');
      confirmBtn.addEventListener('click', cleanup);
      confirmBtn.addEventListener('mouseenter', () => confirmBtn.style.opacity = '0.9');
      confirmBtn.addEventListener('mouseleave', () => confirmBtn.style.opacity = '1');
      
      document.addEventListener('keydown', handleKeydown);
      animateIn(backdrop, dialog);
      
      // Focus button
      setTimeout(() => confirmBtn.focus(), 50);
    });
  }

  return {
    showConfirm,
    showPrompt,
    showAlert
  };
})();
