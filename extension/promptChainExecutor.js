// DeepSeek Toolbox - Prompt Chain Executor
// Handles automatic execution of prompt chains with response detection

class PromptChainExecutor {
  constructor() {
    this.currentChain = null;
    this.currentStepIndex = 0;
    this.isRunning = false;
    this.detectionInterval = null;
    this.indicatorElement = null;
    this.manualControlsVisible = false;
    
    this.nextStepTimer = null;
    this.runId = 0;
    this.stepId = 0;
    this.startedPath = null;
    this.responseBaseline = '';
  }

  async runChain(chain, variableValues = {}) {
    if (PromptChainExecutor.active?.isRunning) {
      this.showToast('A chain is already running', 'warning');
      return;
    }
    if (!Array.isArray(chain.steps) || !chain.steps.length) return;
    if (DeepSeekDOM.stopVisible()) {
      this.showToast('Wait for the current response before starting a chain', 'warning');
      return;
    }
    this.currentChain = { ...chain, steps: this.replaceVariables(chain.steps, variableValues) };
    this.currentStepIndex = 0;
    this.isRunning = true;
    this.manualControlsVisible = false;
    this.startedPath = location.pathname;
    this.runId++;
    PromptChainExecutor.active = this;
    await this.executeStep(0);
  }

  isActive(runId, stepId) {
    if (!this.isRunning || !this.currentChain || runId !== this.runId || stepId !== this.stepId) return false;
    if (location.pathname !== this.startedPath) {
      // Sending the first message creates a conversation URL.
      if (this.startedPath === '/' && /^\/a\/chat\/s\//.test(location.pathname)) {
        this.startedPath = location.pathname;
      } else {
        this.stopChain();
        return false;
      }
    }
    return true;
  }

  async executeStep(stepIndex) {
    if (!this.isRunning || !this.currentChain) return;
    if (stepIndex >= this.currentChain.steps.length) {
      this.completeChain();
      return;
    }
    clearTimeout(this.nextStepTimer);
    clearInterval(this.detectionInterval);
    this.nextStepTimer = null;
    this.detectionInterval = null;
    const runId = this.runId;
    const stepId = ++this.stepId;
    this.currentStepIndex = stepIndex;
    this.manualControlsVisible = false;
    const stepContent = this.currentChain.steps[stepIndex];

    try {
      const textarea = DeepSeekDOM.textarea();
      if (!textarea) throw new Error('Could not find DeepSeek input field');
      if (DeepSeekDOM.stopVisible()) throw new Error('Wait for DeepSeek to finish responding');
      // Never replace text the user started typing while the chain was waiting.
      if (stepIndex > 0 && textarea.value.trim()) throw new Error('Chain stopped to preserve your draft');
      textarea.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, stepContent);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      this.showChainIndicator(stepIndex + 1, this.currentChain.steps.length);
      this.updateIndicatorStatus('Preparing to send...');

      let sendButton;
      for (let attempt = 0; attempt < 30; attempt++) {
        await this.waitForMs(300);
        if (!this.isActive(runId, stepId)) return;
        if (textarea.value !== stepContent) throw new Error('Chain stopped to preserve your draft');
        sendButton = this.findSendButton();
        if (!DeepSeekDOM.disabled(sendButton)) break;
      }
      if (!sendButton) throw new Error('Could not find send button');
      if (DeepSeekDOM.disabled(sendButton)) throw new Error('Send button is not ready');
      if (!this.isActive(runId, stepId)) return;
      this.responseBaseline = DeepSeekDOM.assistantSignature();
      sendButton.click();
      this.startResponseDetection(runId, stepId);
    } catch (error) {
      if (!this.isActive(runId, stepId)) return;
      console.error('[ChainExecutor] Error executing step:', error);
      this.showToast(error.message || 'Failed to execute step', 'error');
      this.stopChain();
    }
  }

  startResponseDetection(runId = this.runId, stepId = this.stepId) {
    let elapsed = 0;
    let stable = 0;
    let previousSignature = this.responseBaseline;
    let responseStarted = false;
    this.updateIndicatorStatus('Waiting for DeepSeek to respond...');
    this.detectionInterval = setInterval(() => {
      if (!this.isActive(runId, stepId)) return;
      elapsed += 300;
      const signature = DeepSeekDOM.assistantSignature();
      const generating = this.isStopButtonVisible();
      const hasNewResponse = !!signature && signature !== this.responseBaseline;
      responseStarted ||= generating || hasNewResponse;
      if (responseStarted && hasNewResponse && !generating && this.findSendButton()) {
        stable = signature === previousSignature ? stable + 1 : 0;
      } else {
        stable = 0;
      }
      previousSignature = signature;
      if (stable >= 4) {
        clearInterval(this.detectionInterval);
        this.detectionInterval = null;
        this.updateIndicatorStatus('Response complete');
        this.nextStepTimer = setTimeout(() => {
          this.nextStepTimer = null;
          if (this.isActive(runId, stepId)) this.executeStep(this.currentStepIndex + 1);
        }, 500);
        return;
      }
      if (elapsed >= 30000 && !this.manualControlsVisible) {
        this.showManualControls();
        this.manualControlsVisible = true;
      }
      if (elapsed >= 300000) {
        this.showToast('Chain timed out after 5 minutes', 'error');
        this.stopChain();
      }
    }, 300);
  }

  isStopButtonVisible() { return DeepSeekDOM.stopVisible(); }
  findSendButton() { return DeepSeekDOM.sendButton(); }

  showChainIndicator(currentStep, totalSteps) {
    if (this.indicatorElement) {
      this.indicatorElement.remove();
    }

    const colors = typeof getThemeColors === 'function' ? getThemeColors() : {
      background: 'rgba(30, 30, 30, 0.95)',
      text: '#f0f0f0',
      border: 'rgba(255, 255, 255, 0.1)',
      buttonBg: 'rgba(255, 255, 255, 0.1)',
      buttonHover: 'rgba(255, 255, 255, 0.15)'
    };

    const indicator = document.createElement('div');
    indicator.className = 'deepseek-chain-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors.background};
      color: ${colors.text};
      border: 1px solid ${colors.border};
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 10000;
      min-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    indicator.innerHTML = `
      <div style="margin-bottom: 8px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">Running Chain</div>
        <div style="font-size: 12px; opacity: 0.7;">Step ${currentStep} / ${totalSteps}</div>
      </div>
      
      <div class="chain-status" style="font-size: 13px; opacity: 0.8; margin-bottom: 8px;">
        Initializing...
      </div>
      
      <div class="chain-controls" style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="chain-skip-btn" style="
          display: none;
          flex: 1;
          padding: 8px 12px;
          background: ${colors.buttonBg};
          border: 1px solid ${colors.border};
          color: ${colors.text};
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
        ">Skip to Next</button>
        <button class="chain-stop-btn" style="
          flex: 1;
          padding: 8px 12px;
          background: ${colors.buttonBg};
          border: 1px solid ${colors.border};
          color: ${colors.text};
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
        ">Stop Chain</button>
      </div>
    `;

    indicator.querySelector('.chain-skip-btn').onclick = () => this.skipToNext();
    indicator.querySelector('.chain-stop-btn').onclick = () => this.stopChain();

    document.body.appendChild(indicator);
    this.indicatorElement = indicator;
  }

  updateIndicatorStatus(status) {
    if (!this.indicatorElement) return;
    const statusElement = this.indicatorElement.querySelector('.chain-status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  showManualControls() {
    if (!this.indicatorElement) return;
    const controlsElement = this.indicatorElement.querySelector('.chain-controls');
    if (controlsElement) {
      controlsElement.style.display = 'flex';
      controlsElement.querySelector('.chain-skip-btn').style.display = 'block';
      this.updateIndicatorStatus('Taking longer than expected...');
    }
  }

  skipToNext() {
    if (!this.isRunning || !this.currentChain) return;
    
    if (this.isStopButtonVisible()) {
      this.showToast('Wait for the response to finish before skipping', 'warning');
      return;
    }
    clearTimeout(this.nextStepTimer);
    this.nextStepTimer = null;
    log('[ChainExecutor] Skipping to next step');
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    const nextStep = this.currentStepIndex + 1;
    if (nextStep < this.currentChain.steps.length) {
      this.executeStep(nextStep);
    } else {
      this.completeChain();
    }
  }

  stopChain() {
    if (!this.isRunning) return;
    
    log('[ChainExecutor] Stopping chain');
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    this.resetChain();
    this.showToast('Chain stopped', 'info');
  }

  completeChain() {
    if (!this.currentChain) return;
    
    log('[ChainExecutor] Chain completed');
    this.showToast('Chain completed successfully', 'success');
    this.resetChain();
  }

  resetChain() {
    this.runId++;
    this.stepId++;
    clearTimeout(this.nextStepTimer);
    this.nextStepTimer = null;
    if (PromptChainExecutor.active === this) PromptChainExecutor.active = null;
    this.currentChain = null;
    this.currentStepIndex = 0;
    this.isRunning = false;
    this.manualControlsVisible = false;
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    if (this.indicatorElement) {
      this.indicatorElement.remove();
      this.indicatorElement = null;
    }
  }

  replaceVariables(steps, variableValues) {
    return DeepSeekDOM.replaceVariables(steps, variableValues);
  }

  waitForMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showToast(message, type = 'info') {
    const colors = typeof getThemeColors === 'function' ? getThemeColors() : {
      background: 'rgba(30, 30, 30, 0.95)',
      text: '#f0f0f0',
      border: 'rgba(255, 255, 255, 0.1)'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${colors.background};
      color: ${colors.text};
      border: 1px solid ${colors.border};
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.PromptChainExecutor = PromptChainExecutor;
}
