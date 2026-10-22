(function() {
  'use strict';
  
  let toolboxInjected = false;
  let membershipPlan = 'free';
  
  const MENU_ITEMS = [
    { id: 'folders', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>', label: 'Manage Folders', disabled: false },
    { id: 'pinned', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z"/></svg>', label: 'Pinned Messages', disabled: false },
    { id: 'bulk-delete', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>', label: 'Bulk Delete', disabled: false },
    { id: 'export', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>', label: 'Chat Export', disabled: false },
    { id: 'prompts', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>', label: 'Prompt Library', disabled: false },
    { id: 'settings', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', label: 'Settings', disabled: false }
  ];
  
  const TOOLBOX_ICON = `<svg width="16" height="16" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M270.0 139.5 L240.5 139.0 L240.5 95.0 L255.0 70.5 L270.5 94.0 L270.0 139.5 Z M49.0 190.5 L35.5 177.0 L30.5 158.0 L72.0 138.5 L104.0 103.5 L132.0 93.5 L163.0 92.5 L201.5 109.0 L169.0 109.5 L149.0 118.5 L138.5 132.0 L150.5 154.0 L116.0 174.5 L96.0 156.5 L49.0 190.5 Z M426.0 133.5 L394.5 125.0 L421.0 100.5 L442.0 92.5 L426.0 133.5 Z M374.0 213.5 L348.5 190.0 L362.5 159.0 L363.5 129.0 L444.0 145.5 L452.5 136.0 L465.0 96.5 L480.5 126.0 L479.5 148.0 L469.5 168.0 L457.0 179.5 L395.0 198.5 L374.0 213.5 Z M286.0 232.5 L225.5 232.0 L225.5 204.0 L240.5 198.0 L241.0 148.5 L270.5 149.0 L270.5 198.0 L285.5 204.0 L286.0 232.5 Z M399.5 185.0 L406.5 171.0 L393.0 156.5 L382.0 155.5 L377.5 169.0 L399.5 185.0 Z M188.0 232.5 L152.0 232.5 L119.5 182.0 L155.0 162.5 L188.0 232.5 Z M356.0 232.5 L302.5 232.0 L342.0 195.5 L366.5 220.0 L356.0 232.5 Z M431.0 282.5 L80.0 282.5 L64.5 270.0 L59.0 232.0 L80.0 232.0 L80.0 246.5 L431.0 246.5 L431.0 232.0 L452.5 232.0 L446.5 270.5 L431.0 282.5 Z M431.0 319.5 L80.0 319.5 L80.0 296.5 L431.0 296.5 L431.0 319.5 Z M420.5 430.5 L91.0 430.5 L80.0 419.5 L80.0 333.5 L431.0 333.5 L431.0 419.0 L420.5 430.5 Z" fill="currentColor"/>
  </svg>`;
  
  function createToolboxButton() {
    const btn = document.createElement('div');
    btn.className = DS_CLASSES.toolboxBtn;
    btn.tabIndex = 0;
    
    const isPremium = membershipPlan === 'premium' || membershipPlan === 'lifetime';
    const badgeClass = isPremium ? 'premium' : 'free';
    const badgeText = isPremium ? 'Premium' : 'Free';
    
    btn.innerHTML = `
      <div class="ds-toolbox-icon">${TOOLBOX_ICON}</div>
      <span>DS-Toolbox</span>
      <span class="ds-membership-badge ds-membership-badge-${badgeClass}" id="ds-toolbox-membership-badge" data-plan="${membershipPlan}" title="${isPremium ? 'Existing premium membership — current features are free for everyone' : 'All current features are free'}">${badgeText}</span>
      <div class="ds-focus-ring"></div>
    `;
    return btn;
  }
  
  function updateMembershipBadge(plan) {
    const badge = document.getElementById('ds-toolbox-membership-badge');
    if (!badge) return;
    
    const isPremium = plan === 'premium' || plan === 'lifetime';
    const badgeText = isPremium ? 'Premium' : 'Free';
    const badgeClass = isPremium ? 'premium' : 'free';
    
    badge.textContent = badgeText;
    badge.setAttribute('data-plan', plan);
    badge.setAttribute('title', isPremium ? 'Existing premium membership — current features are free for everyone' : 'All current features are free');
    badge.className = `ds-membership-badge ds-membership-badge-${badgeClass}`;
  }
  
  async function fetchMembershipStatus() {
    try {
      if (typeof apiClient !== 'undefined' && apiClient.getMeStatus) {
        const meStatus = await apiClient.getMeStatus();
        membershipPlan = meStatus.plan || 'free';
        updateMembershipBadge(membershipPlan);
        return membershipPlan;
      }
    } catch (error) {
      console.error('[DeepSeek Toolbox] Error fetching membership status:', error);
    }
    membershipPlan = 'free';
    return 'free';
  }
  
  function createDropdownMenu() {
    const dropdown = document.createElement('div');
    dropdown.className = DS_CLASSES.toolboxDropdown;
    
    const menuHTML = MENU_ITEMS.map(item => `
      <div class="${DS_CLASSES.toolboxMenuItem}${item.disabled ? ' disabled' : ''}" data-action="${item.id}">
        <span class="menu-icon">${item.icon}</span>
        <span class="menu-label">${item.label}</span>
      </div>
    `).join('');
    
    dropdown.innerHTML = menuHTML;
    return dropdown;
  }
  
  function handleMenuClick(action) {
    log('Menu action:', action);
    
    switch(action) {
      case 'folders':
        FolderModal.open();
        break;
      case 'pinned':
        PinnedMessagesModal.open();
        break;
      case 'bulk-delete':
        BulkDeleteModal.open();
        break;
      case 'export':
        ChatExportModal.open();
        break;
      case 'prompts':
        PromptLibraryModal.open();
        break;
      case 'settings':
        openSettingsModal();
        break;
      default:
        log('Action not implemented:', action);
    }
  }
  
  // ===== SETTINGS MODAL =====
  const SETTINGS_KEY = 'ds_toolbox_settings';
  let settingsModal = null;
  
  async function openSettingsModal() {
    try {
      log('Opening settings modal...');
      
      const isDark = isDarkMode();
      const bgColor = 'var(--ds-toolbox-bg)';
      const textColor = 'var(--ds-toolbox-text)';
      const textSecondary = 'var(--ds-toolbox-text-secondary)';
      const borderColor = 'var(--ds-toolbox-border)';
      const hoverColor = 'var(--ds-toolbox-bg-hover)';
      const accentColor = 'var(--ds-toolbox-accent)';
      
      if (settingsModal) {
        settingsModal.style.display = 'flex';
        return;
      }
      
      settingsModal = document.createElement('div');
      settingsModal.id = 'ds-settings-modal';
      settingsModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        backdrop-filter: blur(4px);
        animation: ds-fade-in 0.2s ease-out;
      `;
      
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background-color: ${bgColor};
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: var(--ds-toolbox-shadow);
        border: 1px solid ${borderColor};
        animation: ds-scale-in 0.2s ease-out;
      `;
      
      // Header
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 20px 24px;
        border-bottom: 1px solid ${borderColor};
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;
      
      const titleContainer = document.createElement('div');
      titleContainer.style.cssText = `display: flex; align-items: center; gap: 12px;`;
      titleContainer.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span style="font-size: 18px; font-weight: 600; color: ${textColor};">Settings</span>
      `;
      
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      closeBtn.style.cssText = `
        background: ${hoverColor};
        border: none;
        color: ${textSecondary};
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      `;
      closeBtn.onmouseover = () => { closeBtn.style.color = textColor; };
      closeBtn.onmouseout = () => { closeBtn.style.color = textSecondary; };
      closeBtn.onclick = () => { settingsModal.style.display = 'none'; };
      
      header.appendChild(titleContainer);
      header.appendChild(closeBtn);
      
      // Body
      const body = document.createElement('div');
      body.style.cssText = `padding: 24px;`;
      
      // Features Section
      const featuresSection = await createFeaturesSection(isDark);
      body.appendChild(featuresSection);
      
      // Keyboard Shortcuts Button
      const shortcutsBtn = createKeyboardShortcutsButton(isDark);
      body.appendChild(shortcutsBtn);
      
      // Feedback Section
      const feedbackSection = createFeedbackSection(isDark);
      body.appendChild(feedbackSection);
      
      modalContent.appendChild(header);
      modalContent.appendChild(body);
      settingsModal.appendChild(modalContent);
      document.body.appendChild(settingsModal);
      
      // Close on overlay click
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          settingsModal.style.display = 'none';
        }
      });
      
    } catch (error) {
      console.error('[DeepSeek Toolbox] Error opening settings:', error);
    }
  }
  
  async function createFeaturesSection(isDark) {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 20px;
      padding: 16px;
      background: var(--ds-toolbox-bg-hover);
      border: 1px solid var(--ds-toolbox-border);
      border-radius: 12px;
    `;
    
    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 0 16px;
      font-size: 14px;
      font-weight: 600;
      color: var(--ds-toolbox-text);
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    title.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ds-toolbox-accent)" stroke-width="2">
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
      </svg>
      Features
    `;
    section.appendChild(title);
    
    const accessNote = document.createElement('p');
    accessNote.id = 'ds-free-features-note';
    accessNote.textContent = 'All current features are free. Existing purchases remain on record.';
    accessNote.style.cssText = 'font-size: 13px; line-height: 1.5; margin: 0 0 16px; color: var(--ds-toolbox-text);';
    section.appendChild(accessNote);

    // Load settings
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    let settings = result[SETTINGS_KEY] || { pinMessagesEnabled: true, enhancePromptEnabled: true };
    
    // Pin Messages Toggle
    const pinToggle = createToggleItem(
      'Pin Messages',
      'Show bookmark icons on messages to save them',
      'pinMessagesEnabled',
      settings.pinMessagesEnabled !== false,
      isDark
    );
    section.appendChild(pinToggle);
    
    // Enhance Prompt Toggle
    const enhanceToggle = createToggleItem(
      'Enhance Prompt',
      'Show AI-powered prompt enhancement button',
      'enhancePromptEnabled',
      settings.enhancePromptEnabled !== false,
      isDark
    );
    section.appendChild(enhanceToggle);
    
    return section;
  }
  
  function createToggleItem(label, description, settingKey, defaultValue, isDark) {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      gap: 16px;
    `;
    
    const info = document.createElement('div');
    info.style.cssText = 'flex: 1;';
    info.innerHTML = `
      <div style="font-size: 14px; font-weight: 500; color: var(--ds-toolbox-text); margin-bottom: 4px;">${label}</div>
      <div style="font-size: 12px; color: var(--ds-toolbox-text-secondary);">${description}</div>
    `;
    
    const toggleContainer = document.createElement('label');
    toggleContainer.style.cssText = `
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
      flex-shrink: 0;
      cursor: pointer;
    `;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = defaultValue;
    checkbox.style.cssText = `opacity: 0; width: 0; height: 0;`;
    
    const slider = document.createElement('span');
    slider.className = 'ds-settings-slider';
    
    const circle = document.createElement('span');
    circle.className = 'ds-settings-slider-circle';
    slider.appendChild(circle);
    
    // Set initial state
    if (checkbox.checked) {
      slider.classList.add('checked');
      circle.classList.add('checked');
    }
    
    checkbox.addEventListener('change', async () => {
      const isChecked = checkbox.checked;
      
      if (isChecked) {
        slider.classList.add('checked');
        circle.classList.add('checked');
      } else {
        slider.classList.remove('checked');
        circle.classList.remove('checked');
      }
      
      // Save to storage
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      const settings = result[SETTINGS_KEY] || {};
      settings[settingKey] = isChecked;
      await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
      
      // Apply setting immediately for pin messages
      if (settingKey === 'pinMessagesEnabled' && typeof PinnedMessages !== 'undefined') {
        if (isChecked) {
          PinnedMessages.enable();
        } else {
          PinnedMessages.disable();
        }
      }
      
      showSettingsToast(isChecked ? `${label} enabled` : `${label} disabled`);
    });
    
    toggleContainer.appendChild(checkbox);
    toggleContainer.appendChild(slider);
    item.appendChild(info);
    item.appendChild(toggleContainer);
    
    return item;
  }
  
  function createKeyboardShortcutsButton(isDark) {
    const btn = document.createElement('div');
    btn.style.cssText = `
      margin-bottom: 20px;
      padding: 16px;
      background: var(--ds-toolbox-bg-hover);
      border: 1px solid var(--ds-toolbox-border);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    
    btn.onmouseenter = () => { btn.style.borderColor = 'var(--ds-toolbox-text-secondary)'; };
    btn.onmouseleave = () => { btn.style.borderColor = 'var(--ds-toolbox-border)'; };
    
    btn.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ds-toolbox-accent)" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>
        </svg>
        <div>
          <div style="font-size: 14px; font-weight: 600; color: var(--ds-toolbox-text); margin-bottom: 2px;">Keyboard Shortcuts</div>
          <div style="font-size: 12px; color: var(--ds-toolbox-text-secondary);">View all available shortcuts</div>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ds-toolbox-text-secondary)" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    `;
    
    btn.onclick = () => showKeyboardShortcutsModal(isDark);
    
    return btn;
  }
  
  function showKeyboardShortcutsModal(isDark) {
    const existing = document.getElementById('ds-shortcuts-modal');
    if (existing) existing.remove();
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? '⌘' : 'Ctrl';
    
    const shortcuts = [
      { keys: `${modKey} + Shift + F`, action: 'Open Folders' },
      { keys: `${modKey} + Shift + P`, action: 'Prompt Library' },
      { keys: `${modKey} + Shift + X`, action: 'Export Chat' },
      { keys: `${modKey} + Shift + M`, action: 'Pinned Messages' },
      { keys: `${modKey} + Shift + E`, action: 'Enhance Prompt' },
      { keys: 'Escape', action: 'Close Modal' }
    ];
    
    const overlay = document.createElement('div');
    overlay.id = 'ds-shortcuts-modal';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100001;
      animation: ds-fade-in 0.15s ease-out;
    `;
    
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
    `;
    backdrop.onclick = () => overlay.remove();
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: relative;
      background: var(--ds-toolbox-bg);
      border: 1px solid var(--ds-toolbox-border);
      border-radius: 12px;
      width: 90%;
      max-width: 380px;
      box-shadow: var(--ds-toolbox-shadow);
      animation: ds-scale-in 0.2s ease-out;
    `;
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--ds-toolbox-border);
    `;
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ds-toolbox-accent)" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>
        </svg>
        <span style="font-size: 16px; font-weight: 600; color: var(--ds-toolbox-text);">Keyboard Shortcuts</span>
      </div>
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: var(--ds-toolbox-text-secondary);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
    `;
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(closeBtn);
    
    // Body
    const body = document.createElement('div');
    body.style.cssText = `padding: 16px 20px;`;
    
    shortcuts.forEach((shortcut, i) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: var(--ds-toolbox-bg-hover);
        border-radius: 8px;
        margin-bottom: ${i < shortcuts.length - 1 ? '8px' : '0'};
      `;
      row.innerHTML = `
        <kbd style="
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 12px;
          padding: 5px 10px;
          background: var(--ds-toolbox-bg);
          border: 1px solid var(--ds-toolbox-border);
          border-radius: 6px;
          color: var(--ds-toolbox-text);
        ">${shortcut.keys}</kbd>
        <span style="font-size: 13px; color: var(--ds-toolbox-text);">${shortcut.action}</span>
      `;
      body.appendChild(row);
    });
    
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(backdrop);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }
  
  function createFeedbackSection(isDark) {
    const section = document.createElement('div');
    section.style.cssText = `
      padding: 16px;
      background: var(--ds-toolbox-bg-hover);
      border: 1px solid var(--ds-toolbox-border);
      border-radius: 12px;
    `;
    
    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--ds-toolbox-text);
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    title.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ds-toolbox-accent)" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      Send Feedback
    `;
    
    const desc = document.createElement('p');
    desc.textContent = 'Help improve DeepSeek Toolbox! Share thoughts, report bugs, or suggest features.';
    desc.style.cssText = `
      margin: 0 0 12px;
      font-size: 12px;
      color: var(--ds-toolbox-text-secondary);
      line-height: 1.5;
      padding-left: 28px;
    `;
    
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Share your thoughts...';
    textarea.maxLength = 1000;
    textarea.style.cssText = `
      width: 100%;
      min-height: 80px;
      padding: 12px;
      background: var(--ds-toolbox-bg);
      color: var(--ds-toolbox-text);
      border: 1px solid var(--ds-toolbox-border);
      border-radius: 8px;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    `;
    
    const counter = document.createElement('div');
    counter.style.cssText = `
      text-align: right;
      font-size: 11px;
      color: var(--ds-toolbox-text-secondary);
      margin: 6px 0 10px;
    `;
    counter.innerHTML = '<span id="ds-feedback-count">0</span> / 1000';
    
    textarea.addEventListener('input', () => {
      const el = document.getElementById('ds-feedback-count');
      if (el) el.textContent = textarea.value.length;
    });
    
    const sendBtn = document.createElement('button');
    sendBtn.style.cssText = `
      width: 100%;
      padding: 10px 16px;
      background: rgba(77, 107, 254, 0.15);
      color: var(--ds-toolbox-accent);
      border: 1px solid var(--ds-toolbox-accent);
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s;
    `;
    sendBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
      Send Feedback
    `;
    sendBtn.onmouseover = () => { sendBtn.style.background = 'rgba(77, 107, 254, 0.25)'; };
    sendBtn.onmouseout = () => { sendBtn.style.background = 'rgba(77, 107, 254, 0.15)'; };
    
    sendBtn.onclick = () => {
      const feedback = textarea.value.trim();
      if (!feedback) {
        showSettingsToast('Please enter your feedback', 'error');
        return;
      }
      
      const subject = encodeURIComponent('DeepSeek Toolbox Feedback');
      const body = encodeURIComponent(`${feedback}\n\n---\nVersion: ${DS_CONFIG.version}\nBrowser: ${navigator.userAgent}\nTimestamp: ${new Date().toISOString()}`);
      window.open(`mailto:hamzaw31@gmail.com?subject=${subject}&body=${body}`, '_blank');
      
      showSettingsToast('Opening email client...');
      setTimeout(() => {
        textarea.value = '';
        const el = document.getElementById('ds-feedback-count');
        if (el) el.textContent = '0';
      }, 1000);
    };
    
    section.appendChild(title);
    section.appendChild(desc);
    section.appendChild(textarea);
    section.appendChild(counter);
    section.appendChild(sendBtn);
    
    return section;
  }
  
  function showSettingsToast(message, type = 'success') {
    const existing = document.querySelector('.ds-settings-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `ds-settings-toast ${type}`;
    toast.innerHTML = `
      ${type === 'success' 
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      }
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }
  
  function injectToolbox() {
    if (toolboxInjected) return;
    
    const newChatBtn = document.querySelector(DS_SELECTORS.newChatBtn);
    if (!newChatBtn) {
      log('New Chat button not found, retrying...');
      return;
    }
    
    if (document.querySelector(`.${DS_CLASSES.toolboxBtn}`)) {
      toolboxInjected = true;
      return;
    }
    
    const toolboxBtn = createToolboxButton();
    const dropdown = createDropdownMenu();
    
    newChatBtn.parentNode.insertBefore(toolboxBtn, newChatBtn.nextSibling);
    toolboxBtn.appendChild(dropdown);
    
    toolboxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = toolboxBtn.classList.contains(DS_CLASSES.toolboxActive);
      toolboxBtn.classList.toggle(DS_CLASSES.toolboxActive, !isActive);
    });
    
    dropdown.addEventListener('click', (e) => {
      const menuItem = e.target.closest(`.${DS_CLASSES.toolboxMenuItem}`);
      if (menuItem && !menuItem.classList.contains('disabled')) {
        const action = menuItem.dataset.action;
        handleMenuClick(action);
        toolboxBtn.classList.remove(DS_CLASSES.toolboxActive);
      }
      e.stopPropagation();
    });
    
    document.addEventListener('click', (e) => {
      if (!toolboxBtn.contains(e.target)) {
        toolboxBtn.classList.remove(DS_CLASSES.toolboxActive);
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        toolboxBtn.classList.remove(DS_CLASSES.toolboxActive);
      }
    });
    
    toolboxInjected = true;
    log('Toolbox injected successfully');
    
    // Fetch membership status and update badge
    fetchMembershipStatus();
  }
  
  function init() {
    log('Initializing...');
    log('Theme:', isDarkMode() ? 'dark' : 'light');
    
    injectToolbox();
    
    // Initialize pinned messages
    if (typeof PinnedMessages !== 'undefined') {
      PinnedMessages.init();
    }
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    const retryInterval = setInterval(() => {
      if (!toolboxInjected) {
        injectToolbox();
      } else {
        clearInterval(retryInterval);
      }
    }, 500);
    
    setTimeout(() => clearInterval(retryInterval), 10000);
    
    // Simplified check - only verify toolbox exists every few seconds
    // instead of watching all DOM changes
    setInterval(() => {
      if (!document.querySelector(`.${DS_CLASSES.toolboxBtn}`)) {
        toolboxInjected = false;
        injectToolbox();
      }
    }, 3000);
  }
  
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux) + Shift + key
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || !e.shiftKey) return;
      
      switch (e.key.toUpperCase()) {
        case 'F':
          e.preventDefault();
          FolderModal.open();
          break;
        case 'P':
          e.preventDefault();
          PromptLibraryModal.open();
          break;
        case 'X':
          e.preventDefault();
          ChatExportModal.open();
          break;
        case 'M':
          e.preventDefault();
          PinnedMessagesModal.open();
          break;
        case 'E':
          e.preventDefault();
          if (typeof window.dsEnhancePrompt === 'function') {
            window.dsEnhancePrompt();
          }
          break;
      }
    });
    log('Keyboard shortcuts registered');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // ===== CONTEXT MENU: TEXT INSERTION HANDLER =====
  
  // Listen for insertText messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'insertText' && request.text) {
      log('Received insertText message, text length:', request.text.length);
      insertTextIntoDeepSeek(request.text);
      sendResponse({ success: true });
    }
    return true;
  });
  
  // Insert text into DeepSeek input
  async function insertTextIntoDeepSeek(text) {
    log('Starting text insertion...');
    
    let retries = 20;
    while (retries > 0) {
      const input = findDeepSeekInput();
      if (input) {
        log('Found input element:', input.tagName);
        await performTextInsertion(input, text);
        return;
      }
      await new Promise(r => setTimeout(r, 100));
      retries--;
    }
    
    console.error('[DeepSeek Toolbox] Failed to find input element after retries');
    showToast('Failed to insert text. Please ensure DeepSeek is loaded.', 'error');
  }
  
  // Find DeepSeek input element
  function findDeepSeekInput() {
    const selectors = [
      'textarea#chat-input',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Send"]',
      '[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && isElementVisible(element)) {
        return element;
      }
    }
    return null;
  }
  
  // Check if element is visible
  function isElementVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 &&
           element.offsetHeight > 0;
  }
  
  // Perform text insertion
  async function performTextInsertion(element, text) {
    log('Performing text insertion...');
    
    if (element.tagName === 'TEXTAREA') {
      element.value = text;
    } else if (element.contentEditable === 'true') {
      element.textContent = text;
    }
    
    // Trigger input events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    // Focus and set cursor to end
    element.focus();
    if (element.setSelectionRange) {
      element.setSelectionRange(text.length, text.length);
    } else if (element.contentEditable === 'true') {
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    log('Text inserted successfully');
    showToast('Text sent to DeepSeek!', 'success');
  }
  
  // Toast notification for text insertion
  function showToast(message, type = 'success') {
    const existing = document.querySelector('.ds-insert-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'ds-insert-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      padding: 12px 16px;
      background: var(--ds-toolbox-bg, #1a1a1a);
      color: var(--ds-toolbox-text, #fff);
      border-radius: 8px;
      border: 1px solid var(--ds-toolbox-border, rgba(255,255,255,0.1));
      z-index: 100000;
      font-size: 14px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transition: all 0.3s ease;
    `;
    
    const icon = type === 'success' 
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
    });
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
})();
