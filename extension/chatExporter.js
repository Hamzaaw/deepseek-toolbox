// DeepSeek Toolbox - Chat Exporter Module
// Export conversations in multiple formats: PDF, HTML, Markdown, JSON, TXT

(function() {
  'use strict';

  class ChatExporter {
    constructor() {
      this.messages = [];
      this.conversationTitle = '';
      this.exportDate = new Date();
      this.isExporting = false;
      this.processedElements = new Set();
    }

    async exportChat(format) {
      if (this.isExporting) {
        log('Export already in progress');
        return;
      }

      this.isExporting = true;
      this.processedElements.clear();

      try {
        log(`Starting ${format} export...`);

        const success = await this.extractChatContent();
        if (!success || this.messages.length === 0) {
          throw new Error('No messages found to export');
        }

        log(`Extracted ${this.messages.length} messages`);

        switch (format.toLowerCase()) {
          case 'pdf':
            await this.exportToPDF();
            break;
          case 'html':
            await this.exportToHTML();
            break;
          case 'markdown':
            await this.exportToMarkdown();
            break;
          case 'json':
            await this.exportToJSON();
            break;
          case 'txt':
          case 'text':
            await this.exportToText();
            break;
          default:
            throw new Error(`Unsupported format: ${format}`);
        }

      } catch (error) {
        console.error('[ChatExporter] Export error:', error);
        throw error;
      } finally {
        this.isExporting = false;
      }
    }

    async preExtractMessages() {
      this.processedElements.clear();
      const success = await this.extractChatContent();
      return success && this.messages.length > 0;
    }

    async extractChatContent() {
      try {
        this.messages = [];
        this.extractConversationTitle();

        const chatContainer = this.findChatContainer();
        if (!chatContainer) {
          console.error('[ChatExporter] Chat container not found');
          return false;
        }

        // Use setTimeout to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
        
        this.extractMessages(chatContainer);
        this.removeDuplicates();

        return true;
      } catch (error) {
        console.error('[ChatExporter] Error extracting chat content:', error);
        return false;
      }
    }

    findChatContainer() {
      // DeepSeek main chat area
      const selectors = [
        'main',
        '[role="main"]',
        '.flex-1.overflow-auto',
        'div[class*="flex"][class*="flex-col"]'
      ];

      for (const selector of selectors) {
        const container = document.querySelector(selector);
        if (container) {
          return container;
        }
      }

      return document.body;
    }

    extractMessages(container) {
      for (const message of container.querySelectorAll('.ds-message')) {
        if (this.processedElements.has(message) || this.isThinkingBlock(message)) continue;
        const clone = message.cloneNode(true);
        clone.querySelectorAll('._74c0879, [data-thinking], .thinking, .thought').forEach(el => el.remove());
        const content = this.extractStructuredText(clone);
        if (content.trim()) {
          this.messages.push({
            role: message.classList.contains('d29f3d7d') ? 'user' : 'assistant',
            content,
            htmlContent: this.cleanHTML(clone.innerHTML),
            timestamp: new Date().toISOString()
          });
        }
        this.markAsProcessed(message);
      }
    }

    isThinkingBlock(element) {
      const classList = element.className || '';
      
      // Check for thinking indicators
      if (classList.includes('thinking') || classList.includes('thought')) {
        return true;
      }
      
      return false;
    }

    extractStructuredText(element) {
      if (!element) return '';

      let text = '';

      const processNode = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase();
          const classList = node.classList || [];

          // Skip UI elements
          if (tagName === 'button' || tagName === 'svg' ||
              classList.contains('copy-button') ||
              node.getAttribute('role') === 'button') {
            return;
          }

          // Handle code blocks
          if (tagName === 'pre') {
            const codeText = node.querySelector('code')?.textContent ?? node.textContent;
            if (codeText && codeText.trim()) {
              const lang = node.querySelector('code')?.className?.match(/language-(\w+)/)?.[1] || '';
              text += `\n\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
            }
            return;
          }

          // Handle inline code
          if (tagName === 'code' && node.parentElement?.tagName.toLowerCase() !== 'pre') {
            const codeText = node.textContent;
            if (codeText && codeText.trim()) {
              text += '`' + codeText.trim() + '`';
            }
            return;
          }

          // Skip code inside pre
          if (tagName === 'code' && node.parentElement?.tagName.toLowerCase() === 'pre') {
            return;
          }

          // Handle lists
          if (tagName === 'ul' || tagName === 'ol') {
            text += '\n';
            const items = node.querySelectorAll(':scope > li');
            items.forEach((li, index) => {
              const bullet = tagName === 'ol' ? `${index + 1}. ` : '- ';
              text += bullet + li.textContent.trim() + '\n';
            });
            text += '\n';
            return;
          }

          // Handle headings
          if (tagName.match(/^h[1-6]$/)) {
            const level = parseInt(tagName[1]);
            text += '\n\n' + '#'.repeat(level) + ' ' + node.textContent.trim() + '\n\n';
            return;
          }

          // Handle paragraphs
          if (tagName === 'p') {
            const pText = node.textContent.trim();
            if (pText) {
              text += pText + '\n\n';
            }
            return;
          }

          // Handle line breaks
          if (tagName === 'br') {
            text += '\n';
            return;
          }

          // Recurse for other elements
          node.childNodes.forEach(child => processNode(child));
        } else if (node.nodeType === Node.TEXT_NODE) {
          const textContent = node.textContent;
          if (textContent && textContent.trim()) {
            text += textContent;
          }
        }
      };

      processNode(element);

      // Preserve indentation and blank lines inside code blocks.
      text = text.trim();

      return text;
    }

    cleanHTML(html) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove UI elements
        const toRemove = ['button', '.copy-button', '[role="button"]', 'svg', 'script', 'iframe', 'object', 'embed', 'style', 'link', 'meta'];
        toRemove.forEach(selector => {
          doc.querySelectorAll(selector).forEach(el => el.remove());
        });

        doc.querySelectorAll('*').forEach(el => {
          for (const attribute of [...el.attributes]) {
            if (/^on/i.test(attribute.name) || attribute.name === 'srcdoc' ||
                (/^(href|src|action)$/i.test(attribute.name) && /^\s*(javascript|vbscript|data):/i.test(attribute.value))) {
              el.removeAttribute(attribute.name);
            }
          }
        });
        return doc.body.innerHTML;
      } catch (error) {
        return this.escapeHtml(html);
      }
    }

    markAsProcessed(element) {
      this.processedElements.add(element);
      element.querySelectorAll('*').forEach(child => {
        this.processedElements.add(child);
      });
    }

    removeDuplicates() {
      // DOM identity is already tracked during extraction. Repeated text is valid.
    }

    extractConversationTitle() {
      // Try to get from page title or first message
      const titleEl = document.querySelector('title');
      if (titleEl) {
        const title = titleEl.textContent.replace(' - DeepSeek', '').trim();
        if (title && title !== 'DeepSeek') {
          this.conversationTitle = title;
          return;
        }
      }

      // Try sidebar active chat
      const activeChat = document.querySelector('a._546d736[class*="active"] .c08e6e93');
      if (activeChat) {
        this.conversationTitle = activeChat.textContent.trim();
        return;
      }

      this.conversationTitle = 'DeepSeek Conversation';
    }

    // Export to PDF
    async exportToPDF() {
      const htmlContent = this.formatForPDF();
      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for PDF export.');
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 250);
      };

      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }

    formatForPDF() {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(this.conversationTitle)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #4d6bfe;
    }
    h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 8px; }
    .metadata { color: #666; font-size: 14px; }
    .message {
      margin-bottom: 20px;
      padding: 15px;
      border-radius: 8px;
      page-break-inside: avoid;
    }
    .message.user {
      background-color: #f0f4ff;
      border-left: 4px solid #4d6bfe;
    }
    .message.assistant {
      background-color: #f9f9f9;
      border-left: 4px solid #666666;
    }
    .role {
      font-weight: 600;
      margin-bottom: 8px;
      color: #1a1a1a;
    }
    .content { white-space: pre-wrap; }
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
    }
    code {
      background: #e5e5e5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre code { background: none; padding: 0; color: inherit; }
    @media print {
      pre { background: #f5f5f5; color: #222; }
      body { padding: 20px; }
      .message { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${this.escapeHtml(this.conversationTitle)}</h1>
    <div class="metadata">Exported on ${this.exportDate.toLocaleString()} | ${this.messages.length} messages</div>
  </div>
  ${this.messages.map(msg => `
    <div class="message ${msg.role}">
      <div class="role">${msg.role === 'user' ? 'You' : 'DeepSeek'}</div>
      <div class="content">${msg.htmlContent || this.escapeHtml(msg.content)}</div>
    </div>
  `).join('')}
</body>
</html>`;
    }

    // Export to HTML
    async exportToHTML() {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(this.conversationTitle)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      background: #fafafa;
      color: #1a1a1a;
    }
    .header {
      background: linear-gradient(135deg, #4d6bfe 0%, #3b5bdb 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    h1 { margin: 0 0 10px 0; font-size: 24px; }
    .metadata { opacity: 0.9; font-size: 14px; }
    .message {
      margin-bottom: 20px;
      padding: 20px;
      border-radius: 12px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .message.user { border-left: 4px solid #4d6bfe; }
    .message.assistant { border-left: 4px solid #666666; }
    .role {
      font-weight: 600;
      margin-bottom: 10px;
      color: #1a1a1a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .content { color: #444; white-space: pre-wrap; }
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;
    }
    code {
      background: #e8e8e8;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SF Mono', 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre code { background: none; padding: 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${this.escapeHtml(this.conversationTitle)}</h1>
    <div class="metadata">Exported on ${this.exportDate.toLocaleString()} | ${this.messages.length} messages</div>
  </div>
  ${this.messages.map(msg => `
    <div class="message ${msg.role}">
      <div class="role">
        <span>${msg.role === 'user' ? '👤' : '🤖'}</span>
        <span>${msg.role === 'user' ? 'You' : 'DeepSeek'}</span>
      </div>
      <div class="content">${msg.htmlContent || this.escapeHtml(msg.content)}</div>
    </div>
  `).join('')}
</body>
</html>`;

      this.downloadFile(html, this.generateFilename('html'), 'text/html');
    }

    // Export to Markdown
    async exportToMarkdown() {
      let markdown = `# ${this.conversationTitle}\n\n`;
      markdown += `*Exported on ${this.exportDate.toLocaleString()}*\n\n`;
      markdown += `---\n\n`;

      this.messages.forEach(msg => {
        const role = msg.role === 'user' ? '**You**' : '**DeepSeek**';
        markdown += `### ${role}\n\n`;
        markdown += `${msg.content}\n\n`;
        markdown += `---\n\n`;
      });

      this.downloadFile(markdown, this.generateFilename('md'), 'text/markdown');
    }

    // Export to JSON
    async exportToJSON() {
      const data = {
        title: this.conversationTitle,
        exportDate: this.exportDate.toISOString(),
        source: 'DeepSeek',
        messageCount: this.messages.length,
        messages: this.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || null
        }))
      };

      const json = JSON.stringify(data, null, 2);
      this.downloadFile(json, this.generateFilename('json'), 'application/json');
    }

    // Export to Text
    async exportToText() {
      let text = `${this.conversationTitle}\n`;
      text += `${'='.repeat(this.conversationTitle.length)}\n\n`;
      text += `Exported on ${this.exportDate.toLocaleString()}\n`;
      text += `Total messages: ${this.messages.length}\n\n`;
      text += `${'-'.repeat(50)}\n\n`;

      this.messages.forEach(msg => {
        const role = msg.role === 'user' ? 'You' : 'DeepSeek';
        text += `[${role}]\n`;
        text += `${msg.content}\n`;
        text += `\n${'-'.repeat(50)}\n\n`;
      });

      this.downloadFile(text, this.generateFilename('txt'), 'text/plain');
    }

    generateFilename(extension) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const sanitizedTitle = this.conversationTitle
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, '_')
        .substring(0, 40);
      return `deepseek_${sanitizedTitle}_${timestamp}.${extension}`;
    }

    downloadFile(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    getMessageCount() {
      return this.messages.length;
    }
  }

  // Export globally
  window.ChatExporter = ChatExporter;

})();
