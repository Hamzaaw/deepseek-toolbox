const DeepSeekDOM = Object.freeze({
  textarea() {
    return document.querySelector('textarea._27c9245, textarea[placeholder="Message DeepSeek"]');
  },
  controls() {
    const container = document.querySelector('.bf38813a');
    return container ? [...container.querySelectorAll('button, [role="button"]')]
      .filter(button => button.getClientRects().length && getComputedStyle(button).visibility !== 'hidden') : [];
  },
  isStop(button) {
    const label = button.getAttribute('aria-label') || button.title || '';
    return /stop (generating|generation|response)/i.test(label) ||
      !!button.querySelector('svg rect') || [...button.querySelectorAll('svg path')]
        .some(path => /^M2(?:\s|,)/.test(path.getAttribute('d') || ''));
  },
  sendButton() {
    return this.controls().find(button => !this.isStop(button) && (
      /^(send|send message)$/i.test(button.getAttribute('aria-label') || button.title || '') ||
      [...button.querySelectorAll('svg path')].some(path =>
        (path.getAttribute('d') || '').startsWith('M8.3125'))
    )) || null;
  },
  stopVisible() { return this.controls().some(button => this.isStop(button)); },
  disabled(button) {
    return !button || button.disabled || button.getAttribute('aria-disabled') === 'true' ||
      button.classList.contains('ds-button--disabled');
  },
  assistantSignature() {
    return [...document.querySelectorAll('.ds-message:not(.d29f3d7d)')]
      .map(message => [message.closest('[data-virtual-list-item-key]')?.getAttribute('data-virtual-list-item-key') || '', message.textContent.trim()])
      .filter(([, text]) => text).map(parts => parts.join(':')).join('\n');
  },
  replaceVariables(steps, values) {
    return steps.map(step => step.replace(/\{\{\s*([^{}]+?)\s*\}\}/g,
      (match, name) => Object.prototype.hasOwnProperty.call(values, name.trim()) ? String(values[name.trim()]) : match));
  }
});
