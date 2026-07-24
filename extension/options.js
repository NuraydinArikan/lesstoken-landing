// Options Page Controller
const providerSelect = document.getElementById('provider');
const openaiKeyInput = document.getElementById('openai-key');
const claudeKeyInput = document.getElementById('claude-key');
const geminiKeyInput = document.getElementById('gemini-key');
const ollamaUrlInput = document.getElementById('ollama-url');
const saveBtn = document.getElementById('save');
const resetBtn = document.getElementById('reset');
const statusDiv = document.getElementById('status');

// Load saved settings
window.addEventListener('load', () => {
  chrome.storage.local.get([
    'provider',
    'openai-key',
    'claude-key',
    'gemini-key',
    'ollama-url'
  ], (result) => {
    if (result.provider) providerSelect.value = result.provider;
    if (result['openai-key']) openaiKeyInput.value = result['openai-key'];
    if (result['claude-key']) claudeKeyInput.value = result['claude-key'];
    if (result['gemini-key']) geminiKeyInput.value = result['gemini-key'];
    if (result['ollama-url']) ollamaUrlInput.value = result['ollama-url'];
  });
});

// Save settings
saveBtn.addEventListener('click', () => {
  const settings = {
    provider: providerSelect.value,
    'openai-key': openaiKeyInput.value,
    'claude-key': claudeKeyInput.value,
    'gemini-key': geminiKeyInput.value,
    'ollama-url': ollamaUrlInput.value
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
      ollamaUrlInput.value = 'http://localhost:11434';
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
