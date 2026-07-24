// Popup UI Controller
const inputText = document.getElementById('input-text');
const providerSelect = document.getElementById('provider');
const styleSelect = document.getElementById('style');
const optimizeBtn = document.getElementById('optimizeBtn');
const clearBtn = document.getElementById('clearBtn');
const statusContainer = document.getElementById('status-container');
const statusDiv = document.getElementById('status');
const settingsBtn = document.getElementById('settingsBtn');

// Load saved settings
chrome.storage.local.get(['provider', 'optimization-style'], (result) => {
  if (result.provider) {
    providerSelect.value = result.provider;
  }
  if (result['optimization-style']) {
    styleSelect.value = result['optimization-style'];
  }
});

// Save provider selection
providerSelect.addEventListener('change', () => {
  chrome.storage.local.set({ provider: providerSelect.value });
});

// Save optimization style
styleSelect.addEventListener('change', () => {
  chrome.storage.local.set({ 'optimization-style': styleSelect.value });
});

// Clear button
clearBtn.addEventListener('click', () => {
  inputText.value = '';
  statusContainer.style.display = 'none';
});

// Optimize button
optimizeBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  if (!text) {
    showStatus('Please enter text to optimize', 'error');
    return;
  }

  showStatus('Processing...', 'loading');
  optimizeBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'optimize',
      text: text,
      provider: providerSelect.value
    });

    if (response.success) {
      inputText.value = response.result;
      showStatus(`✓ Optimized! Reduced by ${response.stats.reduction}%`, 'success');
    } else {
      showStatus(`Error: ${response.error}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    optimizeBtn.disabled = false;
  }
});

// Settings button
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// History button
const historyBtn = document.getElementById('historyBtn');
historyBtn.addEventListener('click', () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('history.html')
  });
});

// Helper: Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusContainer.style.display = 'block';
}

// Load text from clipboard on popup open
window.addEventListener('load', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text && !inputText.value) {
      inputText.value = text;
    }
  } catch (error) {
    console.log('Clipboard read permission denied or empty');
  }
});
