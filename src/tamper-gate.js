// API consistency diagnostics, not proof that the browser has no controller.
export function inspectAPIs() {
  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(frame);
  try {
    const reference = frame.contentWindow;
    if (!reference) return { allowed: false, reasons: ['reference-unavailable'] };
    const stringify = reference.Function.prototype.toString;
    const describe = reference.Object.getOwnPropertyDescriptor;
    const keys = reference.Reflect.ownKeys;
    const reasons = [];
    for (const [name, target, baseline] of [
      ['fillText', CanvasRenderingContext2D.prototype, reference.CanvasRenderingContext2D.prototype],
      ['attachShadow', Element.prototype, reference.Element.prototype],
      ['toString', Function.prototype, reference.Function.prototype],
    ]) {
      const actual = describe(target, name), expected = describe(baseline, name);
      if (!actual || !expected || typeof actual.value !== 'function') { reasons.push(`${name}:missing`); continue; }
      const source = stringify.call(actual.value);
      if (source !== `function ${name}() { [native code] }`) reasons.push(`${name}:native-source`);
      if (source !== stringify.call(expected.value)) reasons.push(`${name}:source`);
      if (keys(actual.value).some(key => key === 'prototype' || key === 'toString')) reasons.push(`${name}:extra-property`);
      if (JSON.stringify(keys(actual.value).map(String).sort()) !== JSON.stringify(keys(expected.value).map(String).sort())) reasons.push(`${name}:keys`);
      for (const flag of ['configurable', 'writable', 'enumerable']) if (actual[flag] !== expected[flag]) reasons.push(`${name}:${flag}`);
      if (actual.value.name !== expected.value.name || actual.value.length !== expected.value.length) reasons.push(`${name}:signature`);
    }
    if (describe(navigator, 'webdriver')) reasons.push('webdriver:own-property');
    return { allowed: reasons.length === 0, reasons };
  } catch (error) {
    return { allowed: false, reasons: [`inspection:${error.name}`] };
  } finally { frame.remove(); }
}
