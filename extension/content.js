// Content Script - Injected into webpage
console.log('[Less Token] Content script loaded');

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    // Extract all text from page
    const text = document.body.innerText;
    sendResponse({ content: text });
  } else if (request.action === 'highlightText') {
    // Highlight optimized text in page
    highlightInPage(request.text);
    sendResponse({ success: true });
  }
});

// Helper: Highlight text in page (useful for showing changes)
function highlightInPage(text) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  const nodesToReplace = [];

  while (node = walker.nextNode()) {
    if (node.textContent.includes(text)) {
      nodesToReplace.push(node);
    }
  }

  nodesToReplace.forEach(node => {
    const span = document.createElement('span');
    span.className = 'less-token-highlight';
    span.style.backgroundColor = 'yellow';
    span.style.padding = '2px';
    node.parentNode.replaceChild(span, node);
    span.appendChild(node);
  });
}
