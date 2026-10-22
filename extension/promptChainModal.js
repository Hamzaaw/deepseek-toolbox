// DeepSeek Toolbox - Prompt Chain Modal
// UI for creating and editing prompt chains

const PromptChainModal = (function() {
  'use strict';

  let modal = null;
  let backdrop = null;
  let editingChain = null;
  let currentSteps = [];
  let onSaveCallback = null;
  let draggedIndex = null;

  function getThemeColors() {
    const isDark = document.body.classList.contains('dark');
    return {
      bg: isDark ? '#1e1e1e' : '#ffffff',
      bgSecondary: isDark ? '#2a2a2a' : '#f5f5f5',
      text: isDark ? '#e4e4e4' : '#1a1a1a',
      textSecondary: isDark ? '#888888' : '#666666',
      border: isDark ? '#333333' : '#e0e0e0',
      hover: isDark ? '#333333' : '#f0f0f0',
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

  function open(chain = null, callback = null) {
    if (modal) close();

    editingChain = chain;
    onSaveCallback = callback;
    currentSteps = chain ? [...chain.steps] : ['', ''];
    
    const colors = getThemeColors();
    const isEdit = !!chain;

    backdrop = document.createElement('div');
    backdrop.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); z-index: 100000; opacity: 0; transition: opacity 0.2s ease;';
    backdrop.addEventListener('click', close);

    modal = document.createElement('div');
    modal.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.95); width: 90%; max-width: 700px; max-height: 85vh; background: ${colors.bg}; border-radius: 16px; box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4); z-index: 100001; opacity: 0; transition: all 0.2s ease; display: flex; flex-direction: column; overflow: hidden;`;

    modal.innerHTML = getModalHTML(colors, isEdit, chain);

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    document.addEventListener('keydown', handleEscape);

    initEventListeners(colors);
    renderSteps(colors);

    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      modal.style.opacity = '1';
      modal.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    setTimeout(() => {
      const titleInput = modal.querySelector('#ds-chain-title');
      if (titleInput) titleInput.focus();
    }, 100);
  }

  function getModalHTML(colors, isEdit, chain) {
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid ${colors.border}; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.accent}" stroke-width="2">
            <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/>
            <path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: ${colors.text};">${isEdit ? 'Edit Chain' : 'Create Prompt Chain'}</h2>
        </div>
        <button id="ds-chain-close" style="background: none; border: none; padding: 8px; cursor: pointer; color: ${colors.textSecondary}; border-radius: 8px; display: flex;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      
      <div style="flex: 1; overflow-y: auto; overflow-x: hidden; padding: 24px;">
        <div style="margin-bottom: 20px;">
          <label style="display: block; font-size: 13px; font-weight: 500; color: ${colors.text}; margin-bottom: 6px;">
            Chain Title <span style="color: ${colors.error};">*</span>
          </label>
          <input type="text" id="ds-chain-title" placeholder="e.g., Research Paper Writing Chain" maxlength="100"
            value="${chain ? escapeHtml(chain.title) : ''}"
            style="width: 100%; padding: 10px 12px; background: ${colors.bgSecondary}; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.text}; font-size: 14px; outline: none; box-sizing: border-box;">
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; font-size: 13px; font-weight: 500; color: ${colors.text}; margin-bottom: 6px;">
            Description
          </label>
          <input type="text" id="ds-chain-description" placeholder="Brief description of what this chain does"
            value="${chain ? escapeHtml(chain.description || '') : ''}"
            style="width: 100%; padding: 10px 12px; background: ${colors.bgSecondary}; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.text}; font-size: 14px; outline: none; box-sizing: border-box;">
        </div>
        
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label style="font-size: 13px; font-weight: 500; color: ${colors.text};">
              Chain Steps <span style="color: ${colors.error};">*</span>
              <span style="font-weight: 400; color: ${colors.textSecondary};"> (Use {{variable}} for placeholders)</span>
            </label>
            <span id="ds-step-count" style="font-size: 12px; color: ${colors.textSecondary};">2 / 10 steps</span>
          </div>
          
          <div id="ds-steps-container" style="display: flex; flex-direction: column; gap: 12px;"></div>
          
          <button id="ds-add-step" style="width: 100%; margin-top: 12px; padding: 10px; background: ${colors.bgSecondary}; border: 1px dashed ${colors.border}; border-radius: 8px; color: ${colors.text}; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Step
          </button>
        </div>
        
        <div id="ds-chain-variables" style="display: none; margin-top: 16px; padding: 12px; background: rgba(77, 107, 254, 0.1); border: 1px solid rgba(77, 107, 254, 0.2); border-radius: 8px;">
          <div style="font-size: 12px; font-weight: 600; color: ${colors.accent}; margin-bottom: 8px;">Detected Variables:</div>
          <div id="ds-chain-variables-list" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
        </div>
      </div>
      
      <div style="padding: 16px 24px; border-top: 1px solid ${colors.border}; display: flex; gap: 12px; flex-shrink: 0;">
        <button id="ds-chain-cancel" style="flex: 1; padding: 10px 20px; background: transparent; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.text}; font-size: 14px; font-weight: 500; cursor: pointer;">
          Cancel
        </button>
        <button id="ds-chain-save" style="flex: 1; padding: 10px 20px; background: ${colors.accent}; border: none; border-radius: 8px; color: white; font-size: 14px; font-weight: 600; cursor: pointer;">
          ${isEdit ? 'Update Chain' : 'Create Chain'}
        </button>
      </div>
    `;
  }

  function initEventListeners(colors) {
    modal.querySelector('#ds-chain-close').addEventListener('click', close);
    modal.querySelector('#ds-chain-cancel').addEventListener('click', close);
    modal.querySelector('#ds-chain-save').addEventListener('click', saveChain);
    modal.querySelector('#ds-add-step').addEventListener('click', () => addStep(colors));
  }

  function renderSteps(colors) {
    const container = modal.querySelector('#ds-steps-container');
    const countEl = modal.querySelector('#ds-step-count');
    const addBtn = modal.querySelector('#ds-add-step');
    
    container.innerHTML = '';
    
    currentSteps.forEach((step, index) => {
      const stepEl = createStepElement(step, index, colors);
      container.appendChild(stepEl);
    });
    
    countEl.textContent = `${currentSteps.length} / 10 steps`;
    
    if (currentSteps.length >= 10) {
      addBtn.style.opacity = '0.5';
      addBtn.style.cursor = 'not-allowed';
      addBtn.disabled = true;
    } else {
      addBtn.style.opacity = '1';
      addBtn.style.cursor = 'pointer';
      addBtn.disabled = false;
    }
    
    detectVariables(colors);
  }

  function createStepElement(content, index, colors) {
    const stepEl = document.createElement('div');
    stepEl.className = 'ds-chain-step';
    stepEl.draggable = true;
    stepEl.dataset.index = index;
    stepEl.style.cssText = `background: ${colors.bgSecondary}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 12px; cursor: move; transition: all 0.15s;`;
    
    stepEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colors.textSecondary}" stroke-width="2" style="cursor: grab;">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          <span style="font-size: 13px; font-weight: 600; color: ${colors.text};">Step ${index + 1}</span>
        </div>
        <button class="ds-remove-step" data-index="${index}" style="background: none; border: none; padding: 4px; cursor: pointer; color: ${colors.textSecondary}; border-radius: 4px; display: flex; ${currentSteps.length <= 2 ? 'opacity: 0.3; cursor: not-allowed;' : ''}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
      <textarea class="ds-step-content" data-index="${index}" placeholder="Enter prompt for step ${index + 1}... (use {{variable}} for dynamic values)" rows="3"
        style="width: 100%; padding: 10px; background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 6px; color: ${colors.text}; font-size: 13px; font-family: 'SF Mono', Monaco, monospace; outline: none; resize: vertical; min-height: 70px; box-sizing: border-box;">${escapeHtml(content)}</textarea>
      <div class="ds-char-count" style="font-size: 11px; color: ${colors.textSecondary}; text-align: right; margin-top: 4px;">${content.length} / 6000</div>
    `;
    
    // Event listeners
    const textarea = stepEl.querySelector('.ds-step-content');
    textarea.addEventListener('input', (e) => {
      currentSteps[index] = e.target.value;
      const charCount = stepEl.querySelector('.ds-char-count');
      charCount.textContent = `${e.target.value.length} / 6000`;
      if (e.target.value.length > 6000) {
        charCount.style.color = colors.error;
      } else {
        charCount.style.color = colors.textSecondary;
      }
      detectVariables(colors);
    });
    
    const removeBtn = stepEl.querySelector('.ds-remove-step');
    if (currentSteps.length > 2) {
      removeBtn.addEventListener('click', () => removeStep(index, colors));
    }
    
    // Drag events
    stepEl.addEventListener('dragstart', (e) => {
      draggedIndex = index;
      stepEl.style.opacity = '0.5';
    });
    
    stepEl.addEventListener('dragend', () => {
      stepEl.style.opacity = '1';
      draggedIndex = null;
    });
    
    stepEl.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    stepEl.addEventListener('drop', (e) => {
      e.preventDefault();
      if (draggedIndex !== null && draggedIndex !== index) {
        const draggedStep = currentSteps[draggedIndex];
        currentSteps.splice(draggedIndex, 1);
        currentSteps.splice(index, 0, draggedStep);
        renderSteps(colors);
      }
    });
    
    return stepEl;
  }

  function addStep(colors) {
    if (currentSteps.length >= 10) {
      showToast('Maximum 10 steps allowed', 'error');
      return;
    }
    currentSteps.push('');
    renderSteps(colors);
    
    setTimeout(() => {
      const textareas = modal.querySelectorAll('.ds-step-content');
      const last = textareas[textareas.length - 1];
      if (last) last.focus();
    }, 50);
  }

  function removeStep(index, colors) {
    if (currentSteps.length <= 2) {
      showToast('Chain must have at least 2 steps', 'error');
      return;
    }
    currentSteps.splice(index, 1);
    renderSteps(colors);
  }

  function detectVariables(colors) {
    const variables = PromptChainService.extractVariables(currentSteps);
    const container = modal.querySelector('#ds-chain-variables');
    const list = modal.querySelector('#ds-chain-variables-list');
    
    if (variables.length > 0) {
      container.style.display = 'block';
      list.innerHTML = variables.map(v => `
        <span style="padding: 4px 10px; background: rgba(77, 107, 254, 0.2); border: 1px solid rgba(77, 107, 254, 0.3); border-radius: 12px; font-size: 12px; color: ${colors.accent}; font-family: monospace;">
          {{${escapeHtml(v)}}}
        </span>
      `).join('');
    } else {
      container.style.display = 'none';
    }
  }

  async function saveChain() {
    const title = modal.querySelector('#ds-chain-title').value.trim();
    const description = modal.querySelector('#ds-chain-description').value.trim();
    const steps = currentSteps.filter(s => s.trim().length > 0);
    
    if (!title) {
      showToast('Please enter a chain title', 'error');
      return;
    }
    
    if (steps.length < 2) {
      showToast('Chain must have at least 2 non-empty steps', 'error');
      return;
    }
    
    const oversized = steps.findIndex(s => s.length > 6000);
    if (oversized !== -1) {
      showToast(`Step ${oversized + 1} exceeds 6000 character limit`, 'error');
      return;
    }
    
    try {
      let result;
      if (editingChain) {
        result = await PromptChainService.updateChain(editingChain.id, { title, description, steps });
        showToast('Chain updated successfully!', 'success');
      } else {
        result = await PromptChainService.createChain({ title, description, steps });
        showToast('Chain created successfully!', 'success');
      }
      
      if (onSaveCallback) onSaveCallback(result);
      setTimeout(close, 500);
    } catch (error) {
      console.error('[PromptChainModal] Save error:', error);
      showToast(error.message || 'Failed to save chain', 'error');
    }
  }

  function showToast(message, type) {
    document.querySelectorAll('.ds-chain-toast').forEach(t => t.remove());
    
    const colors = getThemeColors();
    const toast = document.createElement('div');
    toast.className = 'ds-chain-toast';
    toast.style.cssText = `position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: ${colors.bg}; border: 1px solid ${type === 'error' ? colors.error : colors.success}; border-radius: 12px; padding: 12px 20px; color: ${colors.text}; font-size: 14px; font-weight: 500; z-index: 100002; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); display: flex; align-items: center; gap: 10px;`;
    
    const icon = type === 'error'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.error}" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.success}" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
    
    toast.innerHTML = icon + '<span>' + escapeHtml(message) + '</span>';
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }

  function close() {
    document.removeEventListener('keydown', handleEscape);
    
    if (backdrop) backdrop.style.opacity = '0';
    if (modal) {
      modal.style.opacity = '0';
      modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
    }
    
    setTimeout(() => {
      if (backdrop) { backdrop.remove(); backdrop = null; }
      if (modal) { modal.remove(); modal = null; }
      editingChain = null;
      currentSteps = [];
      onSaveCallback = null;
    }, 200);
  }

  return { open, close };
})();
