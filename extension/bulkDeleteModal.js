// DeepSeek Toolbox - Bulk Delete Modal
// Select and delete multiple conversations at once

const BulkDeleteModal = (function() {
  'use strict';
  
  let modal = null;
  let backdrop = null;
  let selectedChats = new Set();
  let allChats = [];
  let escapeHandler = null;
  let isDeleting = false;
  let searchQuery = '';
  
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
      dangerHover: '#dc2626'
    };
  }
  
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function open() {
    // Check feature access (free in v1.0.2)
    if (typeof apiClient !== 'undefined') {
      try {
        const limitCheck = await apiClient.checkFeatureLimit('bulkDelete');
        if (!limitCheck.allowed) {
          if (typeof paywallModal !== 'undefined') {
            paywallModal.show('bulkDelete', {
              trigger: 'bulk_delete_premium_only'
            });
          }
          return;
        }
      } catch (e) {
        log('Bulk delete limit check failed, allowing action');
      }
    }
    
    if (modal) close();
    
    const colors = getThemeColors();
    selectedChats = new Set();
    searchQuery = '';
    isDeleting = false;
    
    // Create backdrop
    backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px); z-index: 99998;
      opacity: 0; transition: opacity 0.2s ease;
    `;
    backdrop.onclick = () => { if (!isDeleting) close(); };
    
    // Create modal
    modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      width: 90%; max-width: 600px; max-height: 80vh;
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
    
    // Escape key handler
    escapeHandler = (e) => { if (e.key === 'Escape' && !isDeleting) close(); };
    document.addEventListener('keydown', escapeHandler);
    
    initEventListeners(colors);
    loadChats();
    
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      modal.style.opacity = '1';
      modal.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  }
  
  function getModalHTML(colors) {
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid ${colors.border};">
        <div style="display: flex; align-items: center; gap: 12px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.danger}" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: ${colors.text};">${ToolboxI18n.html("Bulk Delete")}</h2>
        </div>
        <button id="ds-bulk-close" style="background: none; border: none; padding: 8px; cursor: pointer; color: ${colors.textSecondary}; border-radius: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div style="padding: 16px 24px; border-bottom: 1px solid ${colors.border};">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <input type="text" id="ds-bulk-search" placeholder="${ToolboxI18n.html("Search conversations...")}" style="
            flex: 1; padding: 10px 14px; border: 1px solid ${colors.border};
            border-radius: 8px; background: ${colors.bgSecondary}; color: ${colors.text};
            font-size: 14px; outline: none;
          "/>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: ${colors.text}; font-size: 14px;">
            <input type="checkbox" id="ds-bulk-select-all" style="width: 18px; height: 18px; cursor: pointer; accent-color: ${colors.accent};"/>
            <span>${ToolboxI18n.html("Select All")}</span>
          </label>
          <span id="ds-bulk-counter" style="font-size: 13px; color: ${colors.textSecondary};">${ToolboxI18n.html("0 selected")}</span>
        </div>
      </div>
      
      <div id="ds-bulk-list" style="flex: 1; overflow-y: auto; padding: 8px 16px; min-height: 200px;"></div>
      
      <div id="ds-bulk-progress" style="display: none; padding: 20px 24px; border-top: 1px solid ${colors.border};">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-size: 14px; color: ${colors.text};">${ToolboxI18n.html("Deleting conversations...")}</span>
          <span id="ds-bulk-progress-text" style="font-size: 14px; color: ${colors.danger};">0 / 0</span>
        </div>
        <div style="height: 6px; background: ${colors.bgSecondary}; border-radius: 3px; overflow: hidden;">
          <div id="ds-bulk-progress-bar" style="height: 100%; width: 0%; background: ${colors.danger}; transition: width 0.3s ease;"></div>
        </div>
      </div>
      
      <div id="ds-bulk-actions" style="padding: 16px 24px; border-top: 1px solid ${colors.border}; display: flex; justify-content: flex-end; gap: 12px;">
        <button id="ds-bulk-cancel" style="
          padding: 10px 20px; border: 1px solid ${colors.border}; background: transparent;
          color: ${colors.text}; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;
        ">${ToolboxI18n.html("Cancel")}</button>
        <button id="ds-bulk-delete" disabled style="
          padding: 10px 20px; border: none; background: ${colors.danger};
          color: white; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
          opacity: 0.5; transition: all 0.15s ease;
        ">${ToolboxI18n.html("Delete (0)")}</button>
      </div>
    `;
  }
  
  function initEventListeners(colors) {
    modal.querySelector('#ds-bulk-close').addEventListener('click', () => { if (!isDeleting) close(); });
    modal.querySelector('#ds-bulk-cancel').addEventListener('click', () => { if (!isDeleting) close(); });
    modal.querySelector('#ds-bulk-delete').addEventListener('click', handleDelete);
    modal.querySelector('#ds-bulk-select-all').addEventListener('change', handleSelectAll);
    
    const searchInput = modal.querySelector('#ds-bulk-search');
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderChats();
    });
    
    // Focus search input
    setTimeout(() => searchInput.focus(), 100);
  }
  
  function loadChats() {
    const chatElements = document.querySelectorAll(DS_SELECTORS.chatItem);
    allChats = Array.from(chatElements).map(el => ({
      id: FolderService.extractChatId(el.href),
      title: el.querySelector('.c08e6e93')?.textContent || ToolboxI18n.t("Untitled Chat"),
      href: el.href,
      element: el
    })).filter(c => c.id);
    
    log('Loaded', allChats.length, 'chats for bulk delete');
    renderChats();
  }
  
  function renderChats() {
    const colors = getThemeColors();
    const container = modal.querySelector('#ds-bulk-list');
    
    let chatsToShow = allChats;
    if (searchQuery) {
      chatsToShow = allChats.filter(c => c.title.toLowerCase().includes(searchQuery));
    }
    
    if (chatsToShow.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: ${colors.textSecondary};">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <p style="margin: 0; font-size: 14px;">${searchQuery ? ToolboxI18n.t("No matching conversations") : ToolboxI18n.t("No conversations found")}</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = chatsToShow.map(chat => {
      const isSelected = selectedChats.has(chat.id);
      return `
        <div class="ds-bulk-chat-item" data-chat-id="${chat.id}" style="
          display: flex; align-items: center; gap: 12px;
          padding: 12px; border-radius: 8px; cursor: pointer; margin-bottom: 4px;
          background: ${isSelected ? colors.hover : 'transparent'};
          border: 1px solid ${isSelected ? colors.accent : 'transparent'};
          transition: all 0.15s ease;
        ">
          <input type="checkbox" class="ds-bulk-checkbox" data-chat-id="${chat.id}" 
            ${isSelected ? 'checked' : ''} 
            style="width: 18px; height: 18px; cursor: pointer; accent-color: ${colors.accent}; flex-shrink: 0;"
          />
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 14px; color: ${colors.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(chat.title)}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add click handlers
    container.querySelectorAll('.ds-bulk-chat-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('ds-bulk-checkbox')) return;
        const chatId = item.dataset.chatId;
        toggleChat(chatId);
      });
      
      // Hover effect
      item.addEventListener('mouseenter', () => {
        if (!selectedChats.has(item.dataset.chatId)) {
          item.style.background = colors.hover;
        }
      });
      item.addEventListener('mouseleave', () => {
        if (!selectedChats.has(item.dataset.chatId)) {
          item.style.background = 'transparent';
        }
      });
    });
    
    container.querySelectorAll('.ds-bulk-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleChat(checkbox.dataset.chatId);
      });
    });
    
    updateCounter();
  }
  
  function toggleChat(chatId) {
    if (selectedChats.has(chatId)) {
      selectedChats.delete(chatId);
    } else {
      selectedChats.add(chatId);
    }
    renderChats();
  }
  
  function handleSelectAll(e) {
    const chatsToSelect = searchQuery 
      ? allChats.filter(c => c.title.toLowerCase().includes(searchQuery))
      : allChats;
    
    if (e.target.checked) {
      chatsToSelect.forEach(c => selectedChats.add(c.id));
    } else {
      chatsToSelect.forEach(c => selectedChats.delete(c.id));
    }
    renderChats();
  }
  
  function updateCounter() {
    const count = selectedChats.size;
    const counter = modal.querySelector('#ds-bulk-counter');
    const deleteBtn = modal.querySelector('#ds-bulk-delete');
    const selectAll = modal.querySelector('#ds-bulk-select-all');
    
    counter.textContent = ToolboxI18n.t("Selected: $1", [count]);
    deleteBtn.textContent = ToolboxI18n.t("Delete ($1)", [count]);
    deleteBtn.disabled = count === 0;
    deleteBtn.style.opacity = count === 0 ? '0.5' : '1';
    
    // Update select all checkbox state
    const visibleChats = searchQuery 
      ? allChats.filter(c => c.title.toLowerCase().includes(searchQuery))
      : allChats;
    const allSelected = visibleChats.length > 0 && visibleChats.every(c => selectedChats.has(c.id));
    selectAll.checked = allSelected;
  }
  
  async function handleDelete() {
    const count = selectedChats.size;
    if (count === 0) return;
    
    // Show confirmation
    const confirmed = await showConfirmation(count);
    if (!confirmed || !modal) return;
    
    isDeleting = true;
    
    // Show progress, hide actions
    const actionsEl = modal.querySelector('#ds-bulk-actions');
    const progressEl = modal.querySelector('#ds-bulk-progress');
    const progressBar = modal.querySelector('#ds-bulk-progress-bar');
    const progressText = modal.querySelector('#ds-bulk-progress-text');
    
    if (!actionsEl || !progressEl || !progressBar || !progressText) {
      isDeleting = false;
      return;
    }
    
    actionsEl.style.display = 'none';
    progressEl.style.display = 'block';
    
    const chatIds = Array.from(selectedChats);
    let deleted = 0;
    let failed = 0;
    
    for (const chatId of chatIds) {
      try {
        const success = await deleteChat(chatId);
        if (success) {
          deleted++;
          selectedChats.delete(chatId);
          allChats = allChats.filter(c => c.id !== chatId);
        } else {
          failed++;
        }
      } catch (err) {
        log('Error deleting chat:', chatId, err);
        failed++;
      }
      
      const progress = ((deleted + failed) / count) * 100;
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (progressText) progressText.textContent = `${deleted + failed} / ${count}`;
      
      // Small delay between deletions to avoid overwhelming the UI
      await delay(300);
    }
    
    isDeleting = false;
    
    // Show result toast
    if (failed === 0) {
      showToast(ToolboxI18n.t("Conversations deleted: $1. Refreshing...", [deleted]), 'success');
    } else {
      showToast(ToolboxI18n.t("Deleted: $1. Failed: $2. Refreshing...", [deleted, failed]), failed > deleted ? 'error' : 'success');
    }
    
    close();
    
    // Refresh page to update sidebar
    if (deleted > 0) {
      setTimeout(() => window.location.reload(), 1000);
    }
  }
  
  async function showConfirmation(count) {
    return new Promise((resolve) => {
      const colors = getThemeColors();
      
      const confirmBackdrop = document.createElement('div');
      confirmBackdrop.style.cssText = `
        position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5);
        z-index: 100000; display: flex; align-items: center; justify-content: center;
      `;
      
      const confirmModal = document.createElement('div');
      confirmModal.style.cssText = `
        background: ${colors.bg}; border-radius: 12px; padding: 24px;
        max-width: 400px; width: 90%; box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3);
      `;
      
      confirmModal.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.danger}" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${colors.text};">${ToolboxI18n.html("Delete conversations ($1)?", [count])}</h3>
        </div>
        <p style="margin: 0 0 20px; font-size: 14px; color: ${colors.textSecondary}; line-height: 1.5;">
          ${ToolboxI18n.html("This action cannot be undone. The selected conversations will be permanently deleted.")}
        </p>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="ds-confirm-cancel" style="
            padding: 10px 20px; border: 1px solid ${colors.border}; background: transparent;
            color: ${colors.text}; border-radius: 8px; font-size: 14px; cursor: pointer;
          ">${ToolboxI18n.html("Cancel")}</button>
          <button id="ds-confirm-delete" style="
            padding: 10px 20px; border: none; background: ${colors.danger};
            color: white; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
          ">${ToolboxI18n.html("Delete")}</button>
        </div>
      `;
      
      ToolboxI18n.applyDirection(confirmModal);
      confirmBackdrop.appendChild(confirmModal);
      ToolboxI18n.applyDirection(confirmBackdrop);
      document.body.appendChild(confirmBackdrop);
      
      const cleanup = () => confirmBackdrop.remove();
      
      confirmModal.querySelector('#ds-confirm-cancel').addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
      
      confirmModal.querySelector('#ds-confirm-delete').addEventListener('click', () => {
        cleanup();
        resolve(true);
      });
      
      confirmBackdrop.addEventListener('click', (e) => {
        if (e.target === confirmBackdrop) {
          cleanup();
          resolve(false);
        }
      });
    });
  }
  
  function getAuthToken() {
    // Get userToken from localStorage (stored as JSON)
    const userTokenRaw = localStorage.getItem('userToken');
    if (userTokenRaw) {
      try {
        const parsed = JSON.parse(userTokenRaw);
        if (parsed.value) return parsed.value;
      } catch (e) {
        // If not JSON, return as-is
        return userTokenRaw;
      }
    }
    return null;
  }
  
  async function deleteChat(chatId) {
    try {
      log('Deleting chat via API:', chatId);
      
      const authToken = getAuthToken();
      log('Auth token found:', !!authToken);
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'x-app-version': '20241129.1',
        'x-client-locale': 'en_US',
        'x-client-platform': 'web',
        'x-client-version': '1.6.0'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch('https://chat.deepseek.com/api/v0/chat_session/delete', {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify({ chat_session_id: chatId })
      });
      
      log('Delete API response:', response.status);
      
      if (response.ok) {
        const result = await response.json().catch(() => null);
        const businessCode = result?.data?.biz_code ?? result?.biz_code;
        const transportCode = result?.code;
        const successfulCode = value => value === 0 || value === '0';
        if (result && (transportCode !== undefined || businessCode !== undefined) &&
            (transportCode === undefined || successfulCode(transportCode)) &&
            (businessCode === undefined || successfulCode(businessCode))) {
          log('Successfully deleted chat:', chatId);
          return true;
        }
        log('Delete API did not confirm success');
        return false;
      }

      log('Delete failed with status:', response.status);
      return false;
    } catch (error) {
      console.error('[DS Toolbox] Delete API error:', error);
      return false;
    }
  }
  
  function showToast(message, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.ds-bulk-toast').forEach(t => t.remove());
    
    const colors = getThemeColors();
    const toast = document.createElement('div');
    toast.className = 'ds-bulk-toast';
    toast.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: ${colors.bg}; border: 1px solid ${type === 'error' ? colors.danger : colors.accent};
      border-radius: 12px; padding: 12px 20px; color: ${colors.text};
      font-size: 14px; font-weight: 500; z-index: 100001;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      display: flex; align-items: center; gap: 10px;
      animation: ds-toast-slide-up 0.2s ease-out;
    `;
    
    const icon = type === 'error' 
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
    
    toast.innerHTML = `<span style="color: ${type === 'error' ? colors.danger : colors.accent};">${icon}</span>${message}`;
    ToolboxI18n.applyDirection(toast);
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function close() {
    if (isDeleting) return;
    
    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler);
      escapeHandler = null;
    }
    
    if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
    if (modal) {
      modal.remove();
      modal = null;
    }
    
    selectedChats = new Set();
    allChats = [];
    searchQuery = '';
    isDeleting = false;
  }
  
  return { open, close };
})();
