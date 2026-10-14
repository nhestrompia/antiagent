// Experimental timing signal. The debugger can suppress it, and slow hardware can trigger it.
export function inspectRuntimeCost() {
  const previousLimit = Error.stackTraceLimit;
  const samples = [];
  let sink;
  function create(depth) {
    if (depth) return create(depth - 1);
    sink = new Error('runtime-cost-probe');
  }
  try {
    Error.stackTraceLimit = 0;
    for (let i = 0; i < 500; i++) create(80);
    for (let round = 0; round < 3; round++) {
      const start = performance.now();
      for (let i = 0; i < 2000; i++) create(80);
      samples.push(performance.now() - start);
    }
  } finally { Error.stackTraceLimit = previousLimit; }
  samples.sort((a, b) => a - b);
  return { suspected: samples[1] >= 8, medianMs: samples[1], retainedError: sink instanceof Error };
}
