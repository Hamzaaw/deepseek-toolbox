// DeepSeek Toolbox - Prompt Library Service
// Storage and CRUD operations for prompt templates

const PromptLibraryService = (function() {
  'use strict';

  const STORAGE_KEY = 'dsToolboxPrompts';

  const categories = {
    'my-prompts': { 
      name: 'My Prompts', 
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L13.87 8.13L20 10L13.87 11.87L12 18L10.13 11.87L4 10L10.13 8.13L12 2Z"/></svg>',
      order: 0 
    },
    'development': { 
      name: 'Development', 
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 18L22 12L16 6M8 6L2 12L8 18"/></svg>',
      order: 1 
    },
    'writing': { 
      name: 'Writing', 
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
      order: 2 
    },
    'business': { 
      name: 'Business', 
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
      order: 3 
    },
    'academic': { 
      name: 'Academic', 
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      order: 4 
    }
  };

  let prompts = {
    'my-prompts': [],
    'development': [],
    'writing': [],
    'business': [],
    'academic': []
  };

  let initialized = false;

  async function init() {
    if (initialized) return;
    
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      
      if (data[STORAGE_KEY] && data[STORAGE_KEY]['my-prompts']) {
        prompts['my-prompts'] = data[STORAGE_KEY]['my-prompts'];
      }

      // Load default prompts
      if (typeof DEFAULT_PROMPTS !== 'undefined') {
        for (const category in DEFAULT_PROMPTS) {
          if (prompts[category] && category !== 'my-prompts') {
            prompts[category] = DEFAULT_PROMPTS[category];
          }
        }
      }

      initialized = true;
      log('[PromptLibraryService] Initialized with', prompts['my-prompts'].length, 'custom prompts');
    } catch (error) {
      console.error('[PromptLibraryService] Init error:', error);
      initialized = true;
    }
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes[STORAGE_KEY]) {
      prompts['my-prompts'] = changes[STORAGE_KEY].newValue?.['my-prompts'] || [];
    }
  });

  function generateId() {
    return 'prompt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  function extractVariables(content) {
    const pattern = /\{([^}]+)\}/g;
    const variables = [];
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  async function addPrompt(promptData) {
    const id = generateId();
    const variables = extractVariables(promptData.content);
    
    const prompt = {
      id,
      title: promptData.title,
      description: promptData.description || '',
      content: promptData.content,
      variables: variables,
      category: 'my-prompts',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await ToolboxStorage.mutate('prompts', 'add', { value: prompt });
    prompts['my-prompts'] = result.items;
    
    return prompt;
  }

  async function updatePrompt(id, updates) {
    if (updates.content !== undefined) updates.variables = extractVariables(updates.content);
    const result = await ToolboxStorage.mutate('prompts', 'update', {
      id, value: { ...updates, updatedAt: new Date().toISOString() }
    });
    prompts['my-prompts'] = result.items;
    return result.item;
  }

  async function deletePrompt(id) {
    const result = await ToolboxStorage.mutate('prompts', 'delete', { id });
    prompts['my-prompts'] = result.items;
    return true;
  }

  function getPromptsByCategory(categoryId) {
    return prompts[categoryId] || [];
  }

  function searchPrompts(query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    for (const category in prompts) {
      const matches = prompts[category].filter(prompt => {
        return prompt.title.toLowerCase().includes(searchTerm) ||
               (prompt.description && prompt.description.toLowerCase().includes(searchTerm)) ||
               prompt.content.toLowerCase().includes(searchTerm);
      });
      
      results.push(...matches.map(p => ({ ...p, category })));
    }
    
    return results;
  }

  function getPromptById(id) {
    for (const category in prompts) {
      const prompt = prompts[category].find(p => p.id === id);
      if (prompt) return { ...prompt, category };
    }
    return null;
  }

  function getCategories() {
    return categories;
  }

  function getCategoryCount(categoryId) {
    return (prompts[categoryId] || []).length;
  }

  return {
    init,
    addPrompt,
    updatePrompt,
    deletePrompt,
    getPromptsByCategory,
    searchPrompts,
    getPromptById,
    getCategories,
    getCategoryCount
  };
})();
