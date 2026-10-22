// DeepSeek Toolbox - Prompt Editor Modal
// UI for creating and editing custom prompts

const PromptEditorModal = (function() {
  'use strict';

  let modal = null;
  let backdrop = null;
  let editingPrompt = null;
  let onSaveCallback = null;

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

  function handleEscape(e) {
    if (e.key === 'Escape') close();
  }

  function open(prompt = null, callback = null) {
    if (modal) close();

    editingPrompt = prompt;
    onSaveCallback = callback;
    const colors = getThemeColors();
    const isEdit = !!prompt;

    backdrop = document.createElement('div');
    backdrop.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); z-index: 100000; opacity: 0; transition: opacity 0.2s ease;';
    backdrop.addEventListener('click', close);

    modal = document.createElement('div');
    modal.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.95); width: 90%; max-width: 600px; max-height: 85vh; background: ${colors.bg}; border-radius: 16px; box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4); z-index: 100001; opacity: 0; transition: all 0.2s ease; display: flex; flex-direction: column; overflow: hidden;`;

    modal.innerHTML = getModalHTML(colors, isEdit, prompt);

    ToolboxI18n.applyDirection(backdrop);
    document.body.appendChild(backdrop);
    ToolboxI18n.applyDirection(modal);
    document.body.appendChild(modal);
    document.addEventListener('keydown', handleEscape);

    initEventListeners(colors);

    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      modal.style.opacity = '1';
      modal.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    setTimeout(() => {
      const titleInput = modal.querySelector('#ds-prompt-title');
      if (titleInput) titleInput.focus();
    }, 100);
  }

  function getModalHTML(colors, isEdit, prompt) {
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid ${colors.border}; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.accent}" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: ${colors.text};">${isEdit ? ToolboxI18n.t("Edit Prompt") : ToolboxI18n.t("Create New Prompt")}</h2>
        </div>
        <button id="ds-editor-close" style="background: none; border: none; padding: 8px; cursor: pointer; color: ${colors.textSecondary}; border-radius: 8px; display: flex;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      
      <div style="flex: 1; overflow-y: auto; overflow-x: hidden; padding: 24px;">
        <form id="ds-prompt-form" style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label style="display: block; font-size: 13px; font-weight: 500; color: ${colors.text}; margin-bottom: 6px;">
              ${ToolboxI18n.html("Title")} <span style="color: ${colors.error};">*</span>
            </label>
            <input type="text" id="ds-prompt-title" placeholder="${ToolboxI18n.html("Enter a descriptive title")}" required
              value="${prompt ? escapeHtml(prompt.title) : ''}"
              style="width: 100%; padding: 10px 12px; background: ${colors.bgSecondary}; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.text}; font-size: 14px; outline: none; transition: border-color 0.2s; box-sizing: border-box;">
          </div>
          
          <div>
            <label style="display: block; font-size: 13px; font-weight: 500; color: ${colors.text}; margin-bottom: 6px;">
              ${ToolboxI18n.html("Description")}
            </label>
            <input type="text" id="ds-prompt-description" placeholder="${ToolboxI18n.html("Brief description of what this prompt does")}"
              value="${prompt ? escapeHtml(prompt.description || '') : ''}"
              style="width: 100%; padding: 10px 12px; background: ${colors.bgSecondary}; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.text}; font-size: 14px; outline: none; transition: border-color 0.2s; box-sizing: border-box;">
          </div>
          
          <div>
            <label style="display: block; font-size: 13px; font-weight: 500; color: ${colors.text}; margin-bottom: 6px;">
              ${ToolboxI18n.html("Content")} <span style="color: ${colors.error};">*</span>
              <span style="font-weight: 400; color: ${colors.textSecondary};"> ${ToolboxI18n.html("(Use {variable_name} for placeholders)")}</span>
            </label>
            <textarea id="ds-prompt-content" placeholder="${ToolboxI18n.html("Enter your prompt template...\n\nExample:\nWrite a blog post about {topic} for {audience}.\nTone: {tone}")}" required rows="8"
              style="width: 100%; padding: 12px; background: ${colors.bgSecondary}; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.text}; font-size: 13px; font-family: 'SF Mono', Monaco, monospace; outline: none; resize: vertical; min-height: 150px; transition: border-color 0.2s; box-sizing: border-box;">${prompt ? escapeHtml(prompt.content) : ''}</textarea>
          </div>
          
          <div id="ds-variables-display" style="display: none; padding: 12px; background: rgba(77, 107, 254, 0.1); border: 1px solid rgba(77, 107, 254, 0.2); border-radius: 8px;">
            <div style="font-size: 12px; font-weight: 600; color: ${colors.accent}; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>
              </svg>
              <span>${ToolboxI18n.html("Detected Variables:")}</span>
            </div>
            <div id="ds-variables-list" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
          </div>
        </form>
      </div>
      
      <div style="padding: 16px 24px; border-top: 1px solid ${colors.border}; display: flex; gap: 12px; flex-shrink: 0;">
        <button id="ds-editor-cancel" style="flex: 1; padding: 10px 20px; background: transparent; border: 1px solid ${colors.border}; border-radius: 8px; color: ${colors.text}; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s;">
          ${ToolboxI18n.html("Cancel")}
        </button>
        <button id="ds-editor-save" style="flex: 1; padding: 10px 20px; background: ${colors.accent}; border: none; border-radius: 8px; color: white; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s;">
          ${isEdit ? ToolboxI18n.t("Update Prompt") : ToolboxI18n.t("Save Prompt")}
        </button>
      </div>
      
      <style>
        #ds-prompt-title:focus, #ds-prompt-description:focus, #ds-prompt-content:focus {
          border-color: ${colors.accent} !important;
        }
        #ds-editor-cancel:hover {
          background: ${colors.hover} !important;
        }
        #ds-editor-save:hover {
          background: ${colors.accentHover} !important;
        }
      </style>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function initEventListeners(colors) {
    modal.querySelector('#ds-editor-close').addEventListener('click', close);
    modal.querySelector('#ds-editor-cancel').addEventListener('click', close);
    
    const contentTextarea = modal.querySelector('#ds-prompt-content');
    contentTextarea.addEventListener('input', () => detectVariables(colors));
    
    // Initial variable detection if editing
    if (editingPrompt) {
      detectVariables(colors);
    }
    
    modal.querySelector('#ds-prompt-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await savePrompt();
    });

    modal.querySelector('#ds-editor-save').addEventListener('click', async () => {
      await savePrompt();
    });
  }

  function detectVariables(colors) {
    const content = modal.querySelector('#ds-prompt-content').value;
    const display = modal.querySelector('#ds-variables-display');
    const list = modal.querySelector('#ds-variables-list');
    
    const pattern = /\{([^}]+)\}/g;
    const variables = [];
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    if (variables.length > 0) {
      display.style.display = 'block';
      list.innerHTML = variables.map(v => `
        <span style="padding: 4px 10px; background: rgba(77, 107, 254, 0.2); border: 1px solid rgba(77, 107, 254, 0.3); border-radius: 12px; font-size: 12px; color: ${colors.accent}; font-family: monospace;">
          {${escapeHtml(v)}}
        </span>
      `).join('');
    } else {
      display.style.display = 'none';
    }
  }

  async function savePrompt() {
    const title = modal.querySelector('#ds-prompt-title').value.trim();
    const description = modal.querySelector('#ds-prompt-description').value.trim();
    const content = modal.querySelector('#ds-prompt-content').value.trim();
    
    if (!title || !content) {
      showToast(ToolboxI18n.t("Please fill in all required fields"), 'error');
      return;
    }
    
    const promptData = { title, description, content };
    
    try {
      let result;
      if (editingPrompt) {
        result = await PromptLibraryService.updatePrompt(editingPrompt.id, promptData);
        showToast(ToolboxI18n.t("Prompt updated successfully!"), 'success');
      } else {
        result = await PromptLibraryService.addPrompt(promptData);
        showToast(ToolboxI18n.t("Prompt created successfully!"), 'success');
      }
      
      if (onSaveCallback) {
        onSaveCallback(result);
      }
      
      setTimeout(close, 500);
    } catch (error) {
      console.error('[PromptEditorModal] Save error:', error);
      showToast(ToolboxI18n.t("Failed to save prompt"), 'error');
    }
  }

  function showToast(message, type) {
    document.querySelectorAll('.ds-prompt-toast').forEach(t => t.remove());
    
    const colors = getThemeColors();
    const toast = document.createElement('div');
    toast.className = 'ds-prompt-toast';
    toast.style.cssText = `position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: ${colors.bg}; border: 1px solid ${type === 'error' ? colors.error : colors.success}; border-radius: 12px; padding: 12px 20px; color: ${colors.text}; font-size: 14px; font-weight: 500; z-index: 100002; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); display: flex; align-items: center; gap: 10px;`;
    
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
      editingPrompt = null;
      onSaveCallback = null;
    }, 200);
  }

  return { open, close };
})();
