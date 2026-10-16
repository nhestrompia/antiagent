const quadrants = [
  { name: 'red', x: 0.25, y: 0.25, rgb: [255, 0, 0] },
  { name: 'green', x: 0.75, y: 0.25, rgb: [0, 255, 0] },
  { name: 'blue', x: 0.25, y: 0.75, rgb: [0, 0, 255] },
  { name: 'yellow', x: 0.75, y: 0.75, rgb: [255, 255, 0] },
];

// Sample inside flat color regions, away from compression and scaling edges.
export function classifyVideoPattern(image, region, viewportWidth) {
  const scale = image.width / viewportWidth;
  if (region.width <= 0 || region.height <= 0) return { appearance: 'out-of-view', samples: [] };
  const samples = [];
  for (const quadrant of quadrants) {
    const x = Math.floor((region.x + region.width * quadrant.x) * scale);
    const y = Math.floor((region.y + region.height * quadrant.y) * scale);
    if (x < 1 || y < 1 || x >= image.width - 1 || y >= image.height - 1) return { appearance: 'out-of-view', samples: [] };
    const rgb = [0, 0, 0];
    let alpha = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      for (let channel = 0; channel < 3; channel++) rgb[channel] += image.data[((y + dy) * image.width + x + dx) * 4 + channel] / 9;
      alpha += image.data[((y + dy) * image.width + x + dx) * 4 + 3] / 9;
    }
    samples.push({ name: quadrant.name, rgb: rgb.map(Math.round), alpha: Math.round(alpha), expected: quadrant.rgb, matches: alpha >= 235 && rgb.every((value, channel) => Math.abs(value - quadrant.rgb[channel]) <= 80), black: alpha >= 235 && rgb.every(value => value <= 20) });
  }
  return { appearance: samples.every(sample => sample.matches) ? 'pattern-visible' : samples.every(sample => sample.black) ? 'black' : samples.every(sample => sample.alpha <= 20) ? 'transparent' : 'other', samples, colorTolerance: 80, blackThreshold: 20, note: 'Color classification tolerates observed decoder/display color conversion. Pixel appearance is a measurement; capture suppression requires a matching live human observation.' };
}
