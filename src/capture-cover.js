// Experimental visual cover for measured side effects, not a universal capture event.
export function installCaptureCover(region, { onCover = () => {} } = {}) {
  const initialWidth = document.documentElement.clientWidth;
  const initialWindowWidth = innerWidth;
  const original = { position: region.style.position, visibility: region.style.visibility, inert: region.inert };
  if (getComputedStyle(region).position === 'static') region.style.position = 'relative';
  const cover = document.createElement('div');
  cover.setAttribute('aria-hidden', 'true');
  Object.assign(cover.style, { position: 'absolute', inset: '0', background: '#000', visibility: 'visible', display: 'none', zIndex: '2147483647' });
  region.appendChild(cover);
  const reasons = new Set();
  let covered = false, disposed = false, frame;
  function obscure(reason) {
    if (disposed) return;
    reasons.add(reason);
    if (covered) return;
    covered = true;
    region.inert = true;
    region.style.visibility = 'hidden';
    cover.style.display = 'block';
    onCover(reason);
  }
  const observer = new ResizeObserver(() => {
    // Narrower than any resize: unchanged window width, disappearing scrollbar.
    if (initialWidth < initialWindowWidth && innerWidth === initialWindowWidth && document.documentElement.clientWidth === initialWindowWidth) obscure('scrollbar-geometry');
  });
  observer.observe(document.documentElement);
  function poll() {
    if (disposed) return;
    if (document.hidden) obscure('hidden-animation-frame');
    frame = requestAnimationFrame(poll);
  }
  frame = requestAnimationFrame(poll);
  return {
    snapshot: () => ({ covered, reasons: [...reasons] }),
    dispose() {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      cover.remove();
      region.style.position = original.position;
      region.style.visibility = original.visibility;
      region.inert = original.inert;
    },
  };
}
