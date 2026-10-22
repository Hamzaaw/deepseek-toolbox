// DeepSeek Toolbox - Prompt Chain Service
// Storage and CRUD operations for prompt chains

const PromptChainService = (function() {
  'use strict';

  const STORAGE_KEY = 'dsToolboxPromptChains';
  let chains = [];
  let initialized = false;

  async function init() {
    if (initialized) return;
    
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      if (data[STORAGE_KEY]) {
        chains = data[STORAGE_KEY];
      }
      initialized = true;
      log('[PromptChainService] Initialized with', chains.length, 'chains');
    } catch (error) {
      console.error('[PromptChainService] Init error:', error);
      initialized = true;
    }
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes[STORAGE_KEY]) chains = changes[STORAGE_KEY].newValue || [];
  });

  function generateId() {
    return 'chain-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  function extractVariables(steps) {
    const pattern = /\{\{([^}]+)\}\}/g;
    const variables = new Set();
    
    for (const step of steps) {
      let match;
      while ((match = pattern.exec(step)) !== null) {
        variables.add(match[1].trim());
      }
    }
    
    return Array.from(variables);
  }

  function validateChain(chainData) {
    const errors = [];
    
    if (!chainData.title || chainData.title.trim().length === 0) {
      errors.push('Chain title is required');
    }
    
    if (chainData.title && chainData.title.length > 100) {
      errors.push('Chain title must be 100 characters or less');
    }
    
    if (!chainData.steps || !Array.isArray(chainData.steps) || chainData.steps.length < 2) {
      errors.push('Chain must have at least 2 steps');
    }
    
    if (chainData.steps && chainData.steps.length > 10) {
      errors.push('Chain can have maximum 10 steps');
    }
    
    if (chainData.steps) {
      for (let i = 0; i < chainData.steps.length; i++) {
        const step = chainData.steps[i];
        if (!step || step.trim().length === 0) {
          errors.push(`Step ${i + 1} cannot be empty`);
        }
        if (step && step.length > 6000) {
          errors.push(`Step ${i + 1} exceeds 6000 character limit`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  async function createChain(chainData) {
    const validation = validateChain(chainData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    
    const id = generateId();
    const variables = extractVariables(chainData.steps);
    
    const chain = {
      id,
      title: chainData.title.trim(),
      description: chainData.description?.trim() || '',
      steps: chainData.steps.map(s => s.trim()),
      variables,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await ToolboxStorage.mutate('chains', 'add', { value: chain });
    chains = result.items;
    
    return chain;
  }

  async function updateChain(id, updates) {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const chain = (data[STORAGE_KEY] || []).find(item => item.id === id);
    if (!chain) throw new Error('Chain not found');
    const validation = validateChain({ ...chain, ...updates });
    if (!validation.valid) throw new Error(validation.errors.join(', '));
    if (updates.steps) updates.variables = extractVariables(updates.steps);
    const result = await ToolboxStorage.mutate('chains', 'update', {
      id, value: { ...updates, updatedAt: new Date().toISOString() }
    });
    chains = result.items;
    return result.item;
  }

  async function deleteChain(id) {
    const result = await ToolboxStorage.mutate('chains', 'delete', { id });
    chains = result.items;
    return true;
  }

  function getChainById(id) {
    return chains.find(c => c.id === id);
  }

  function getAllChains() {
    return chains;
  }

  function getChainCount() {
    return chains.length;
  }

  function searchChains(query) {
    const searchTerm = query.toLowerCase();
    return chains.filter(chain => {
      return chain.title.toLowerCase().includes(searchTerm) ||
             (chain.description && chain.description.toLowerCase().includes(searchTerm)) ||
             chain.steps.some(step => step.toLowerCase().includes(searchTerm));
    });
  }

  function replaceVariables(steps, variableValues) {
    return DeepSeekDOM.replaceVariables(steps, variableValues);
  }

  return {
    init,
    createChain,
    updateChain,
    deleteChain,
    getChainById,
    getAllChains,
    getChainCount,
    searchChains,
    replaceVariables,
    extractVariables
  };
})();
