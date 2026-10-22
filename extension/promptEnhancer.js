// DeepSeek Toolbox - Prompt Enhancer

(function() {
  'use strict';
  
  const SETTINGS_KEY = 'ds_toolbox_settings';
  
  let enhanceButton = null;
  let isEnhancing = false;
  let enabled = false;
  let mountTimer = null;
  let observer = null;
  
  function createEnhanceButton() {
    const button = document.createElement('button');
    button.id = 'ds-enhance-btn';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-disabled', 'false');
    button.className = 'ds-atom-button f79352dc ds-toggle-button ds-toggle-button--md';
    button.setAttribute('tabindex', '0');
    button.style.cssText = 'transform: translateZ(0px);';
    
    button.innerHTML = `
      <div class="ds-icon ds-atom-button__icon" style="font-size: 14px; width: 14px; height: 14px; color: var(--dsw-alias-label-primary); margin-right: 0px;">
        <svg class="ds-enhance-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"/>
          <path d="M19 3L19.5 5L21 5.5L19.5 6L19 8L18.5 6L17 5.5L18.5 5L19 3Z"/>
          <path d="M19 17L19.5 19L21 19.5L19.5 20L19 22L18.5 20L17 19.5L18.5 19L19 17Z"/>
        </svg>
      </div>
      <span><span class="_6dbc175 ds-enhance-text">${ToolboxI18n.html("Enhance")}</span></span>
      <div class="ds-focus-ring"></div>
    `;
    
    button.addEventListener('click', handleEnhanceClick);
    ToolboxI18n.applyDirection(button);
    return button;
  }
  
  function findToolbarContainer() {
    return document.querySelector('.ec4f5d61');
  }
  
  function findTextarea() {
    return document.querySelector('textarea._27c9245');
  }
  
  function getTextareaValue(textarea) {
    return textarea ? textarea.value : '';
  }
  
  function setTextareaValue(textarea, value) {
    if (!textarea) return;
    
    // Use native setter for React compatibility
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    
    nativeInputValueSetter.call(textarea, value);
    
    // Dispatch events
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Focus and move cursor to end
    textarea.focus();
    textarea.setSelectionRange(value.length, value.length);
  }
  
  async function handleEnhanceClick() {
    if (isEnhancing || !enabled) return;
    isEnhancing = true;
    try {
    
    // Check daily enhance limit
    if (typeof apiClient !== 'undefined') {
      try {
        const limitCheck = await apiClient.checkFeatureLimit('dailyEnhancePrompts');
        if (!limitCheck.allowed) {
          if (typeof paywallModal !== 'undefined') {
            paywallModal.show('dailyEnhancePrompts', {
              trigger: 'daily_enhance_limit',
              current: limitCheck.current,
              limit: limitCheck.limit
            });
          }
          return;
        }
      } catch (e) {
        log('Enhance limit check failed, allowing action');
      }
    }
    
    const textarea = findTextarea();
    if (!textarea) {
      console.error('[DeepSeek Toolbox] Could not find textarea');
      return;
    }
    
    const text = getTextareaValue(textarea).trim();
    if (!text) {
      showToast(ToolboxI18n.t("Please enter some text first"), 'error');
      return;
    }
    
    const originalValue = textarea.value;
    const originalPath = location.pathname;
    updateButtonState('enhancing');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'enhancePrompt',
        data: { text: text }
      });
      
      if (response && response.success && response.improvedPrompt) {
        if (!enabled || !textarea.isConnected || location.pathname !== originalPath || textarea.value !== originalValue) {
          showToast(ToolboxI18n.t("Enhancement finished; your changed draft was preserved"), 'error');
          return;
        }
        setTextareaValue(textarea, response.improvedPrompt);
        // Increment daily usage on success
        if (typeof apiClient !== 'undefined') {
          apiClient.incrementDailyUsage('enhancePrompts');
        }
        updateButtonState('success');
        showToast(ToolboxI18n.t("Prompt enhanced!"), 'success');
      } else {
        throw new Error(response?.error || ToolboxI18n.t("Enhancement failed"));
      }
    } catch (error) {
      console.error('[DeepSeek Toolbox] Enhance error:', error);
      updateButtonState('error');
      showToast(ToolboxI18n.t("Enhancement failed"), 'error');
    }
    } finally {
      isEnhancing = false;
      setTimeout(() => updateButtonState('ready'), 2000);
    }
  }
  
  function updateButtonState(state) {
    if (!enhanceButton) return;
    
    const icon = enhanceButton.querySelector('.ds-enhance-icon');
    const text = enhanceButton.querySelector('.ds-enhance-text');
    
    switch (state) {
      case 'enhancing':
        if (icon) icon.classList.add('ds-enhance-spinning');
        if (text) text.textContent = ToolboxI18n.t("Enhancing...");
        enhanceButton.setAttribute('aria-disabled', 'true');
        break;
      case 'success':
        if (icon) {
          icon.classList.remove('ds-enhance-spinning');
          icon.innerHTML = `<path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
        }
        if (text) text.textContent = ToolboxI18n.t("Enhanced!");
        enhanceButton.setAttribute('aria-disabled', 'false');
        break;
      case 'error':
        if (icon) icon.classList.remove('ds-enhance-spinning');
        if (text) text.textContent = ToolboxI18n.t("Failed");
        enhanceButton.setAttribute('aria-disabled', 'false');
        break;
      default:
        if (icon) {
          icon.classList.remove('ds-enhance-spinning');
          icon.innerHTML = `
            <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"/>
            <path d="M19 3L19.5 5L21 5.5L19.5 6L19 8L18.5 6L17 5.5L18.5 5L19 3Z"/>
            <path d="M19 17L19.5 19L21 19.5L19.5 20L19 22L18.5 20L17 19.5L18.5 19L19 17Z"/>
          `;
        }
        if (text) text.textContent = ToolboxI18n.t("Enhance");
        enhanceButton.setAttribute('aria-disabled', 'false');
    }
  }
  
  function showToast(message, type = 'success') {
    const existing = document.querySelector('.ds-enhance-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `ds-enhance-toast ${type}`;
    toast.innerHTML = `
      ${type === 'success' 
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      }
      <span>${message}</span>
    `;
    ToolboxI18n.applyDirection(toast);
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }
  
  function mountEnhanceButton() {
    if (!enabled) return false;
    if (document.querySelector('#ds-enhance-btn')) {
      return true;
    }
    
    const toolbar = findToolbarContainer();
    if (!toolbar) {
      return false;
    }
    
    enhanceButton = createEnhanceButton();
    
    // Insert before the attachment/send button container (.bf38813a)
    const attachContainer = toolbar.querySelector('.bf38813a');
    if (attachContainer) {
      toolbar.insertBefore(enhanceButton, attachContainer);
    } else {
      toolbar.appendChild(enhanceButton);
    }
    
    log('Enhance button mounted');
    return true;
  }
  
  function unmountEnhanceButton() {
    const btn = document.querySelector('#ds-enhance-btn');
    if (btn) {
      btn.remove();
      enhanceButton = null;
      log('Enhance button removed');
    }
  }
  
  function scheduleMount() {
    if (!enabled || mountTimer || document.querySelector('#ds-enhance-btn')) return;
    mountTimer = setTimeout(() => {
      mountTimer = null;
      if (enabled) mountEnhanceButton();
    }, 150);
  }

  function applySettings(settings) {
    enabled = settings.enhancePromptEnabled !== false;
    if (enabled) {
      mountEnhanceButton();
      scheduleMount();
    } else {
      clearTimeout(mountTimer);
      mountTimer = null;
      unmountEnhanceButton();
    }
  }

  async function initialize() {
    if (observer) return;
    observer = new MutationObserver(scheduleMount);
    observer.observe(document.body, { childList: true, subtree: true });
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes[SETTINGS_KEY]) {
        applySettings(changes[SETTINGS_KEY].newValue || {});
      }
    });
    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      applySettings(result[SETTINGS_KEY] || {});
    } catch (error) {
      log('Could not load enhancement setting', error);
    }
  }

  // Expose for keyboard shortcut
  window.dsEnhancePrompt = function() {
    const btn = document.querySelector('#ds-enhance-btn');
    if (btn && btn.getAttribute('aria-disabled') !== 'true') {
      btn.click();
    }
  };
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initialize, 500));
  } else {
    setTimeout(initialize, 500);
  }
  
})();
