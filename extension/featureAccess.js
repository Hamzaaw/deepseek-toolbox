// Feature access is separate from purchase status. This policy never changes accounts.
// Public extension policy. Hosted services maintain their own matching access rules.
const FeatureAccess = (() => {
  const freeFeatures = Object.freeze([
    'folders', 'dailyExports', 'customPrompts', 'promptChains',
    'bulkDelete', 'dailyEnhancePrompts', 'pinnedMessages'
  ]);
  // Future paid features must be explicitly registered with an entitlement key.
  // includedPlans is an explicit compatibility decision per future feature.
  const premiumFeatures = Object.freeze({});
  function resolve(feature, status = {}, current = 0, paidFeatures = premiumFeatures) {
    const isPremium = ['premium', 'lifetime'].includes(status?.plan);
    if (freeFeatures.includes(feature)) {
      return { feature, allowed: true, current, limit: -1, isPremium, access: 'free' };
    }
    const policy = Object.prototype.hasOwnProperty.call(paidFeatures, feature) && paidFeatures[feature];
    const granted = !!policy && !!policy.entitlement && (
      status?.entitlements?.[policy.entitlement] === true ||
      (Array.isArray(policy.includedPlans) && policy.includedPlans.includes(status?.plan))
    );
    return { feature, allowed: granted, current, limit: granted ? -1 : 0, isPremium,
      access: policy ? 'premium' : 'unavailable' };
  }
  const currentEntitlements = Object.freeze({
    folders_max: -1, custom_prompts_max: -1, prompt_chains_max: -1,
    pinned_messages_max: -1, daily_exports_max: -1, daily_enhance_prompts_max: -1,
    bulk_delete: true, advanced_search: true,
    export_formats: Object.freeze(['pdf', 'html', 'md', 'txt', 'json'])
  });
  return Object.freeze({ freeFeatures, premiumFeatures, resolve, currentEntitlements,
    // Enable only alongside a defined new paid product and accurate checkout UI.
    checkoutEnabled: false });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = FeatureAccess;
