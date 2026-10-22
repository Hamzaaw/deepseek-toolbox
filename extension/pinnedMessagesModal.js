// DeepSeek Toolbox - Pinned Messages Modal
// UI for viewing and managing bookmarked messages

const PinnedMessagesModal = (function() {
  'use strict';
  
  let modal = null;
  let backdrop = null;
  let currentSearch = '';
  
  function getThemeColors() {
    const isDark = document.body.classList.contains('dark');
    return {
      bg: isDark ? '#1e1e1e' : '#ffffff',
      text: isDark ? '#e4e4e4' : '#1a1a1a',
      textSecondary: isDark ? '#888888' : '#666666',
      border: isDark ? '#333333' : '#e0e0e0',
      hover: isDark ? '#2a2a2a' : '#f0f0f0',
      accent: '#4d6bfe',
      error: '#ef4444'
    };
  }
  
  async function open() {
    if (modal) close();
    
    await PinnedMessagesService.init();
    const colors = getThemeColors();
    
    backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px); z-index: 99998;
      opacity: 0; transition: opacity 0.2s ease;
    `;
    backdrop.addEventListener('click', close);
    
    modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      width: 90%; max-width: 700px; max-height: 80vh;
      background: ${colors.bg}; border-radius: 16px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
      z-index: 99999; opacity: 0; transition: all 0.2s ease;
      display: flex; flex-direction: column; overflow: hidden;
    `;
    
    modal.innerHTML = getModalHTML(colors);
    
    ToolboxI18n.applyDirection(backdrop);
    document.body.appendChild(backdrop);
    ToolboxI18n.applyDirection(modal);
    document.body.appendChild(modal);
    
    initEventListeners(colors);
    await renderPins();
    
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      modal.style.opacity = '1';
      modal.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    modal.querySelector('#ds-pin-search').focus();
  }
  
  function getModalHTML(colors) {
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid ${colors.border};">
        <div style="display: flex; align-items: center; gap: 12px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="${colors.accent}" stroke="${colors.accent}" stroke-width="2">
            <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z"/>
          </svg>
          <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: ${colors.text};">${ToolboxI18n.html("Bookmarked Messages")}</h2>
        </div>
        <button id="ds-pin-modal-close" style="background: none; border: none; padding: 8px; cursor: pointer; color: ${colors.textSecondary}; border-radius: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div style="padding: 16px 24px; border-bottom: 1px solid ${colors.border};">
        <input 
          type="text" 
          id="ds-pin-search"
          placeholder="${ToolboxI18n.html("Search bookmarks...")}"
          style="width: 100%; padding: 10px 16px; background: ${colors.hover}; color: ${colors.text}; border: 1px solid ${colors.border}; border-radius: 8px; font-size: 14px; outline: none;"
        />
      </div>
      
      <div id="ds-pins-list" style="flex: 1; overflow-y: auto; padding: 16px 24px;"></div>
      
      <div style="padding: 16px 24px; border-top: 1px solid ${colors.border}; display: flex; align-items: center; justify-content: space-between;">
        <span id="ds-pins-count" style="font-size: 14px; color: ${colors.textSecondary};">${ToolboxI18n.html("0 bookmarks")}</span>
        <button id="ds-pin-clear-all" style="background: ${colors.hover}; color: ${colors.error}; border: 1px solid ${colors.border}; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          ${ToolboxI18n.html("Clear All")}
        </button>
      </div>
    `;
  }
  
  function initEventListeners(colors) {
    modal.querySelector('#ds-pin-modal-close').addEventListener('click', close);
    
    modal.querySelector('#ds-pin-search').addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderPins();
    });
    
    modal.querySelector('#ds-pin-clear-all').addEventListener('click', handleClearAll);
    
    document.addEventListener('keydown', handleEscape);
  }
  
  function handleEscape(e) {
    if (e.key === 'Escape') close();
  }
  
  async function renderPins() {
    const colors = getThemeColors();
    const container = modal.querySelector('#ds-pins-list');
    const countEl = modal.querySelector('#ds-pins-count');
    
    let pins = currentSearch 
      ? PinnedMessagesService.searchPins(currentSearch)
      : PinnedMessagesService.getAllPins();
    
    countEl.textContent = ToolboxI18n.t("Bookmarks: $1", [pins.length]);
    
    if (pins.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: ${colors.textSecondary};">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; opacity: 0.3;">
            <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z"/>
          </svg>
          <p style="margin: 0; font-size: 16px; font-weight: 500;">${currentSearch ? ToolboxI18n.t("No bookmarks match your search") : ToolboxI18n.t("No bookmarks yet")}</p>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.7;">${currentSearch ? ToolboxI18n.t("Try a different search term") : ToolboxI18n.t("Click the bookmark icon on any message to save it")}</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = pins.map(pin => createPinCard(pin, colors)).join('');
    
    // Click to navigate
    container.querySelectorAll('.ds-pin-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.ds-pin-delete')) return;
        const pinId = card.dataset.pinId;
        const pin = PinnedMessagesService.getPin(pinId);
        if (pin) {
          close();
          PinnedMessages.navigateToMessage(pin.messageId, pin.conversationId);
        }
      });
      
      card.addEventListener('mouseenter', () => card.style.background = colors.hover);
      card.addEventListener('mouseleave', () => card.style.background = 'transparent');
    });
    
    // Delete button
    container.querySelectorAll('.ds-pin-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const pinId = btn.dataset.pinId;
        const confirmed = await DialogUtils.showConfirm({
          title: ToolboxI18n.t("Remove Bookmark"),
          message: ToolboxI18n.t("Are you sure you want to remove this bookmark?"),
          confirmText: ToolboxI18n.t("Remove"),
          type: 'danger'
        });
        if (confirmed) {
          await PinnedMessagesService.deletePin(pinId);
          renderPins();
        }
      });
    });
  }
  
  function createPinCard(pin, colors) {
    const timeAgo = formatTimeAgo(pin.pinnedAt);
    const preview = truncate(pin.messageContent, 150);
    
    return `
      <div class="ds-pin-card" data-pin-id="${pin.id}" style="
        display: flex; align-items: flex-start; gap: 12px;
        padding: 16px; border-radius: 12px; margin-bottom: 12px;
        border: 1px solid ${colors.border}; cursor: pointer;
        transition: all 0.15s ease;
      ">
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 14px; color: ${colors.text}; line-height: 1.5; margin-bottom: 8px;">${escapeHtml(preview)}</div>
          <div style="font-size: 12px; color: ${colors.textSecondary};">${timeAgo}</div>
        </div>
        <button class="ds-pin-delete" data-pin-id="${pin.id}" title="${ToolboxI18n.html("Remove bookmark")}" style="
          background: none; border: none; padding: 8px; cursor: pointer;
          color: ${colors.textSecondary}; border-radius: 6px; opacity: 0.5;
          transition: all 0.15s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }
  
  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return ToolboxI18n.t("Just now");
    if (diffMins < 60) return ToolboxI18n.t("$1 minutes ago", [diffMins]);
    if (diffHours < 24) return ToolboxI18n.t("$1 hours ago", [diffHours]);
    if (diffDays < 7) return ToolboxI18n.t("$1 days ago", [diffDays]);
    return date.toLocaleDateString(ToolboxI18n.locale);
  }
  
  function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  async function handleClearAll() {
    const count = PinnedMessagesService.getPinsCount();
    if (count === 0) return;
    
    const confirmed = await DialogUtils.showConfirm({
      title: ToolboxI18n.t("Clear All Bookmarks"),
      message: ToolboxI18n.t("Delete all bookmarks ($1)? This cannot be undone.", [count]),
      confirmText: ToolboxI18n.t("Delete All"),
      type: 'danger'
    });
    if (confirmed) {
      await PinnedMessagesService.clearAllPins();
      renderPins();
    }
  }
  
  function close() {
    document.removeEventListener('keydown', handleEscape);
    
    // Remove immediately to avoid issues
    if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
    if (modal) {
      modal.remove();
      modal = null;
    }
    currentSearch = '';
  }
  
  return { open, close };
})();
