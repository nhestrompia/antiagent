// Experimental realm-local hardening. This is not browser-controller exclusion.
export function lockMethods(entries) {
  return entries.map(({ target, key }) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (!descriptor || typeof descriptor.value !== 'function') return { key, status: 'unavailable' };
    if (descriptor.configurable === false && descriptor.writable === false) return { key, status: 'already-locked' };
    try {
      Object.defineProperty(target, key, { ...descriptor, writable: false, configurable: false });
      return { key, status: 'locked' };
    } catch {
      return { key, status: 'failed' };
    }
  });
}
