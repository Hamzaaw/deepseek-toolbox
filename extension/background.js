importScripts('featureAccess.js', 'storageMutations.js');

const ENHANCE_API_URL = 'https://claude-api.hamzaw.com/api/claude/enhance';
const API_URL = 'https://deepseek-api.hamzaw.com';
const DEBUG = false;

const ALLOWED_ENDPOINTS = [
  '/me',
  '/billing/checkout',
  '/billing/portal',
  '/billing/restore',
  '/api/feedback',
];

chrome.runtime.onInstalled.addListener(() => {
  if (DEBUG) console.log('[DeepSeek Toolbox] Extension installed');
  createSendToDeepSeekContextMenu();
  
  // Set uninstall URL
  if (chrome.runtime.setUninstallURL) {
    chrome.runtime.setUninstallURL('https://docs.google.com/forms/d/e/1FAIpQLSfe5dzebaUS06ZF8D--rc3ZckW9ygzIdtWnFWwEcXEErsLNJA/viewform?usp=header');
  }
});

// Handle extension icon click - open DeepSeek or focus existing tab
chrome.action.onClicked.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://chat.deepseek.com/*' });
    
    if (tabs.length > 0) {
      // DeepSeek already open - focus the first tab
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Open new DeepSeek tab
      await chrome.tabs.create({ url: 'https://chat.deepseek.com' });
    }
  } catch (error) {
    console.error('[DeepSeek Toolbox] Error handling icon click:', error);
  }
});

// Context Menu: Send to DeepSeek
function createSendToDeepSeekContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'sendToDeepSeek',
      title: 'Send to DeepSeek',
      contexts: ['selection']
    });
    if (DEBUG) console.log('[DeepSeek Toolbox] Context menu created');
  });
}

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'sendToDeepSeek' && info.selectionText) {
    const selectedText = info.selectionText;
    
    try {
      const tabs = await chrome.tabs.query({ url: 'https://chat.deepseek.com/*' });
      let deepseekTab;
      
      if (tabs.length > 0) {
        deepseekTab = tabs[0];
        await chrome.tabs.update(deepseekTab.id, { active: true });
      } else {
        deepseekTab = await chrome.tabs.create({ url: 'https://chat.deepseek.com' });
      }
      
      // Wait for page to load if new tab
      if (!tabs.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      chrome.tabs.sendMessage(deepseekTab.id, {
        action: 'insertText',
        text: selectedText
      });
      
    } catch (error) {
      console.error('[DeepSeek Toolbox] Error handling context menu click:', error);
    }
  }
});

// Initialize context menu on startup
createSendToDeepSeekContextMenu();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'STORAGE_MUTATION') {
    queueToolboxMutation(request.data || {}).then(
      data => sendResponse({ success: true, data }),
      error => sendResponse({ success: false, error: error.message })
    );
    return true;
  }
  // Handle API requests
  if (request.type === 'API_REQUEST') {
    handleAPIRequest(request.data, sendResponse);
    return true;
  }
  
  // Handle legacy actions
  switch (request.action) {
    case 'getVersion':
      sendResponse({ version: chrome.runtime.getManifest().version });
      break;
    case 'enhancePrompt':
      handleEnhancePrompt(request.data, sendResponse);
      return true;
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  return true;
});

async function handleAPIRequest(data, sendResponse) {
  try {
    const { method, endpoint, body, headers } = data;
    if (endpoint === '/billing/checkout' && !FeatureAccess.checkoutEnabled) {
      sendResponse({ success: false, error: 'Current features are free; new purchases are unavailable.' });
      return;
    }
    
    // Validate endpoint
    if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
      sendResponse({ success: false, error: 'Endpoint not allowed' });
      return;
    }
    
    let installId = 'unknown';
    try {
      const stored = await chrome.storage.local.get(['ds_install_id']);
      installId = stored?.ds_install_id || 'unknown';
    } catch (e) {
      // Non-fatal
    }
    
    const fetchOptions = {
      method: method || 'GET',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        'X-Install-ID': installId,
        'X-Client-From': 'DeepSeekToolbox',
        ...headers
      }
    };
    
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      sendResponse({
        success: false,
        error: `API error: ${response.status}`,
        details: errorText
      });
      return;
    }
    
    const result = await response.json();
    sendResponse({ success: true, data: result });
    
  } catch (error) {
    console.error('[DeepSeek Toolbox] API request error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleEnhancePrompt(data, sendResponse) {
  if (DEBUG) console.log('[DeepSeek Toolbox] Enhance prompt request received');
  
  try {
    const userText = (data && data.text) || '';
    if (!userText.trim()) {
      sendResponse({ success: false, error: 'Empty text' });
      return;
    }
    
    const response = await fetch(ENHANCE_API_URL, {
      signal: AbortSignal.timeout(25000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-From': 'DeepSeekToolbox'
      },
      body: JSON.stringify({ prompt: userText })
    });
    
    if (!response.ok) {
      throw new Error(`Enhancement failed with status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.improvedPrompt) {
      sendResponse({ success: true, improvedPrompt: result.improvedPrompt });
    } else {
      throw new Error('No improved prompt in response');
    }
  } catch (error) {
    console.error('[DeepSeek Toolbox] Enhance error:', error);
    sendResponse({ success: false, error: error.message || 'Enhancement failed' });
  }
}
