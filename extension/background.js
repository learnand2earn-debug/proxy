// AI Proxy Intelligence Companion - Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('[AI Proxy Companion] Extension initialized.');
});

// Listener for proxy configuration state changes
if (chrome.proxy && chrome.proxy.settings) {
  chrome.proxy.settings.onChange.addListener((details) => {
    console.log('[AI Proxy Companion] Chrome proxy settings modified:', details);
  });
}
