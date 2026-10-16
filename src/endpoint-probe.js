const parameters = new URLSearchParams(location.search);
const ports = JSON.parse(parameters.get('ports'));
const results = [];
for (const [label, port] of Object.entries(ports)) {
  for (const mode of ['cors', 'no-cors']) {
    const started = performance.now();
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
        mode, cache: 'no-store', signal: AbortSignal.timeout(1500),
      });
      let body;
      if (response.type !== 'opaque') body = await response.text();
      results.push({label, mode, outcome: 'response', type: response.type, status: response.status,
        body, ms: performance.now()-started});
    } catch (error) {
      results.push({label, mode, outcome: 'error', name: error.name, ms: performance.now()-started});
    }
  }
}
document.querySelector('pre').textContent = JSON.stringify(results,null,2);
document.title = JSON.stringify({origin: location.origin, results});
