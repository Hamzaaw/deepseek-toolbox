const FolderService = (function() {
  'use strict';
  
  const STORAGE_KEY = 'ds_toolbox_folders';
  const CHAT_FOLDER_MAP_KEY = 'ds_toolbox_chat_folders';
  
  function createFolder(name) {
    return {
      id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: name,
      createdAt: Date.now()
    };
  }
  
  async function getFolders() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return data[STORAGE_KEY] || [];
  }

  async function addFolder(name) {
    return (await ToolboxStorage.mutate('folders', 'add', { value: createFolder(name) })).item;
  }

  async function updateFolder(folderId, updates) {
    return (await ToolboxStorage.mutate('folders', 'update', { id: folderId, value: updates })).item;
  }

  async function deleteFolder(folderId) {
    await ToolboxStorage.mutate('folders', 'delete', { id: folderId });
  }

  async function getChatFolderMap() {
    const data = await chrome.storage.local.get(CHAT_FOLDER_MAP_KEY);
    return data[CHAT_FOLDER_MAP_KEY] || {};
  }

  async function addChatToFolder(chatId, folderId) {
    await ToolboxStorage.mutate('chatFolders', 'assign', { id: chatId, folderId });
  }

  async function removeChatFromFolder(chatId) {
    await ToolboxStorage.mutate('chatFolders', 'remove', { id: chatId });
  }

  async function getFolderForChat(chatId) {
    const map = await getChatFolderMap();
    return map[chatId] || null;
  }
  
  async function getChatsInFolder(folderId) {
    const map = await getChatFolderMap();
    return Object.entries(map)
      .filter(([_, id]) => id === folderId)
      .map(([chatId]) => chatId);
  }
  
  function extractChatId(urlOrHref) {
    const match = urlOrHref.match(/\/a\/chat\/s\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  }
  
  return {
    getFolders,
    addFolder,
    updateFolder,
    deleteFolder,
    getChatFolderMap,
    addChatToFolder,
    removeChatFromFolder,
    getFolderForChat,
    getChatsInFolder,
    extractChatId
  };
})();
