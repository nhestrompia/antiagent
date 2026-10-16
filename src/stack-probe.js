// Independent experiment inspired by AI Browser Guard's V8 stack inspection.
// Source reviewed: bc33c1d05bf52f0c96abe7c66cf7f802a7a0c7b3/src/detection/stack-trace.ts.
const samples = [];
let source = 'page-load';
let serializationReads = 0;
const original = Error.prepareStackTrace;
Error.prepareStackTrace = (error, frames) => {
  const matches = frames.filter(frame => {
    const type = frame.getTypeName() || '';
    const name = frame.getFunctionName() || '';
    const file = frame.getFileName() || '';
    return type === 'UtilityScript' || name.includes('UtilityScript') || file.startsWith('pptr:') || file.includes('__puppeteer_evaluation_script__');
  });
  samples.push({ source, frameworkDetected: matches.length > 0, matchingFrames: matches.map(frame => frame.toString()) });
  return original ? original(error, frames) : `${error.name}: ${error.message}\n${frames.map(frame => `    at ${frame}`).join('\n')}`;
};
function exercise(kind) {
  source = kind;
  const stack = new Error('Stack observation').stack;
  document.querySelector('#status').textContent = JSON.stringify(snapshot(), null, 2);
  return stack.length;
}
function snapshot() { return { samples: structuredClone(samples), serializationReads }; }
document.querySelector('#sample').addEventListener('click', () => exercise('native-input'));
window.stackProbe = { exercise: () => exercise('evaluate-error'), snapshot };
exercise('page-load');
const serializationProbe = new Error('Serialization observation');
Object.defineProperty(serializationProbe, 'stack', { get() { serializationReads++; return 'Serialization probe stack'; } });
console.debug(serializationProbe);
