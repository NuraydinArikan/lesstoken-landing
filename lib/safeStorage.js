// Thin guards around the Web Storage API.
//
// In privacy-hardened browsers (and some corporate/partitioned contexts)
// localStorage/sessionStorage access can throw a SecurityError just by
// touching getItem/setItem/removeItem. These wrappers make storage access
// fail soft instead of unwinding the whole page.
//
// Web Storage can throw SecurityError (storage blocked/partitioned) even on
// property access, not just getItem/setItem — resolve the storage object
// inside the try, not in the caller.
function resolve(kind) {
  return kind === 'session' ? sessionStorage : localStorage;
}

export function safeGet(kind, key) {
  try {
    return resolve(kind).getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(kind, key, value) {
  try {
    resolve(kind).setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function safeRemove(kind, key) {
  try {
    resolve(kind).removeItem(key);
  } catch {
    /* ignore */
  }
}
