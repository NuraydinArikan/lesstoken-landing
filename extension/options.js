// Options Page Controller
const providerSelect = document.getElementById('provider');
const openaiKeyInput = document.getElementById('openai-key');
const claudeKeyInput = document.getElementById('claude-key');
const geminiKeyInput = document.getElementById('gemini-key');
const saveBtn = document.getElementById('save');
const resetBtn = document.getElementById('reset');
const statusDiv = document.getElementById('status');

// Load saved settings
window.addEventListener('load', () => {
  chrome.storage.local.get([
    'provider',
    'openai-key',
    'claude-key',
    'gemini-key'
  ], (result) => {
    // Ollama was dropped in 1.0.1. Anyone still holding it as their stored
    // provider would otherwise land on a <select> with no matching option,
    // which silently blanks the dropdown and saves an empty provider.
    const provider = result.provider === 'ollama' ? 'openai' : result.provider;
    if (provider) providerSelect.value = provider;
    if (result['openai-key']) openaiKeyInput.value = result['openai-key'];
    if (result['claude-key']) claudeKeyInput.value = result['claude-key'];
    if (result['gemini-key']) geminiKeyInput.value = result['gemini-key'];
  });
});

// Save settings
saveBtn.addEventListener('click', () => {
  const settings = {
    provider: providerSelect.value,
    'openai-key': openaiKeyInput.value,
    'claude-key': claudeKeyInput.value,
    'gemini-key': geminiKeyInput.value
  };

  chrome.storage.local.set(settings, () => {
    showStatus('✓ Settings saved successfully!', 'success');
    setTimeout(() => {
      statusDiv.innerHTML = '';
    }, 3000);
  });
});

// Reset to defaults
resetBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset all settings?')) {
    chrome.storage.local.clear(() => {
      openaiKeyInput.value = '';
      claudeKeyInput.value = '';
      geminiKeyInput.value = '';
      providerSelect.value = 'openai';
      showStatus('Settings reset to defaults', 'success');
      setTimeout(() => {
        statusDiv.innerHTML = '';
      }, 3000);
    });
  }
});

// Helper: Show status message
function showStatus(message, type) {
  statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
}
