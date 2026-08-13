/** Lets the Notewise web app discover this extension (no manual ID). */
window.__OG_EXTENSION_ID__ = chrome.runtime.id;
window.dispatchEvent(
  new CustomEvent("og-extension-ready", {
    detail: { extensionId: chrome.runtime.id },
  }),
);
