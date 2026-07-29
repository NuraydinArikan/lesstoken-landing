// Thin guards around the Web Storage API.
//
// In privacy-hardened browsers (and some corporate/partitioned contexts)
// localStorage/sessionStorage access can throw a SecurityError just by
// touching getItem/setItem/removeItem. These wrappers make storage access
// fail soft instead of unwinding the whole page.

export function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function safeRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}
