const DS_CONFIG = Object.freeze({
  name: 'DS-Toolbox : Tools for DeepSeek',
  version: '1.0.2',
  debug: false,
  
  // API Configuration
  API_URL: 'https://deepseek-api.hamzaw.com',
  
  // Compatibility aliases for callers; purchase status is not rewritten.
  FREE_LIMITS: Object.freeze(Object.fromEntries(FeatureAccess.freeFeatures.map(key => [key, -1]))),
  PREMIUM_LIMITS: Object.freeze(Object.fromEntries(FeatureAccess.freeFeatures.map(key => [key, -1]))),

  // Storage Keys
  STORAGE_KEYS: Object.freeze({
    INSTALL_ID: 'ds_install_id',
    ENTITLEMENTS_CACHE: 'ds_entitlements_cache',
    SETTINGS: 'ds_toolbox_settings',
  }),
  
  // Cache Configuration
  CACHE: Object.freeze({
    ENTITLEMENTS_TTL_MS: 120000,
    ENTITLEMENTS_SWR_MS: 30000,
    PREMIUM_GRACE_MS: 7 * 24 * 60 * 60 * 1000,
  }),
});

const DS_SELECTORS = Object.freeze({
  // Sidebar
  newChatBtn: '._5a8ac7a',
  chatList: '._77cdc67',
  chatItem: 'a._546d736',
  chatTitle: '.c08e6e93',
  dateGroup: '.f3d18f6a',
  userProfile: '._2afd28d',
  sidebarScroll: '._3586175.ds-scroll-area',
  
  // Input area
  textarea: 'textarea._27c9245',
  sendButton: '._7436101[role="button"]',
  
  // Messages
  message: '.ds-message',
  userMessage: '.d29f3d7d.ds-message',
  aiMessage: '.ds-message:not(.d29f3d7d)'
});

const DS_CLASSES = Object.freeze({
  toolboxBtn: 'ds-toolbox-btn',
  toolboxDropdown: 'ds-toolbox-dropdown',
  toolboxMenuItem: 'ds-toolbox-menu-item',
  toolboxActive: 'ds-toolbox-active'
});

function isDarkMode() {
  return document.body.classList.contains('dark');
}

function log(...args) {
  if (DS_CONFIG.debug) {
    console.log(`[${DS_CONFIG.name}]`, ...args);
  }
}
