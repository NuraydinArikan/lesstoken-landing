// History Page Controller
const historyList = document.getElementById('history-list');
const clearBtn = document.getElementById('clear-history');
const totalCount = document.getElementById('total-count');
const avgReduction = document.getElementById('avg-reduction');
const totalInput = document.getElementById('total-input');
const totalSaved = document.getElementById('total-saved');

// Load and display history
function loadHistory() {
  chrome.storage.local.get('history', (result) => {
    const history = result.history || [];

    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div>No optimizations yet. Start optimizing text to see results here!</div>
        </div>
      `;
      updateStats([]);
      return;
    }

    // Display in reverse order (newest first)
    historyList.innerHTML = history
      .reverse()
      .map((item, index) => `
        <div class="history-item">
          <div class="history-content">
            <div class="history-meta">
              <span class="history-meta-item">
                ${new Date(item.timestamp).toLocaleDateString()} ${new Date(item.timestamp).toLocaleTimeString()}
              </span>
              <span class="history-badge">${item.provider}</span>
              <span class="history-badge">${item.style}</span>
            </div>
            <div class="history-text-preview">${escapeHtml(item.input)}</div>
          </div>
          <div class="history-reduction">
            <div class="reduction-percent">${item.reduction}%</div>
            <div class="reduction-label">reduction</div>
          </div>
        </div>
      `)
      .join('');

    updateStats(history);
  });
}

// Update statistics
function updateStats(history) {
  if (history.length === 0) {
    totalCount.textContent = '0';
    avgReduction.textContent = '0%';
    totalInput.textContent = '0';
    totalSaved.textContent = '0';
    return;
  }

  const count = history.length;
  const avgRed = Math.round(
    history.reduce((sum, item) => sum + item.reduction, 0) / count
  );

  const totalInputTokens = history.reduce((sum, item) => sum + (item.inputTokens || 0), 0);
  const totalOutputTokens = history.reduce((sum, item) => sum + (item.outputTokens || 0), 0);
  const savedTokens = totalInputTokens - totalOutputTokens;

  totalCount.textContent = count.toString();
  avgReduction.textContent = `${avgRed}%`;
  totalInput.textContent = totalInputTokens.toLocaleString();
  totalSaved.textContent = savedTokens.toLocaleString();
}

// Clear history
clearBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
    chrome.storage.local.set({ history: [] }, () => {
      loadHistory();
    });
  }
});

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load history on page load
window.addEventListener('load', loadHistory);

// Reload history every 5 seconds to show real-time updates
setInterval(loadHistory, 5000);
