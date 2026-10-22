// DeepSeek Toolbox - Chat Export Modal
// UI for selecting export format

const ChatExportModal = (function() {
  'use strict';

  let modal = null;
  let backdrop = null;
  let exporter = null;
  let isExporting = false;
  let hasMessages = false;

  const EXPORT_FORMATS = [
    { id: 'pdf', label: 'PDF', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>', desc: ToolboxI18n.t("Print-ready document") },
    { id: 'html', label: 'HTML', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>', desc: ToolboxI18n.t("Styled web page") },
    { id: 'markdown', label: 'Markdown', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 17h6"/><path d="M12 12v5"/></svg>', desc: ToolboxI18n.t("Plain text with formatting") },
    { id: 'json', label: 'JSON', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></svg>', desc: ToolboxI18n.t("Structured data format") },
    { id: 'txt', label: ToolboxI18n.t("Text"), icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', desc: ToolboxI18n.t("Plain text file") }
  ];

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
      success: '#10b981'
    };
  }

  function handleEscape(e) {
    if (e.key === 'Escape' && !isExporting) close();
  }

  async function open() {
    try {
      if (modal) close();

      const colors = getThemeColors();
      isExporting = false;

      exporter = new ChatExporter();
      hasMessages = await exporter.preExtractMessages();

      backdrop = document.createElement('div');
      backdrop.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); z-index: 99998; opacity: 0; transition: opacity 0.2s ease;';
      backdrop.addEventListener('click', close);

      modal = document.createElement('div');
      modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.95); width: 90%; max-width: 480px; background: ' + colors.bg + '; border-radius: 16px; box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4); z-index: 99999; opacity: 0; transition: all 0.2s ease; overflow: hidden;';

      if (hasMessages) {
        modal.innerHTML = getModalHTML(colors, exporter.getMessageCount());
      } else {
        modal.innerHTML = getEmptyStateHTML(colors);
      }

      ToolboxI18n.applyDirection(backdrop);
      document.body.appendChild(backdrop);
      ToolboxI18n.applyDirection(modal);
      document.body.appendChild(modal);

      document.addEventListener('keydown', handleEscape);
      initEventListeners(colors);

      requestAnimationFrame(function() {
        backdrop.style.opacity = '1';
        modal.style.opacity = '1';
        modal.style.transform = 'translate(-50%, -50%) scale(1)';
      });
    } catch (error) {
      console.error('[ChatExportModal] Error opening modal:', error);
      showToast(ToolboxI18n.t("Failed to open export modal"), 'error');
      close();
    }
  }

  function getEmptyStateHTML(colors) {
    return '<div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid ' + colors.border + ';">' +
      '<div style="display: flex; align-items: center; gap: 12px;">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + colors.accent + '" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
        '<h2 style="margin: 0; font-size: 18px; font-weight: 600; color: ' + colors.text + ';">' + ToolboxI18n.html("Export Chat") + '</h2>' +
      '</div>' +
      '<button id="ds-export-close" style="background: none; border: none; padding: 8px; cursor: pointer; color: ' + colors.textSecondary + '; border-radius: 8px; display: flex; align-items: center; justify-content: center;">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      '</button>' +
    '</div>' +
    '<div style="padding: 40px 24px; text-align: center;">' +
      '<div style="width: 64px; height: 64px; margin: 0 auto 20px; background: ' + colors.hover + '; border-radius: 50%; display: flex; align-items: center; justify-content: center;">' +
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + colors.textSecondary + '" stroke-width="1.5">' +
          '<circle cx="12" cy="12" r="10"/>' +
          '<path d="M12 16v-4M12 8h.01"/>' +
        '</svg>' +
      '</div>' +
      '<h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: ' + colors.text + ';">' + ToolboxI18n.html("No Conversation Open") + '</h3>' +
      '<p style="margin: 0 0 8px; font-size: 14px; color: ' + colors.textSecondary + '; line-height: 1.5;">' + ToolboxI18n.html("Please open a chat conversation first, then click \"Export Chat\".") + '</p>' +
      '<p style="margin: 0; font-size: 13px; color: ' + colors.textSecondary + '; opacity: 0.8;">' + ToolboxI18n.html("This tool exports the conversation currently displayed in your browser.") + '</p>' +
    '</div>' +
    '<div style="padding: 16px 24px; border-top: 1px solid ' + colors.border + '; display: flex; justify-content: center;">' +
      '<button id="ds-export-close-btn" style="padding: 10px 32px; background: ' + colors.accent + '; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">' + ToolboxI18n.html("Close") + '</button>' +
    '</div>';
  }

  function getModalHTML(colors, messageCount) {
    return '<div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid ' + colors.border + ';"><div style="display: flex; align-items: center; gap: 12px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + colors.accent + '" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><h2 style="margin: 0; font-size: 18px; font-weight: 600; color: ' + colors.text + ';">' + ToolboxI18n.html("Export Chat") + '</h2></div><button id="ds-export-close" style="background: none; border: none; padding: 8px; cursor: pointer; color: ' + colors.textSecondary + '; border-radius: 8px; display: flex; align-items: center; justify-content: center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div><div style="padding: 20px 24px;"><p style="margin: 0 0 20px; font-size: 14px; color: ' + colors.textSecondary + ';">' + ToolboxI18n.html("Choose a format to export") + ' <strong style="color: ' + colors.text + ';">' + ToolboxI18n.html('Messages: $1', [messageCount]) + '</strong></p><div id="ds-export-formats" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">' + EXPORT_FORMATS.map(function(fmt) { return '<button class="ds-export-format-btn" data-format="' + fmt.id + '" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 16px; border: 1px solid ' + colors.border + '; background: ' + colors.bg + '; border-radius: 12px; cursor: pointer; transition: all 0.15s ease; color: ' + colors.text + ';"><span style="color: ' + colors.accent + ';">' + fmt.icon + '</span><span style="font-size: 14px; font-weight: 600;">' + fmt.label + '</span><span style="font-size: 11px; color: ' + colors.textSecondary + ';">' + fmt.desc + '</span></button>'; }).join('') + '</div></div><div id="ds-export-progress" style="display: none; padding: 20px 24px; text-align: center;"><div style="display: inline-block; width: 32px; height: 32px; border: 3px solid ' + colors.border + '; border-top-color: ' + colors.accent + '; border-radius: 50%; animation: ds-spin 1s linear infinite;"></div><p style="margin: 12px 0 0; font-size: 14px; color: ' + colors.textSecondary + ';">' + ToolboxI18n.html("Exporting...") + '</p></div><style>@keyframes ds-spin { to { transform: rotate(360deg); } } .ds-export-format-btn:hover { border-color: ' + colors.accent + ' !important; background: ' + colors.hover + ' !important; } .ds-export-format-btn:active { transform: scale(0.98); }</style>';
  }

  function initEventListeners(colors) {
    modal.querySelector('#ds-export-close').addEventListener('click', close);
    
    var closeBtn = modal.querySelector('#ds-export-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }
    
    if (hasMessages) {
      modal.querySelectorAll('.ds-export-format-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { handleExport(btn.dataset.format, colors); });
      });
    }
  }

  async function handleExport(format, colors) {
    if (isExporting || !exporter) return;
    isExporting = true;

    var formatsEl = modal.querySelector('#ds-export-formats');
    var progressEl = modal.querySelector('#ds-export-progress');

    if (formatsEl) formatsEl.style.display = 'none';
    if (progressEl) progressEl.style.display = 'block';

    try {
      await exporter.exportChat(format);
      showToast(ToolboxI18n.t("Exported as $1 successfully!", [format.toUpperCase()]), 'success');
      close();
    } catch (error) {
      console.error('[ChatExportModal] Export error:', error);
      showToast(ToolboxI18n.t("Export failed. Please try again."), 'error');
      if (formatsEl) formatsEl.style.display = 'grid';
      if (progressEl) progressEl.style.display = 'none';
      isExporting = false;
    }
  }

  function showToast(message, type) {
    type = type || 'success';
    document.querySelectorAll('.ds-export-toast').forEach(function(t) { t.remove(); });

    var colors = getThemeColors();
    var toast = document.createElement('div');
    toast.className = 'ds-export-toast';
    toast.style.cssText = 'position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: ' + colors.bg + '; border: 1px solid ' + (type === 'error' ? '#ef4444' : colors.success) + '; border-radius: 12px; padding: 12px 20px; color: ' + colors.text + '; font-size: 14px; font-weight: 500; z-index: 100001; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); display: flex; align-items: center; gap: 10px; animation: ds-toast-slide-up 0.2s ease-out;';

    var icon = type === 'error'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + colors.success + '" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';

    toast.innerHTML = icon + '<span>' + message + '</span>';
    ToolboxI18n.applyDirection(toast);
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(function() { toast.remove(); }, 200);
    }, 3000);
  }

  function close() {
    document.removeEventListener('keydown', handleEscape);
    
    if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
    if (modal) {
      modal.remove();
      modal = null;
    }

    exporter = null;
    isExporting = false;
    hasMessages = false;
  }

  return { open: open, close: close };
})();
