// Reserved UI entry point for future paid features. No current feature has a paywall.
class PaywallModal {
  constructor() {
    this.modal = null;
    this.isVisible = false;
    this.currentFeature = null;
  }
  show(feature = null) {
    // Future products need their own accurate offer UI before enabling checkout.
    // Never advertise the now-free tools, old prices or obsolete purchase terms.
    return false;
  }
  hide() {
    this.modal?.remove();
    this.modal = null;
    this.isVisible = false;
  }
}
const paywallModal = new PaywallModal();
if (typeof window !== 'undefined') window.paywallModal = paywallModal;
