// DeepSeek Toolbox - Pinned Messages Service
// Storage layer for managing pinned/bookmarked messages

const PinnedMessagesService = (function() {
  'use strict';
  
  const STORAGE_KEY = 'deepseekToolboxPinnedMessages';
  let pinnedMessages = {};
  let initialized = false;
  
  async function init() {
    if (initialized) return;
    
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      if (data[STORAGE_KEY]) {
        pinnedMessages = data[STORAGE_KEY];
        log('Loaded', Object.keys(pinnedMessages).length, 'pinned messages');
      }
      initialized = true;
    } catch (error) {
      console.error('[DeepSeek Toolbox] Failed to init PinnedMessagesService:', error);
      initialized = true;
    }
  }
  
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes[STORAGE_KEY]) pinnedMessages = changes[STORAGE_KEY].newValue || {};
  });

  function applyItems(items) {
    pinnedMessages = Object.fromEntries(items.map(pin => [pin.id, pin]));
  }

  function generateId() {
    return 'pin-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
  
  async function createPin(data) {
    if (!data.messageId || !data.conversationId) {
      throw new Error('messageId and conversationId are required');
    }
    
    const existing = await findPin(data.messageId, data.conversationId);
    if (existing) return existing;
    
    const pin = {
      id: generateId(),
      messageId: data.messageId,
      conversationId: data.conversationId,
      messageContent: data.messageContent || '',
      messageType: data.messageType || 'assistant',
      conversationTitle: data.conversationTitle || 'Untitled Chat',
      pinnedAt: new Date().toISOString()
    };
    
    const result = await ToolboxStorage.mutate('pins', 'add', { value: pin });
    applyItems(result.items);
    log('Pin created:', pin.id);
    return result.item;
  }
  
  async function deletePin(pinId) {
    const result = await ToolboxStorage.mutate('pins', 'delete', { id: pinId });
    applyItems(result.items);
    return !!result.item;
  }

  async function clearAllPins() {
    const count = Object.keys(pinnedMessages).length;
    const result = await ToolboxStorage.mutate('pins', 'clear');
    applyItems(result.items);
    return count;
  }

  function getPin(pinId) {
    return pinnedMessages[pinId] || null;
  }
  
  function getAllPins() {
    return Object.values(pinnedMessages).sort((a, b) => 
      new Date(b.pinnedAt) - new Date(a.pinnedAt)
    );
  }
  
  function getPinsByConversation(conversationId) {
    return Object.values(pinnedMessages)
      .filter(pin => pin.conversationId === conversationId)
      .sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt));
  }
  
  async function findPin(messageId, conversationId) {
    return Object.values(pinnedMessages).find(
      pin => pin.messageId === messageId && pin.conversationId === conversationId
    ) || null;
  }
  
  async function isPinned(messageId, conversationId) {
    const pin = await findPin(messageId, conversationId);
    return pin !== null;
  }
  
  function getPinsCount() {
    return Object.keys(pinnedMessages).length;
  }
  
  function searchPins(query) {
    if (!query || query.trim() === '') return getAllPins();
    
    const lowerQuery = query.toLowerCase();
    return Object.values(pinnedMessages)
      .filter(pin => 
        pin.messageContent.toLowerCase().includes(lowerQuery) ||
        pin.conversationTitle.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt));
  }
  
  return {
    init,
    createPin,
    deletePin,
    clearAllPins,
    getPin,
    getAllPins,
    getPinsByConversation,
    findPin,
    isPinned,
    getPinsCount,
    searchPins
  };
})();
