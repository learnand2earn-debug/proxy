document.addEventListener('DOMContentLoaded', () => {
  const proxyModeEl = document.getElementById('proxyMode');
  const detectedEndpointEl = document.getElementById('detectedEndpoint');
  const connStatusBadge = document.getElementById('connStatusBadge');
  const apiUrlInput = document.getElementById('apiUrlInput');
  const pairingTokenInput = document.getElementById('pairingTokenInput');
  const syncBtn = document.getElementById('syncBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const statusMessage = document.getElementById('statusMessage');

  let detectedConfig = null;

  // Restore saved config
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['apiUrl', 'pairingToken'], (res) => {
      if (res.apiUrl) apiUrlInput.value = res.apiUrl;
      if (res.pairingToken) pairingTokenInput.value = res.pairingToken;
    });
  }

  function showStatus(text, isError = false) {
    statusMessage.textContent = text;
    statusMessage.className = `status-msg ${isError ? 'error' : 'success'}`;
    statusMessage.classList.remove('hidden');
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 5000);
  }

  function readChromeProxy() {
    proxyModeEl.textContent = 'Reading Chrome API...';
    detectedEndpointEl.textContent = 'Analyzing...';

    if (typeof chrome !== 'undefined' && chrome.proxy && chrome.proxy.settings) {
      chrome.proxy.settings.get({ incognito: false }, (config) => {
        if (chrome.runtime.lastError) {
          proxyModeEl.textContent = 'Permission Error';
          detectedEndpointEl.textContent = chrome.runtime.lastError.message;
          return;
        }

        const value = config.value || {};
        const mode = value.mode || 'direct';
        proxyModeEl.textContent = mode.toUpperCase();

        let endpointStr = 'None (Direct Connection)';
        let protocol = 'http';

        if (mode === 'fixed_servers' && value.rules) {
          const rules = value.rules;
          const target = rules.singleProxy || rules.proxyForHttp || rules.proxyForHttps;
          if (target) {
            protocol = (target.scheme || 'http').toLowerCase();
            endpointStr = `${protocol}://${target.host}:${target.port}`;
          }
        } else if (mode === 'system') {
          endpointStr = 'System Managed (OS Settings)';
        } else if (mode === 'pac_script') {
          endpointStr = value.pacScript ? `PAC: ${value.pacScript.url || 'Inline'}` : 'PAC Script';
        }

        detectedEndpointEl.textContent = endpointStr;
        detectedConfig = {
          mode,
          endpoint: endpointStr.startsWith('http') || endpointStr.startsWith('socks') ? endpointStr : null,
          protocol,
          rawRules: value.rules
        };
      });
    } else {
      // Development fallback when opened directly in browser tab
      proxyModeEl.textContent = 'FIXED_SERVERS (Dev)';
      detectedEndpointEl.textContent = 'socks5://198.51.100.150:8080';
      detectedConfig = {
        mode: 'fixed_servers',
        endpoint: 'socks5://198.51.100.150:8080',
        protocol: 'socks5',
        device: 'Workstation Chrome'
      };
    }
  }

  // Sync to Platform
  async function syncToPlatform() {
    const apiUrl = apiUrlInput.value.trim().replace(/\/$/, '');
    const token = pairingTokenInput.value.trim();

    if (!apiUrl) {
      showStatus('Please enter platform API URL', true);
      return;
    }

    if (!token) {
      showStatus('Please enter pairing secret token', true);
      return;
    }

    if (!detectedConfig || !detectedConfig.endpoint) {
      showStatus('No proxy server configured in Chrome to sync (Direct/System).', true);
      return;
    }

    // Save tokens in storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ apiUrl, pairingToken: token });
    }

    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';

    try {
      const response = await fetch(`${apiUrl}/api/chrome/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          endpoint: detectedConfig.endpoint,
          protocol: detectedConfig.protocol,
          mode: detectedConfig.mode,
          device_name: 'Chrome on User Workstation',
          timestamp: new Date().toISOString()
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || `HTTP ${response.status}`);
      }

      connStatusBadge.textContent = 'Connected';
      connStatusBadge.classList.add('connected');
      showStatus(`Sync successful! ${resData.message || 'Proxy imported to inventory.'}`);
    } catch (err) {
      showStatus(`Sync failed: ${err.message}`, true);
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = 'Sync Proxy to Platform';
    }
  }

  refreshBtn.addEventListener('click', readChromeProxy);
  syncBtn.addEventListener('click', syncToPlatform);

  // Initialize detection
  readChromeProxy();
});
