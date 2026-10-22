// DeepSeek Toolbox - Folder Modal
// Two-panel folder management with folder picker

const FolderModal = (function() {
  'use strict';
  
  let modal = null;
  let backdrop = null;
  let selectedFolderId = null;
  let chatsCache = [];
  let escapeHandler = null;
  let pickerClickHandler = null;
  
  function getThemeColors() {
    const isDark = document.body.classList.contains('dark');
    return {
      bg: isDark ? '#1e1e1e' : '#ffffff',
      text: isDark ? '#e4e4e4' : '#1a1a1a',
      textSecondary: isDark ? '#888888' : '#666666',
      border: isDark ? '#333333' : '#e0e0e0',
      hover: isDark ? '#2a2a2a' : '#f0f0f0',
      accent: '#4d6bfe'
    };
  }
  
  async function open() {
    if (modal) close();
    
    const colors = getThemeColors();
    
    backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px); z-index: 99998;
      opacity: 0; transition: opacity 0.2s ease;
    `;
    backdrop.onclick = close;
    
    modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      width: 90%; max-width: 800px; max-height: 80vh;
      background: ${colors.bg}; border-radius: 16px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
      z-index: 99999; opacity: 0; transition: all 0.2s ease;
      display: flex; flex-direction: column; overflow: hidden;
    `;
    
    modal.innerHTML = getModalHTML(colors);
    
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    
    // Escape key handler
    escapeHandler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', escapeHandler);
    
    initEventListeners(colors);
    await renderFolders();
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.accent}" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: ${colors.text};">Manage Folders</h2>
        </div>
        <button id="ds-modal-close" style="background: none; border: none; padding: 8px; cursor: pointer; color: ${colors.textSecondary}; border-radius: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div style="display: flex; flex: 1; overflow: hidden;">
        <!-- Folders Panel -->
        <div style="width: 280px; border-right: 1px solid ${colors.border}; display: flex; flex-direction: column;">
          <div style="padding: 16px; border-bottom: 1px solid ${colors.border}; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: 600; color: ${colors.textSecondary};">FOLDERS</span>
            <button id="ds-add-folder" style="background: ${colors.accent}; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New
            </button>
          </div>
          <div id="ds-folders-list" style="flex: 1; overflow-y: auto; padding: 8px;"></div>
        </div>
        
        <!-- Chats Panel -->
        <div style="flex: 1; display: flex; flex-direction: column;">
          <div style="padding: 16px; border-bottom: 1px solid ${colors.border};">
            <span style="font-size: 13px; font-weight: 600; color: ${colors.textSecondary};">CHATS</span>
            <p id="ds-chats-hint" style="margin: 4px 0 0; font-size: 12px; color: ${colors.textSecondary};">Click the folder icon to add a chat to a folder</p>
          </div>
          <div id="ds-chats-list" style="flex: 1; overflow-y: auto; padding: 8px;"></div>
        </div>
      </div>
      
      <div style="padding: 16px 24px; border-top: 1px solid ${colors.border}; display: flex; justify-content: flex-end;">
        <button id="ds-modal-done" style="background: ${colors.accent}; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">
          Done
        </button>
      </div>
    `;
  }
  
  function initEventListeners(colors) {
    modal.querySelector('#ds-modal-close').addEventListener('click', close);
    modal.querySelector('#ds-modal-done').addEventListener('click', close);
    modal.querySelector('#ds-add-folder').addEventListener('click', () => promptCreateFolder());
  }
  
  async function promptCreateFolder() {
    // Check folder limit
    if (typeof apiClient !== 'undefined') {
      try {
        const limitCheck = await apiClient.checkFeatureLimit('folders');
        if (!limitCheck.allowed) {
          if (typeof paywallModal !== 'undefined') {
            paywallModal.show('folders', {
              trigger: 'folder_creation_limit',
              current: limitCheck.current,
              limit: limitCheck.limit
            });
          }
          return;
        }
      } catch (e) {
        log('Folder limit check failed, allowing action');
      }
    }
    
    const name = await DialogUtils.showPrompt({
      title: 'Create Folder',
      placeholder: 'Enter folder name...'
    });
    if (name && name.trim()) {
      FolderService.addFolder(name.trim()).then(() => {
        renderFolders();
        renderChats();
      });
    }
  }
  
  async function renderFolders() {
    const colors = getThemeColors();
    const container = modal.querySelector('#ds-folders-list');
    const folders = await FolderService.getFolders();
    const chatMap = await FolderService.getChatFolderMap();
    
    if (folders.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: ${colors.textSecondary};">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <p style="margin: 0; font-size: 14px;">No folders yet</p>
          <p style="margin: 8px 0 0; font-size: 12px;">Click "New" to create one</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = folders.map(folder => {
      const chatCount = Object.values(chatMap).filter(fId => fId === folder.id).length;
      const isSelected = selectedFolderId === folder.id;
      
      return `
        <div class="ds-folder-item" data-folder-id="${folder.id}" style="
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 8px; cursor: pointer; margin-bottom: 4px;
          background: ${isSelected ? colors.hover : 'transparent'};
          border: 2px solid ${isSelected ? colors.accent : 'transparent'};
          transition: all 0.15s ease;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.accent}" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span style="flex: 1; font-size: 14px; color: ${colors.text};">${escapeHtml(folder.name)}</span>
          <span style="font-size: 12px; color: ${colors.textSecondary}; background: ${colors.hover}; padding: 2px 8px; border-radius: 10px;">${chatCount}</span>
          <button class="ds-folder-edit" data-folder-id="${folder.id}" title="Rename folder" style="background: none; border: none; padding: 4px; cursor: pointer; color: ${colors.textSecondary}; opacity: 0.5; border-radius: 4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="ds-folder-delete" data-folder-id="${folder.id}" title="Delete folder" style="background: none; border: none; padding: 4px; cursor: pointer; color: ${colors.textSecondary}; opacity: 0.5; border-radius: 4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');
    
    // Click folder to filter chats
    container.querySelectorAll('.ds-folder-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.ds-folder-delete') || e.target.closest('.ds-folder-edit')) return;
        const folderId = item.dataset.folderId;
        selectedFolderId = selectedFolderId === folderId ? null : folderId;
        renderFolders();
        renderChats();
      });
    });
    
    // Rename folder
    container.querySelectorAll('.ds-folder-edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const folderId = btn.dataset.folderId;
        const folder = folders.find(f => f.id === folderId);
        const newName = await DialogUtils.showPrompt({
          title: 'Rename Folder',
          placeholder: 'Enter new folder name...',
          defaultValue: folder.name
        });
        if (newName && newName.trim() && newName.trim() !== folder.name) {
          await FolderService.updateFolder(folderId, { name: newName.trim() });
          renderFolders();
          renderChats();
        }
      });
    });
    
    // Delete folder
    container.querySelectorAll('.ds-folder-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const folderId = btn.dataset.folderId;
        const folder = folders.find(f => f.id === folderId);
        const confirmed = await DialogUtils.showConfirm({
          title: 'Delete Folder',
          message: `Are you sure you want to delete "${folder.name}"? Chats inside will not be deleted.`,
          confirmText: 'Delete',
          type: 'danger'
        });
        if (confirmed) {
          await FolderService.deleteFolder(folderId);
          if (selectedFolderId === folderId) selectedFolderId = null;
          renderFolders();
          renderChats();
        }
      });
    });
  }
  
  function loadChats() {
    const chatElements = document.querySelectorAll(DS_SELECTORS.chatItem);
    chatsCache = Array.from(chatElements).map(el => ({
      id: FolderService.extractChatId(el.href),
      title: el.querySelector('.c08e6e93')?.textContent || 'Untitled Chat',
      href: el.href
    })).filter(c => c.id);
    
    renderChats();
  }
  
  async function renderChats() {
    const colors = getThemeColors();
    const container = modal.querySelector('#ds-chats-list');
    const hint = modal.querySelector('#ds-chats-hint');
    const chatMap = await FolderService.getChatFolderMap();
    const folders = await FolderService.getFolders();
    
    // Filter chats if folder is selected
    let chatsToShow = chatsCache;
    if (selectedFolderId) {
      const folder = folders.find(f => f.id === selectedFolderId);
      hint.textContent = `Showing chats in "${folder?.name}"`;
      chatsToShow = chatsCache.filter(c => chatMap[c.id] === selectedFolderId);
    } else {
      hint.textContent = 'Click the folder icon to add a chat to a folder';
    }
    
    if (chatsToShow.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: ${colors.textSecondary};">
          <p style="margin: 0; font-size: 14px;">${selectedFolderId ? 'No chats in this folder' : 'No chats found'}</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = chatsToShow.map(chat => {
      const folderId = chatMap[chat.id];
      const folder = folderId ? folders.find(f => f.id === folderId) : null;
      
      return `
        <div class="ds-chat-item" data-chat-id="${chat.id}" data-chat-href="${chat.href}" style="
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 8px; margin-bottom: 4px;
          background: transparent; transition: all 0.15s ease; cursor: pointer;
        ">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 14px; color: ${colors.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(chat.title)}</div>
            ${folder ? `<div style="font-size: 12px; color: ${colors.textSecondary}; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              ${escapeHtml(folder.name)}
            </div>` : ''}
          </div>
          ${folder ? `
            <button class="ds-chat-remove" data-chat-id="${chat.id}" title="Remove from folder" style="background: none; border: none; padding: 6px; cursor: pointer; color: ${colors.textSecondary}; border-radius: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          ` : `
            <button class="ds-chat-add" data-chat-id="${chat.id}" title="Add to folder" style="background: ${colors.hover}; border: none; padding: 6px; cursor: pointer; color: ${colors.textSecondary}; border-radius: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <path d="M12 10v4M10 12h4"/>
              </svg>
            </button>
          `}
        </div>
      `;
    }).join('');
    
    // Add to folder button - show picker
    container.querySelectorAll('.ds-chat-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chatId = btn.dataset.chatId;
        showFolderPicker(chatId, btn);
      });
    });
    
    // Remove from folder button
    container.querySelectorAll('.ds-chat-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const chatId = btn.dataset.chatId;
        await FolderService.removeChatFromFolder(chatId);
        renderFolders();
        renderChats();
      });
    });
    
    // Click chat to open it
    container.querySelectorAll('.ds-chat-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.ds-chat-add') || e.target.closest('.ds-chat-remove')) return;
        const href = item.dataset.chatHref;
        if (href) {
          close();
          window.location.href = href;
        }
      });
      // Hover effect
      item.addEventListener('mouseenter', () => item.style.background = colors.hover);
      item.addEventListener('mouseleave', () => item.style.background = 'transparent');
    });
  }
  
  async function showFolderPicker(chatId, buttonEl) {
    const colors = getThemeColors();
    
    // Remove existing picker
    document.querySelectorAll('.ds-folder-picker').forEach(p => p.remove());
    
    const folders = await FolderService.getFolders();
    if (folders.length === 0) {
      await DialogUtils.showAlert({
        title: 'No Folders',
        message: 'Create a folder first before adding chats to it.',
        type: 'warning'
      });
      return;
    }
    
    const picker = document.createElement('div');
    picker.className = 'ds-folder-picker';
    picker.style.cssText = `
      position: fixed; background: ${colors.bg}; border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); padding: 8px;
      min-width: 180px; z-index: 100001;
    `;
    
    picker.innerHTML = folders.map(folder => `
      <div class="ds-picker-item" data-folder-id="${folder.id}" style="
        display: flex; align-items: center; gap: 10px;
        padding: 8px 12px; border-radius: 6px; cursor: pointer;
        color: ${colors.text}; font-size: 14px;
        transition: background 0.15s ease;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${colors.accent}" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        ${escapeHtml(folder.name)}
      </div>
    `).join('');
    
    document.body.appendChild(picker);
    
    // Position near button
    const rect = buttonEl.getBoundingClientRect();
    picker.style.top = `${rect.bottom + 4}px`;
    picker.style.left = `${Math.min(rect.left, window.innerWidth - 200)}px`;
    
    // Hover effect & click handler
    picker.querySelectorAll('.ds-picker-item').forEach(item => {
      item.addEventListener('mouseenter', () => item.style.background = colors.hover);
      item.addEventListener('mouseleave', () => item.style.background = 'transparent');
      
      item.addEventListener('click', async () => {
        const folderId = item.dataset.folderId;
        await FolderService.addChatToFolder(chatId, folderId);
        picker.remove();
        renderFolders();
        renderChats();
      });
    });
    
    // Close on outside click - track handler for cleanup
    if (pickerClickHandler) {
      document.removeEventListener('click', pickerClickHandler);
    }
    pickerClickHandler = (e) => {
      if (!picker.contains(e.target) && !buttonEl.contains(e.target)) {
        picker.remove();
        document.removeEventListener('click', pickerClickHandler);
        pickerClickHandler = null;
      }
    };
    setTimeout(() => {
      document.addEventListener('click', pickerClickHandler);
    }, 0);
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function close() {
    // Remove escape key handler
    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler);
      escapeHandler = null;
    }
    
    // Remove picker click handler
    if (pickerClickHandler) {
      document.removeEventListener('click', pickerClickHandler);
      pickerClickHandler = null;
    }
    
    // Remove folder pickers first
    document.querySelectorAll('.ds-folder-picker').forEach(p => p.remove());
    
    // Remove backdrop and modal immediately (no animation to avoid issues)
    if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
    if (modal) {
      modal.remove();
      modal = null;
    }
    
    selectedFolderId = null;
    chatsCache = [];
  }
  
  return { open, close };
})();

const FolderManageModal = FolderModal;
