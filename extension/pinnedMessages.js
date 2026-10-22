// DeepSeek Toolbox - Pinned Messages
// Injects bookmark buttons into messages

const PinnedMessages = (function() {
  'use strict';
  
  const SELECTORS = {
    turnContainer: '._4f9bf79',
    messageContent: '.ds-message',
    userMessageClass: 'd29f3d7d',
    actionButtons: '._965abe9'
  };
  
  let initialized = false;
  let enabled = true;
  let conversationId = null;
  let conversationTitle = null;
  let observer = null;
  let refreshTimer = null;
  const pendingButtons = new WeakSet();
  
  async function init() {
    if (initialized) return;
    
    // Check if feature is enabled in settings
    try {
      const result = await chrome.storage.local.get('ds_toolbox_settings');
      const settings = result.ds_toolbox_settings || {};
      if (settings.pinMessagesEnabled === false) {
        enabled = false;
        log('PinnedMessages disabled by settings');

      }
    } catch (e) {
      // Settings not available, continue with default enabled
    }
    
    await PinnedMessagesService.init();
    updateConversationInfo();
    injectButtons();
    setupObserver();
    initialized = true;
    log('PinnedMessages initialized');
  }
  
  function disable() {
    enabled = false;
    // Remove all pin buttons
    document.querySelectorAll('.ds-pin-btn').forEach(btn => btn.remove());
    log('PinnedMessages disabled');
  }
  
  function enable() {
    enabled = true;
    updateConversationInfo();
    injectButtons();
    log('PinnedMessages enabled');
  }
  
  function updateConversationInfo() {
    const urlMatch = location.pathname.match(/\/chat\/s\/([^\/]+)/);
    conversationId = urlMatch ? urlMatch[1] : null;

    const activeChat = document.querySelector('a._546d736.cefc9c43');
    conversationTitle = activeChat?.querySelector('.c08e6e93')?.textContent || ToolboxI18n.t("New Chat");
    
    log('Conversation:', conversationId, conversationTitle);
  }
  
  function injectButtons() {
    updateConversationInfo();
    if (!enabled || !conversationId) return;
    const turns = document.querySelectorAll(SELECTORS.turnContainer);
    turns.forEach((turn, index) => injectButton(turn, index).catch(error => log('Bookmark update failed', error)));
  }

  async function injectButton(turnEl, index) {
    if (!enabled || !conversationId || pendingButtons.has(turnEl)) return;
    const actionContainer = turnEl.querySelector(SELECTORS.actionButtons);
    const messageEl = turnEl.querySelector(SELECTORS.messageContent);
    if (!actionContainer || !messageEl) return;
    pendingButtons.add(turnEl);
    try {
      const chatId = conversationId;
      const key = turnEl.closest('[data-virtual-list-item-key]')?.getAttribute('data-virtual-list-item-key');
      // Prefer the virtual list's stable key, while preserving existing index-based pins.
      const legacyId = `${chatId}-msg-${index}`;
      const legacy = await PinnedMessagesService.findPin(legacyId, chatId);
      const messageId = legacy ? legacyId : key !== undefined && key !== null
        ? `${chatId}-key-${encodeURIComponent(key)}` : legacyId;
      const isPinned = await PinnedMessagesService.isPinned(messageId, chatId);
      if (!enabled || !turnEl.isConnected || chatId !== location.pathname.match(/\/chat\/s\/([^/]+)/)?.[1]) return;
      if (key !== turnEl.closest('[data-virtual-list-item-key]')?.getAttribute('data-virtual-list-item-key')) return;
      let btn = actionContainer.querySelector('.ds-pin-btn');
      if (btn && btn.dataset.messageId !== messageId) { btn.remove(); btn = null; }
      if (btn) {
        if (btn.classList.contains('pinned') !== isPinned) {
          btn.classList.toggle('pinned', isPinned);
          btn.title = isPinned ? ToolboxI18n.t("Remove bookmark") : ToolboxI18n.t("Bookmark message");
          btn.querySelector('.ds-icon').innerHTML = getBookmarkIcon(isPinned);
        }
        return;
      }
      btn = document.createElement('div');
      btn.className = 'db183363 ds-icon-button ds-icon-button--m ds-icon-button--sizing-container ds-pin-btn' + (isPinned ? ' pinned' : '');
      btn.setAttribute('tabindex', '0');
      btn.setAttribute('role', 'button');
      btn.title = isPinned ? ToolboxI18n.t("Remove bookmark") : ToolboxI18n.t("Bookmark message");
      btn.dataset.messageId = messageId;
      btn.dataset.conversationId = chatId;
      btn.dataset.index = index;
      btn.innerHTML = `<div class="ds-icon-button__hover-bg"></div><div class="ds-icon">${getBookmarkIcon(isPinned)}</div><div class="ds-focus-ring"></div>`;
      btn.addEventListener('click', e => { e.stopPropagation(); handlePinClick(btn, messageEl, index); });
      btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
      actionContainer.appendChild(btn);
    } finally {
      pendingButtons.delete(turnEl);
    }
  }

  function getBookmarkIcon(filled) {
    if (filled) {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z"/>
      </svg>`;
    }
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z"/>
    </svg>`;
  }
  
  async function handlePinClick(btn, messageEl, index) {
    if (btn.dataset.busy === 'true') return;
    btn.dataset.busy = 'true';
    const messageId = btn.dataset.messageId;
    const pinConversationId = btn.dataset.conversationId;
    const isPinned = btn.classList.contains('pinned');
    
    try {
      if (isPinned) {
        const pin = await PinnedMessagesService.findPin(messageId, pinConversationId);
        if (pin) {
          await PinnedMessagesService.deletePin(pin.id);
          btn.classList.remove('pinned');
          btn.title = ToolboxI18n.t("Bookmark message");
          btn.querySelector('.ds-icon').innerHTML = getBookmarkIcon(false);
          showToast(ToolboxI18n.t("Bookmark removed"));
        }
      } else {
        // Check pinned messages limit before adding
        if (typeof apiClient !== 'undefined') {
          try {
            const limitCheck = await apiClient.checkFeatureLimit('pinnedMessages');
            if (!limitCheck.allowed) {
              if (typeof paywallModal !== 'undefined') {
                paywallModal.show('pinnedMessages', {
                  trigger: 'pinned_messages_limit',
                  current: limitCheck.current,
                  limit: limitCheck.limit
                });
              }
              return;
            }
          } catch (e) {
            log('Pin limit check failed, allowing action');
          }
        }
        const isUser = messageEl.classList.contains(SELECTORS.userMessageClass);
        // Get actual content, skip thinking block (._74c0879)
        let content = '';
        const markdownEl = messageEl.querySelector('.ds-markdown');
        if (markdownEl) {
          content = markdownEl.textContent?.trim().slice(0, 300) || '';
        } else {
          // For user messages or fallback
          const thinkingEl = messageEl.querySelector('._74c0879');
          if (thinkingEl) {
            // Clone and remove thinking, get remaining text
            const clone = messageEl.cloneNode(true);
            clone.querySelector('._74c0879')?.remove();
            content = clone.textContent?.trim().slice(0, 300) || '';
          } else {
            content = messageEl.textContent?.trim().slice(0, 300) || '';
          }
        }
        
        await PinnedMessagesService.createPin({
          messageId,
          conversationId: pinConversationId,
          messageContent: content,
          messageType: isUser ? 'user' : 'assistant',
          conversationTitle
        });
        
        btn.classList.add('pinned');
        btn.title = ToolboxI18n.t("Remove bookmark");
        btn.querySelector('.ds-icon').innerHTML = getBookmarkIcon(true);
        showToast(ToolboxI18n.t("Message bookmarked!"));
      }
    } catch (error) {
      console.error('[DeepSeek Toolbox] Pin error:', error);
      showToast('Error: ' + error.message, 'error');
    } finally {
      delete btn.dataset.busy;
      scheduleRefresh();
    }
  }
  
  function scheduleRefresh() {
    if (!enabled || refreshTimer) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      injectButtons();
    }, 200);
  }

  function setupObserver() {
    if (observer) return;
    observer = new MutationObserver(records => {
      if (!enabled) return;
      const relevant = records.some(record => {
        if (record.type === 'attributes') return true;
        return [...record.addedNodes].some(node => node.nodeType === 1 &&
          !node.closest?.('.ds-pin-btn') &&
          (node.matches?.('._4f9bf79, .ds-message, ._965abe9') ||
           node.querySelector?.('._4f9bf79, .ds-message, ._965abe9')));
      });
      if (relevant) scheduleRefresh();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-virtual-list-item-key'] });
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') return;
      if (changes.ds_toolbox_settings) {
        if (changes.ds_toolbox_settings.newValue?.pinMessagesEnabled === false) disable();
        else enable();
      }
      if (changes.deepseekToolboxPinnedMessages) scheduleRefresh();
    });
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        updateConversationInfo();
        document.querySelectorAll('.ds-pin-btn').forEach(btn => btn.remove());
        scheduleRefresh();
      }
    }, 1000);
  }

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.ds-pin-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `ds-pin-toast ${type}`;
    toast.innerHTML = `
      ${type === 'success' ? 
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17L4 12"/></svg>' :
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>'
      }
      <span>${message}</span>
    `;
    
    ToolboxI18n.applyDirection(toast);
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }
  
  function navigateToMessage(messageId, targetConversationId) {
    // Use fresh URL check instead of cached variable to avoid race conditions
    const currentId = location.pathname.match(/\/chat\/s\/([^\/]+)/)?.[1];
    
    if (targetConversationId === currentId) {
      // Same conversation - just highlight
      highlightMessage(messageId);
    } else {
      // Different conversation or not on a chat - navigate
      sessionStorage.setItem('dsToolboxPendingHighlight', messageId);
      window.location.href = `/a/chat/s/${targetConversationId}`;
    }
  }
  
  function highlightMessage(messageId) {
    let turnEl;
    if (messageId.includes('-key-')) {
      const key = decodeURIComponent(messageId.split('-key-')[1]);
      turnEl = [...document.querySelectorAll('[data-virtual-list-item-key]')]
        .find(el => el.getAttribute('data-virtual-list-item-key') === key);
    } else {
      const index = messageId.split('-msg-')[1];
      turnEl = document.querySelectorAll(SELECTORS.turnContainer)[parseInt(index)];
    }

    if (turnEl) {
      turnEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      turnEl.style.transition = 'all 0.3s ease';
      turnEl.style.boxShadow = '0 0 20px var(--ds-toolbox-accent, #4d6bfe)';
      turnEl.style.borderRadius = '12px';
      
      setTimeout(() => {
        turnEl.style.boxShadow = '';
        turnEl.style.borderRadius = '';
      }, 2500);
    }
  }
  
  function checkPendingHighlight() {
    const pending = sessionStorage.getItem('dsToolboxPendingHighlight');
    if (pending) {
      sessionStorage.removeItem('dsToolboxPendingHighlight');
      setTimeout(() => highlightMessage(pending), 300);
    }
  }
  
  // Check for pending highlight on init
  setTimeout(checkPendingHighlight, 500);
  
  return {
    init,
    disable,
    enable,
    navigateToMessage,
    injectButtons
  };
})();
