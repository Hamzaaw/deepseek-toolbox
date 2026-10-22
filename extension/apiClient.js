// DeepSeek Toolbox - API Client
// Handles API communication, caching, and feature limit checking

class DeepSeekToolboxAPI {
  constructor() {
    this.baseURL = DS_CONFIG.API_URL;
    this.meCache = null;
    this.meCacheTimestamp = 0;
    this.inflightRequests = new Map();
    this.installId = null;
    
    this.initPromise = this.init();
  }
  
  async init() {
    try {
      const stored = await chrome.storage.local.get(DS_CONFIG.STORAGE_KEYS.INSTALL_ID);
      this.installId = stored[DS_CONFIG.STORAGE_KEYS.INSTALL_ID];
      
      if (!this.installId) {
        this.installId = this.generateUUID();
        await chrome.storage.local.set({
          [DS_CONFIG.STORAGE_KEYS.INSTALL_ID]: this.installId
        });
      }
      
      await this.loadCachedEntitlements();
      log('API Client initialized with ID:', this.installId);
    } catch (error) {
      console.error('[DeepSeek Toolbox] API init error:', error);
    }
  }
  
  generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  async loadCachedEntitlements() {
    try {
      const cached = await chrome.storage.local.get(DS_CONFIG.STORAGE_KEYS.ENTITLEMENTS_CACHE);
      const cacheData = cached[DS_CONFIG.STORAGE_KEYS.ENTITLEMENTS_CACHE];
      
      if (cacheData?.data && cacheData?.ts) {
        this.meCache = cacheData.data;
        this.meCacheTimestamp = cacheData.ts;
      }
    } catch (error) {
      console.error('[DeepSeek Toolbox] Failed to load cached entitlements:', error);
    }
  }
  
  async saveCachedEntitlements(data) {
    try {
      await chrome.storage.local.set({
        [DS_CONFIG.STORAGE_KEYS.ENTITLEMENTS_CACHE]: {
          data: data,
          ts: Date.now()
        }
      });
    } catch (error) {
      console.error('[DeepSeek Toolbox] Failed to save entitlements cache:', error);
    }
  }
  
  async sendMessageSafely(message) {
    if (!chrome?.runtime?.id) {
      return { success: false, error: 'Extension context invalidated' };
    }
    
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  }
  
  async getMeStatus({ force = false, allowSWR = true } = {}) {
    await this.initPromise;
    
    const now = Date.now();
    const age = now - this.meCacheTimestamp;
    const cacheTTL = DS_CONFIG.CACHE.ENTITLEMENTS_TTL_MS;
    const swrThreshold = DS_CONFIG.CACHE.ENTITLEMENTS_SWR_MS;
    
    if (!force && this.meCache && age < cacheTTL) {
      if (allowSWR && age > swrThreshold) {
        this.backgroundRefreshEntitlements();
      }
      return this.meCache;
    }
    
    const inflightKey = 'getMeStatus';
    if (this.inflightRequests.has(inflightKey)) {
      return this.inflightRequests.get(inflightKey);
    }
    
    const requestPromise = this.fetchMeStatus();
    this.inflightRequests.set(inflightKey, requestPromise);
    
    try {
      const result = await requestPromise;
      this.inflightRequests.delete(inflightKey);
      return result;
    } catch (error) {
      this.inflightRequests.delete(inflightKey);
      throw error;
    }
  }
  
  async fetchMeStatus() {
    try {
      const response = await this.sendMessageSafely({
        type: 'API_REQUEST',
        data: {
          method: 'GET',
          endpoint: '/me',
          headers: {
            'X-Install-ID': this.installId,
            'X-Client-From': 'DeepSeekToolbox'
          }
        }
      });
      
      if (response?.success && ['free', 'premium', 'lifetime'].includes(response?.data?.plan)) {
        this.meCache = response.data;
        this.meCacheTimestamp = Date.now();
        await this.saveCachedEntitlements(response.data);
        return response.data;
      } else {
        return this.getCachedFallback();
      }
    } catch (error) {
      console.error('[DeepSeek Toolbox] getMeStatus error:', error);
      
      return this.getCachedFallback();
    }
  }

  getCachedFallback() {
    if (this.meCache && Date.now() - this.meCacheTimestamp < DS_CONFIG.CACHE.PREMIUM_GRACE_MS) {
      return this.meCache;
    }
    return this.getSafeDefaults();
  }

  async backgroundRefreshEntitlements() {
    try {
      await this.getMeStatus({ force: true, allowSWR: false });
    } catch (error) {
      // Silent fail for background refresh
    }
  }
  
  getSafeDefaults() {
    return {
      plan: 'free',
      entitlements: { ...FeatureAccess.currentEntitlements },
      usage: {
        folders: 0,
        custom_prompts: 0,
        daily_exports: 0,
        daily_enhance_prompts: 0,
        pinned_messages: 0
      },
      user: null
    };
  }
  
  async checkFeatureLimit(feature) {
    await this.initPromise;
    // Current features work offline, without fetching or replacing purchase data.
    const usage = await this.getFeatureUsage(feature);
    if (FeatureAccess.freeFeatures.includes(feature)) {
      return FeatureAccess.resolve(feature, this.meCache, usage);
    }
    if (!Object.prototype.hasOwnProperty.call(FeatureAccess.premiumFeatures, feature)) {
      return FeatureAccess.resolve(feature, this.meCache, usage);
    }
    try {
      return FeatureAccess.resolve(feature, await this.getMeStatus(), usage);
    } catch (error) {
      return FeatureAccess.resolve(feature, this.getCachedFallback(), usage);
    }
  }

  async getFeatureUsage(feature) {
    try {
      switch (feature) {
        case 'folders':
          return this.countFolders();
        case 'customPrompts':
          return this.countCustomPrompts();
        case 'promptChains':
          return this.countPromptChains();
        case 'pinnedMessages':
          return this.countPinnedMessages();
        case 'dailyExports':
          return this.getDailyUsage('exports');
        case 'dailyEnhancePrompts':
          return this.getDailyUsage('enhancePrompts');
        case 'bulkDelete':
          return 0;
        default:
          return 0;
      }
    } catch (error) {
      console.error('[DeepSeek Toolbox] getFeatureUsage error:', error);
      return 0;
    }
  }
  
  async countFolders() {
    const data = await chrome.storage.local.get('ds_toolbox_folders');
    return (data.ds_toolbox_folders || []).length;
  }

  async countCustomPrompts() {
    const data = await chrome.storage.local.get('dsToolboxPrompts');
    return data.dsToolboxPrompts?.['my-prompts']?.length || 0;
  }

  async countPromptChains() {
    const data = await chrome.storage.local.get('dsToolboxPromptChains');
    return (data.dsToolboxPromptChains || []).length;
  }

  async countPinnedMessages() {
    const data = await chrome.storage.local.get('deepseekToolboxPinnedMessages');
    return Object.keys(data.deepseekToolboxPinnedMessages || {}).length;
  }

  getDailyUsage(feature) {
    try {
      const today = new Date().toDateString();
      const storageKey = `ds_daily_usage_${feature}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) return 0;
      
      const data = JSON.parse(stored);
      return data.date === today ? (data.count || 0) : 0;
    } catch (error) {
      return 0;
    }
  }
  
  incrementDailyUsage(feature) {
    try {
      const today = new Date().toDateString();
      const storageKey = `ds_daily_usage_${feature}`;
      const stored = localStorage.getItem(storageKey);
      
      let data = { date: today, count: 0 };
      
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          data = parsed;
        }
      }
      
      data.count += 1;
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      return data.count;
    } catch (error) {
      return 0;
    }
  }
  
  async createCheckout(plan = 'monthly', email = null) {
    if (!FeatureAccess.checkoutEnabled) throw new Error('Current features are free; new purchases are unavailable.');
    await this.initPromise;
    try {
      const response = await this.sendMessageSafely({
        type: 'API_REQUEST',
        data: {
          method: 'POST',
          endpoint: '/billing/checkout',
          body: {
            install_id: this.installId,
            plan: plan,
            email: email
          },
          headers: {
            'X-Install-ID': this.installId,
            'X-Client-From': 'DeepSeekToolbox'
          }
        }
      });
      
      if (response?.success && response?.data?.checkout_url) {
        return response.data;
      } else {
        throw new Error(response?.error || 'Failed to create checkout');
      }
    } catch (error) {
      console.error('[DeepSeek Toolbox] createCheckout error:', error);
      throw error;
    }
  }
  
  async getCustomerPortal() {
    await this.initPromise;
    try {
      const response = await this.sendMessageSafely({
        type: 'API_REQUEST',
        data: {
          method: 'GET',
          endpoint: '/billing/portal',
          headers: {
            'X-Install-ID': this.installId,
            'X-Client-From': 'DeepSeekToolbox'
          }
        }
      });
      
      if (response?.success && response?.data?.portal_url) {
        return response.data.portal_url;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  async restorePremium(email) {
    await this.initPromise;
    try {
      const response = await this.sendMessageSafely({
        type: 'API_REQUEST',
        data: {
          method: 'POST',
          endpoint: '/billing/restore',
          body: {
            email: email,
            install_id: this.installId
          },
          headers: {
            'X-Install-ID': this.installId,
            'X-Client-From': 'DeepSeekToolbox'
          }
        }
      });
      
      if (response?.success) {
        this.meCache = null;
        this.meCacheTimestamp = 0;
        return await this.getMeStatus({ force: true });
      }
      throw new Error(response?.error || 'Failed to restore premium');
    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
const apiClient = new DeepSeekToolboxAPI();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.apiClient = apiClient;
}
