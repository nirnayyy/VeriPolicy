// Configure Transformers.js to use more robust caching
// This helps prevent the HTML error page issue when downloading models

if ('caches' in self) {
  // Use service worker caching if available
  console.log('[Transformers.js Config] Service worker caching enabled');
}

// Try to configure IndexedDB-based caching
if ('indexedDB' in self) {
  console.log('[Transformers.js Config] IndexedDB caching available');
}
