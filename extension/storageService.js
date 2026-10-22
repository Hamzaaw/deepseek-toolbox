const ToolboxStorage = Object.freeze({
  async mutate(collection, operation, details = {}) {
    const response = await chrome.runtime.sendMessage({
      type: 'STORAGE_MUTATION', data: { ...details, collection, operation }
    });
    if (!response?.success) throw new Error(response?.error || 'Could not save changes');
    return response.data;
  }
});
