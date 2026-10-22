// Runs only in the background worker. One queue prevents tabs overwriting each other.
// Authentication, premium caches and settings are deliberately not writable here.
let toolboxMutationQueue = Promise.resolve();

function queueToolboxMutation(request) {
  const task = toolboxMutationQueue.then(() => mutateToolboxStorage(request));
  toolboxMutationQueue = task.catch(() => {});
  return task;
}

async function mutateToolboxStorage({ collection, operation, id, value, folderId }) {
  const keys = {
    prompts: 'dsToolboxPrompts', chains: 'dsToolboxPromptChains',
    pins: 'deepseekToolboxPinnedMessages', folders: 'ds_toolbox_folders',
    chatFolders: 'ds_toolbox_chat_folders'
  };
  const key = keys[collection];
  if (!Object.prototype.hasOwnProperty.call(keys, collection)) throw new Error('Unknown collection');
  if (!['add', 'update', 'delete', 'clear', 'assign', 'remove'].includes(operation)) throw new Error('Unknown operation');
  const data = await chrome.storage.local.get([key, 'ds_toolbox_chat_folders', 'ds_toolbox_folders']);
  if (collection === 'chatFolders') {
    const map = data[key] || {};
    if (typeof id !== 'string' || !id || ['__proto__', 'constructor', 'prototype'].includes(id)) throw new Error('Invalid chat ID');
    if (operation === 'assign') {
      if (!(data.ds_toolbox_folders || []).some(folder => folder.id === folderId)) throw new Error('Folder not found');
      map[id] = folderId;
    } else if (operation === 'remove') delete map[id];
    else throw new Error('Invalid chat-folder operation');
    await chrome.storage.local.set({ [key]: map });
    return { items: map, item: map[id] || null };
  }
  const stored = data[key];
  const items = collection === 'prompts' ? (stored?.['my-prompts'] || [])
    : collection === 'pins' ? Object.values(stored || {}) : (stored || []);
  let item = null;
  if (operation === 'add') {
    if (!value || typeof value.id !== 'string' || !value.id || ['__proto__', 'constructor', 'prototype'].includes(value.id)) throw new Error('Invalid item');
    const duplicate = items.find(entry => entry.id === value.id || (collection === 'pins' &&
      entry.messageId === value.messageId && entry.conversationId === value.conversationId));
    if (duplicate) return { items, item: duplicate };
    item = value;
    items.push(item);
  } else if (operation === 'update') {
    const index = items.findIndex(entry => entry.id === id);
    if (index < 0) throw new Error('Item not found');
    item = { ...items[index], ...value, id };
    items[index] = item;
  } else if (operation === 'delete') {
    const index = items.findIndex(entry => entry.id === id);
    if (index >= 0) item = items.splice(index, 1)[0];
  } else if (operation === 'clear' && collection === 'pins') {
    items.length = 0;
  } else throw new Error('Invalid collection operation');
  const patch = { [key]: collection === 'prompts' ? { ...(stored || {}), 'my-prompts': items }
    : collection === 'pins' ? Object.fromEntries(items.map(pin => [pin.id, pin])) : items };
  if (collection === 'folders' && operation === 'delete') {
    patch.ds_toolbox_chat_folders = Object.fromEntries(Object.entries(data.ds_toolbox_chat_folders || {})
      .filter(([, mappedFolderId]) => mappedFolderId !== id));
  }
  await chrome.storage.local.set(patch);
  return { items, item };
}
