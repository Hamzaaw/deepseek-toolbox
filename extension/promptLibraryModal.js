// DeepSeek Toolbox - Prompt Library Modal
// Main UI for browsing and using prompt templates

const PromptLibraryModal = (function() {
  'use strict';

  let modal = null;
  let backdrop = null;
  let selectedCategory = 'my-prompts';
  let searchQuery = '';
  let currentTab = 'library'; // 'library' or 'chaining'

  function getThemeColors() {
    const isDark = document.body.classList.contains('dark');
    return {
      bg: isDark ? '#1e1e1e' : '#ffffff',
      bgSecondary: isDark ? '#2a2a2a' : '#f5f5f5',
      text: isDark ? '#e4e4e4' : '#1a1a1a',
      textSecondary: isDark ? '#888888' : '#666666',
      border: isDark ? '#333333' : '#e0e0e0',
      hover: isDark ? '#333333' : '#f0f0f0',
      active: isDark ? '#3a3a3a' : '#e8e8e8',
      accent: '#4d6bfe',
      accentHover: '#3b5bdb',
      success: '#10b981',
      error: '#ef4444'
    };
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function handleEscape(e) {
    if (e.key === 'Escape') close();
  }

  async function open() {
    if (modal) close();

    await PromptLibraryService.init();
    await PromptChainService.init();
    
    const colors = getThemeColors();
    selectedCategory = 'my-prompts';
    searchQuery = '';
    currentTab = 'library';

    backdrop = document.createElement('div');
    backdrop.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); z-index: 99998; opacity: 0; transition: opacity 0.2s ease;';
    backdrop.addEventListener('click', close);

    modal = document.createElement('div');
    modal.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.95); width: 95%; max-width: 1100px; height: 85vh; max-height: 700px; background: ${colors.bg}; border-radius: 16px; box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4); z-index: 99999; opacity: 0; transition: all 0.2s ease; display: flex; flex-direction: column; overflow: hidden;`;

    modal.innerHTML = getModalHTML(colors);

    ToolboxI18n.applyDirection(backdrop);
    document.body.appendChild(backdrop);
    ToolboxI18n.applyDirection(modal);
    document.body.appendChild(modal);
    document.addEventListener('keydown', handleEscape);

    initEventListeners(colors);
    render(colors);

    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      modal.style.opacity = '1';
      modal.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    setTimeout(() => {
      const searchInput = modal.querySelector('#ds-prompt-search');
      if (searchInput) searchInput.focus();
    }, 100);
  }

  function getModalHTML(colors) {
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid ${colors.border}; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.accent}" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: ${colors.text};">${ToolboxI18n.html("Prompt Library")}</h2>
          </div>
          <div id="ds-tab-buttons" style="display: flex; gap: 4px; margin-inline-start: 8px;">
            <button class="ds-tab-btn" data-tab="library" style="padding: 6px 14px; background: ${colors.accent}; border: none; border-radius: 6px; color: white; font-size: 13px; font-weight: 500; cursor: pointer;">${ToolboxI18n.html("Library")}</button>
            <button class="ds-tab-btn" data-tab="chaining" style="padding: 6px 14px; background: transparent; border: 1px solid ${colors.border}; border-radius: 6px; color: ${colors.text}; font-size: 13px; font-weight: 500; cursor: pointer;">${ToolboxI18n.html("Chaining")}</button>
          </div>
          <div style="position: relative; width: 240px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${colors.textSecondary}" stroke-width="2" style="position: absolute; inset-inline-start: 12px; top: 50%; transform: translateY(-50%); pointer-events: none;">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" id="ds-prompt-search" placeholder="${ToolboxI18n.html("Search prompts...")}"
              style="width: 100%; padding: 8px 36px; box-sizing: border-box; background: ${colors.bgSecondary}; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.text}; font-size: 14px; outline: none;">
          </div>
        </div>
        <button id="ds-library-close" style="background: none; border: none; padding: 8px; cursor: pointer; color: ${colors.textSecondary}; border-radius: 8px; display: flex;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      
      <div style="display: flex; flex: 1; overflow: hidden;">
        <div id="ds-categories-sidebar" style="width: 200px; padding: 16px; border-inline-end: 1px solid ${colors.border}; overflow-y: auto; flex-shrink: 0;"></div>
        <div id="ds-prompts-content" style="flex: 1; padding: 16px; overflow-y: auto;"></div>
      </div>
      
      <style>
        #ds-prompt-search:focus { border-color: ${colors.accent} !important; }
        .ds-category-btn:hover { background: ${colors.hover} !important; }
        .ds-category-btn.active { background: ${colors.active} !important; }
        .ds-prompt-card:hover { border-color: ${colors.accent} !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
        .ds-use-btn:hover { background: ${colors.accentHover} !important; }
        .ds-edit-btn:hover, .ds-delete-btn:hover { background: ${colors.hover} !important; }
      </style>
    `;
  }

  function initEventListeners(colors) {
    modal.querySelector('#ds-library-close').addEventListener('click', close);
    
    modal.querySelector('#ds-prompt-search').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render(colors);
    });
    
    // Tab buttons
    modal.querySelectorAll('.ds-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        updateTabButtons(colors);
        render(colors);
      });
    });
  }
  
  function updateTabButtons(colors) {
    modal.querySelectorAll('.ds-tab-btn').forEach(btn => {
      if (btn.dataset.tab === currentTab) {
        btn.style.background = colors.accent;
        btn.style.border = 'none';
        btn.style.color = 'white';
      } else {
        btn.style.background = 'transparent';
        btn.style.border = `1px solid ${colors.border}`;
        btn.style.color = colors.text;
      }
    });
  }

  function render(colors) {
    const sidebar = modal.querySelector('#ds-categories-sidebar');
    
    if (currentTab === 'chaining') {
      sidebar.style.display = 'none';
      renderChains(colors);
    } else {
      sidebar.style.display = 'block';
      renderCategories(colors);
      renderPrompts(colors);
    }
  }

  function renderCategories(colors) {
    const container = modal.querySelector('#ds-categories-sidebar');
    const categories = PromptLibraryService.getCategories();
    
    let html = '';
    
    // My Prompts section
    const myPromptsCount = PromptLibraryService.getCategoryCount('my-prompts');
    html += `
      <div style="margin-bottom: 12px;">
        <button class="ds-category-btn ${selectedCategory === 'my-prompts' ? 'active' : ''}" data-category="my-prompts"
          style="width: 100%; padding: 10px 12px; background: ${selectedCategory === 'my-prompts' ? colors.active : 'transparent'}; border: none; border-radius: 8px; color: ${colors.text}; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;">
          <span style="display: flex; align-items: center; gap: 8px;">
            ${categories['my-prompts'].icon}
            <span>${ToolboxI18n.html('My Prompts')}</span>
          </span>
          <span style="font-size: 11px; padding: 2px 8px; background: ${colors.bgSecondary}; border-radius: 10px;">${myPromptsCount}</span>
        </button>
        ${selectedCategory === 'my-prompts' ? `
          <button id="ds-add-prompt-btn" style="width: 100%; margin-top: 8px; padding: 10px; background: ${colors.accent}; border: none; border-radius: 8px; color: white; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${ToolboxI18n.html("Add New Prompt")}
          </button>
        ` : ''}
      </div>
    `;
    
    // Separator
    html += `<div style="height: 1px; background: ${colors.border}; margin: 12px 0;"></div>`;
    
    // Category label
    html += `<div style="font-size: 11px; font-weight: 600; color: ${colors.textSecondary}; letter-spacing: 0.5px; margin-bottom: 8px;">${ToolboxI18n.html("CATEGORIES")}</div>`;
    
    // Other categories
    for (const [key, category] of Object.entries(categories)) {
      if (key === 'my-prompts') continue;
      
      const count = PromptLibraryService.getCategoryCount(key);
      html += `
        <button class="ds-category-btn ${selectedCategory === key ? 'active' : ''}" data-category="${key}"
          style="width: 100%; padding: 10px 12px; margin-bottom: 4px; background: ${selectedCategory === key ? colors.active : 'transparent'}; border: none; border-radius: 8px; color: ${colors.text}; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;">
          <span style="display: flex; align-items: center; gap: 8px;">
            ${category.icon}
            <span>${ToolboxI18n.html(category.name)}</span>
          </span>
          <span style="font-size: 11px; padding: 2px 8px; background: ${colors.bgSecondary}; border-radius: 10px;">${count}</span>
        </button>
      `;
    }
    
    container.innerHTML = html;
    
    // Add event listeners
    container.querySelectorAll('.ds-category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCategory = btn.dataset.category;
        render(colors);
      });
    });
    
    const addBtn = container.querySelector('#ds-add-prompt-btn');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        // Check custom prompts limit
        if (typeof apiClient !== 'undefined') {
          try {
            const limitCheck = await apiClient.checkFeatureLimit('customPrompts');
            if (!limitCheck.allowed) {
              if (typeof paywallModal !== 'undefined') {
                paywallModal.show('customPrompts', {
                  trigger: 'custom_prompt_limit',
                  current: limitCheck.current,
                  limit: limitCheck.limit
                });
              }
              return;
            }
          } catch (e) {
            log('Prompt limit check failed, allowing action');
          }
        }
        PromptEditorModal.open(null, () => render(colors));
      });
    }
  }

  function renderPrompts(colors) {
    const container = modal.querySelector('#ds-prompts-content');
    
    let prompts;
    if (searchQuery) {
      prompts = PromptLibraryService.searchPrompts(searchQuery);
    } else {
      prompts = PromptLibraryService.getPromptsByCategory(selectedCategory);
    }
    
    if (prompts.length === 0) {
      container.innerHTML = getEmptyStateHTML(colors);
      return;
    }
    
    let html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">`;
    
    prompts.forEach(prompt => {
      const isCustom = prompt.category === 'my-prompts' || selectedCategory === 'my-prompts';
      const hasVariables = prompt.variables && prompt.variables.length > 0;
      
      html += `
        <div class="ds-prompt-card" data-id="${prompt.id}" style="background: ${colors.bgSecondary}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 16px; cursor: default; display: flex; flex-direction: column; gap: 12px; transition: all 0.15s;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div style="flex: 1; min-width: 0;">
              <h3 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${colors.text}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(prompt.title)}
              </h3>
              ${prompt.description ? `<p style="margin: 0; font-size: 13px; color: ${colors.textSecondary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(prompt.description)}</p>` : ''}
            </div>
            ${hasVariables ? `
              <div style="padding: 4px 8px; background: rgba(77, 107, 254, 0.1); border: 1px solid rgba(77, 107, 254, 0.2); border-radius: 12px; font-size: 11px; font-weight: 500; color: ${colors.accent}; flex-shrink: 0; margin-inline-start: 8px;">
                ${ToolboxI18n.html("Variables: $1", [prompt.variables.length])}
              </div>
            ` : ''}
          </div>
          
          <div style="background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 12px; font-family: 'SF Mono', Monaco, monospace; font-size: 12px; color: ${colors.textSecondary}; max-height: 80px; overflow: hidden; position: relative;">
            ${formatPreview(prompt.content, prompt.variables, colors)}
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 30px; background: linear-gradient(transparent, ${colors.bg}); pointer-events: none;"></div>
          </div>
          
          <div style="display: flex; gap: 8px; margin-top: auto;">
            <button class="ds-use-btn" data-id="${prompt.id}" style="flex: 1; padding: 8px 12px; background: ${colors.accent}; border: none; border-radius: 8px; color: white; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              ${ToolboxI18n.html("Use")}
            </button>
            ${isCustom ? `
              <button class="ds-edit-btn" data-id="${prompt.id}" style="padding: 8px; background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.textSecondary}; cursor: pointer; display: flex; transition: all 0.15s;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="ds-delete-btn" data-id="${prompt.id}" style="padding: 8px; background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.error}; cursor: pointer; display: flex; transition: all 0.15s;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add event listeners
    container.querySelectorAll('.ds-use-btn').forEach(btn => {
      btn.addEventListener('click', () => usePrompt(btn.dataset.id));
    });
    
    container.querySelectorAll('.ds-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = PromptLibraryService.getPromptById(btn.dataset.id);
        if (prompt) {
          PromptEditorModal.open(prompt, () => render(colors));
        }
      });
    });
    
    container.querySelectorAll('.ds-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deletePrompt(btn.dataset.id, colors));
    });
  }

  function renderChains(colors) {
    const container = modal.querySelector('#ds-prompts-content');
    
    let chains;
    if (searchQuery) {
      chains = PromptChainService.searchChains(searchQuery);
    } else {
      chains = PromptChainService.getAllChains();
    }
    
    let html = `
      <button id="ds-create-chain-btn" style="width: 100%; padding: 16px; margin-bottom: 16px; background: ${colors.bgSecondary}; border: 2px dashed ${colors.border}; border-radius: 12px; color: ${colors.text}; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        ${ToolboxI18n.html("Create New Chain")}
      </button>
    `;
    
    if (chains.length === 0) {
      html += `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 40px; color: ${colors.textSecondary}; text-align: center;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity: 0.4; margin-bottom: 16px;">
            <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/>
            <path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <p style="font-size: 16px; margin: 0 0 8px 0; color: ${colors.text};">${ToolboxI18n.html("No chains yet")}</p>
          <p style="font-size: 14px; margin: 0; opacity: 0.7;">${ToolboxI18n.html("Create your first prompt chain to automate multi-step conversations")}</p>
        </div>
      `;
    } else {
      html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">`;
      
      chains.forEach(chain => {
        const hasVariables = chain.variables && chain.variables.length > 0;
        html += `
          <div class="ds-chain-card" data-id="${chain.id}" style="background: ${colors.bgSecondary}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; transition: all 0.15s;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1; min-width: 0;">
                <h3 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${colors.text}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(chain.title)}
                </h3>
                <p style="margin: 0; font-size: 13px; color: ${colors.textSecondary};">
                  ${ToolboxI18n.html("Steps: $1", [chain.steps.length])}${chain.description ? ' - ' + escapeHtml(chain.description) : ''}
                </p>
              </div>
              ${hasVariables ? `
                <div style="padding: 4px 8px; background: rgba(77, 107, 254, 0.1); border: 1px solid rgba(77, 107, 254, 0.2); border-radius: 12px; font-size: 11px; font-weight: 500; color: ${colors.accent}; flex-shrink: 0; margin-inline-start: 8px;">
                  ${ToolboxI18n.html("Variables: $1", [chain.variables.length])}
                </div>
              ` : ''}
            </div>
            
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${chain.steps.slice(0, 3).map((step, i) => `
                <div style="padding: 4px 8px; background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 6px; font-size: 11px; color: ${colors.textSecondary}; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${i + 1}. ${escapeHtml(step.substring(0, 30))}${step.length > 30 ? '...' : ''}
                </div>
              `).join('')}
              ${chain.steps.length > 3 ? `<div style="padding: 4px 8px; font-size: 11px; color: ${colors.textSecondary};">${ToolboxI18n.html("+$1 more", [chain.steps.length - 3])}</div>` : ''}
            </div>
            
            <div style="display: flex; gap: 8px; margin-top: auto;">
              <button class="ds-run-chain-btn" data-id="${chain.id}" style="flex: 1; padding: 8px 12px; background: ${colors.accent}; border: none; border-radius: 8px; color: white; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                ${ToolboxI18n.html("Run")}
              </button>
              <button class="ds-edit-chain-btn" data-id="${chain.id}" style="padding: 8px; background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.textSecondary}; cursor: pointer; display: flex;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="ds-delete-chain-btn" data-id="${chain.id}" style="padding: 8px; background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.error}; cursor: pointer; display: flex;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    }
    
    container.innerHTML = html;
    
    // Event listeners
    container.querySelector('#ds-create-chain-btn')?.addEventListener('click', async () => {
      // Check prompt chains limit
      if (typeof apiClient !== 'undefined') {
        try {
          const limitCheck = await apiClient.checkFeatureLimit('promptChains');
          if (!limitCheck.allowed) {
            if (typeof paywallModal !== 'undefined') {
              paywallModal.show('promptChains', {
                trigger: 'prompt_chain_limit',
                current: limitCheck.current,
                limit: limitCheck.limit
              });
            }
            return;
          }
        } catch (e) {
          log('Chain limit check failed, allowing action');
        }
      }
      PromptChainModal.open(null, () => render(colors));
    });
    
    container.querySelectorAll('.ds-run-chain-btn').forEach(btn => {
      btn.addEventListener('click', () => runChain(btn.dataset.id, colors));
    });
    
    container.querySelectorAll('.ds-edit-chain-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const chain = PromptChainService.getChainById(btn.dataset.id);
        if (chain) PromptChainModal.open(chain, () => render(colors));
      });
    });
    
    container.querySelectorAll('.ds-delete-chain-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteChain(btn.dataset.id, colors));
    });
  }
  
  function runChain(id, colors) {
    const chain = PromptChainService.getChainById(id);
    if (!chain) return;
    
    if (chain.variables && chain.variables.length > 0) {
      showChainVariablesModal(chain, colors);
    } else {
      close();
      new PromptChainExecutor().runChain(chain);
    }
  }
  
  function showChainVariablesModal(chain, colors) {
    const varModal = document.createElement('div');
    varModal.style.cssText = 'position: fixed; inset: 0; z-index: 100002; display: flex; align-items: center; justify-content: center;';
    
    varModal.innerHTML = `
      <div style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.7);" onclick="this.parentElement.remove()"></div>
      <div style="position: relative; background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 24px; max-width: 450px; width: 90%; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${colors.text};">${ToolboxI18n.html("Fill Chain Variables")}</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: ${colors.textSecondary};">${ToolboxI18n.html("This chain requires the following variables:")}</p>
        <div id="ds-var-inputs" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
          ${chain.variables.map(v => `
            <div>
              <label style="display: block; font-size: 13px; font-weight: 500; color: ${colors.text}; margin-bottom: 4px;">{{${escapeHtml(v)}}}</label>
              <input type="text" class="ds-var-input" data-var="${escapeHtml(v)}" placeholder="${ToolboxI18n.html("Enter value...")}" style="width: 100%; padding: 10px 12px; background: ${colors.bgSecondary}; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.text}; font-size: 14px; outline: none; box-sizing: border-box;">
            </div>
          `).join('')}
        </div>
        <div style="display: flex; gap: 12px;">
          <button id="ds-var-cancel" style="flex: 1; padding: 10px; background: transparent; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.text}; font-size: 14px; cursor: pointer;">${ToolboxI18n.html("Cancel")}</button>
          <button id="ds-var-run" style="flex: 1; padding: 10px; background: ${colors.accent}; border: none; border-radius: 8px; color: white; font-size: 14px; font-weight: 600; cursor: pointer;">${ToolboxI18n.html("Run Chain")}</button>
        </div>
      </div>
    `;
    
    ToolboxI18n.applyDirection(varModal);
    document.body.appendChild(varModal);
    
    varModal.querySelector('#ds-var-cancel').addEventListener('click', () => varModal.remove());
    varModal.querySelector('#ds-var-run').addEventListener('click', () => {
      const inputs = varModal.querySelectorAll('.ds-var-input');
      const values = {};
      let hasEmpty = false;
      
      inputs.forEach(input => {
        const val = input.value.trim();
        if (!val) {
          hasEmpty = true;
          input.style.borderColor = colors.error;
        } else {
          values[input.dataset.var] = val;
        }
      });
      
      if (hasEmpty) {
        showToast(ToolboxI18n.t("Please fill in all variables"), 'error');
        return;
      }
      
      varModal.remove();
      close();
      new PromptChainExecutor().runChain(chain, values);
    });
    
    // Focus first input
    setTimeout(() => {
      varModal.querySelector('.ds-var-input')?.focus();
    }, 100);
  }
  
  async function deleteChain(id, colors) {
    const confirmed = await DialogUtils.showConfirm({
      title: ToolboxI18n.t("Delete Chain"),
      message: ToolboxI18n.t("Are you sure you want to delete this chain? This action cannot be undone."),
      confirmText: ToolboxI18n.t("Delete"),
      type: 'danger'
    });
    if (!confirmed) return;
    
    try {
      await PromptChainService.deleteChain(id);
      showToast(ToolboxI18n.t("Chain deleted"), 'success');
      render(colors);
    } catch (error) {
      console.error('[PromptLibraryModal] Delete chain error:', error);
      showToast(ToolboxI18n.t("Failed to delete chain"), 'error');
    }
  }

  function formatPreview(content, variables, colors) {
    let preview = escapeHtml(content.substring(0, 200));
    
    if (variables && variables.length > 0) {
      variables.forEach(v => {
        const safeVar = escapeHtml(v);
        const regex = new RegExp(`\\{${safeVar}\\}`, 'g');
        preview = preview.replace(regex, `<span style="color: ${colors.accent}; font-weight: 600;">{${safeVar}}</span>`);
      });
    }
    
    return preview + (content.length > 200 ? '...' : '');
  }

  function getEmptyStateHTML(colors) {
    let message, subMessage;
    
    if (searchQuery) {
      message = ToolboxI18n.t("No prompts found");
      subMessage = ToolboxI18n.t("Try a different search term");
    } else if (selectedCategory === 'my-prompts') {
      message = ToolboxI18n.t("No custom prompts yet");
      subMessage = ToolboxI18n.t("Click \"Add New Prompt\" to create your first prompt");
    } else {
      message = ToolboxI18n.t("No prompts in this category");
      subMessage = ToolboxI18n.t("Check back later for more prompts");
    }
    
    return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: ${colors.textSecondary}; text-align: center; padding: 40px;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity: 0.4; margin-bottom: 16px;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <p style="font-size: 16px; margin: 0 0 8px 0; color: ${colors.text};">${message}</p>
        <p style="font-size: 14px; margin: 0; opacity: 0.7;">${subMessage}</p>
      </div>
    `;
  }

  function usePrompt(id) {
    const prompt = PromptLibraryService.getPromptById(id);
    if (!prompt) return;
    
    injectPrompt(prompt.content);
    close();
    showToast('Prompt inserted! Fill in the {variables} as needed.', 'success');
  }

  function injectPrompt(content) {
    // Try DeepSeek's textarea
    const textarea = document.querySelector('textarea._27c9245') || 
                     document.querySelector('textarea[placeholder*="Message"]') ||
                     document.querySelector('textarea');
    
    if (textarea) {
      textarea.value = content;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.focus();
      
      // Move cursor to end
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
      return;
    }
    
    // Fallback: contenteditable div
    const editableDiv = document.querySelector('div[contenteditable="true"]');
    if (editableDiv) {
      editableDiv.innerHTML = '';
      content.split('\n').forEach((line, i) => {
        const p = document.createElement('p');
        p.textContent = line || '\u00A0';
        editableDiv.appendChild(p);
      });
      editableDiv.dispatchEvent(new Event('input', { bubbles: true }));
      editableDiv.focus();
      return;
    }
    
    console.error('[PromptLibraryModal] Could not find input element');
  }

  async function deletePrompt(id, colors) {
    const confirmed = await DialogUtils.showConfirm({
      title: ToolboxI18n.t("Delete Prompt"),
      message: ToolboxI18n.t("Are you sure you want to delete this prompt? This action cannot be undone."),
      confirmText: ToolboxI18n.t("Delete"),
      type: 'danger'
    });
    if (!confirmed) return;
    
    try {
      await PromptLibraryService.deletePrompt(id);
      showToast(ToolboxI18n.t("Prompt deleted"), 'success');
      render(colors);
    } catch (error) {
      console.error('[PromptLibraryModal] Delete error:', error);
      showToast(ToolboxI18n.t("Failed to delete prompt"), 'error');
    }
  }

  function showToast(message, type) {
    document.querySelectorAll('.ds-library-toast').forEach(t => t.remove());
    
    const colors = getThemeColors();
    const toast = document.createElement('div');
    toast.className = 'ds-library-toast';
    toast.style.cssText = `position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: ${colors.bg}; border: 1px solid ${type === 'error' ? colors.error : colors.success}; border-radius: 12px; padding: 12px 20px; color: ${colors.text}; font-size: 14px; font-weight: 500; z-index: 100001; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); display: flex; align-items: center; gap: 10px;`;
    
    const icon = type === 'error'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.error}" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.success}" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
    
    toast.innerHTML = icon + '<span>' + escapeHtml(message) + '</span>';
    ToolboxI18n.applyDirection(toast);
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }

  function close() {
    document.removeEventListener('keydown', handleEscape);
    
    if (backdrop) {
      backdrop.style.opacity = '0';
    }
    if (modal) {
      modal.style.opacity = '0';
      modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
    }
    
    setTimeout(() => {
      if (backdrop) {
        backdrop.remove();
        backdrop = null;
      }
      if (modal) {
        modal.remove();
        modal = null;
      }
    }, 200);
  }

  return { open, close };
})();
