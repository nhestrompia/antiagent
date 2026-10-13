const randomized = new URLSearchParams(location.search).get('layout') !== 'fixed';
const tasks = [
  { instruction: 'Choose Harbor Research', choices: ['Harbor Research', 'North Labs', 'West Studio'] },
  { instruction: 'Choose 125 EUR', choices: ['125 EUR', '50 EUR', '250 EUR'] },
  { instruction: 'Choose Confirm transfer', choices: ['Confirm transfer', 'Cancel', 'Go back'] },
];
function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    // Rejection sampling avoids modulo bias in the small shuffle range.
    const limit = 0x100000000 - 0x100000000 % (i + 1);
    let value;
    do { value = crypto.getRandomValues(new Uint32Array(1))[0]; } while (value >= limit);
    const j = value % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const layouts = tasks.map(task => randomized ? shuffle(task.choices) : [...task.choices]);
const canvas = document.querySelector('canvas');
canvas.width = 720; canvas.height = 480;
const ctx = canvas.getContext('2d');
let step = 0, mistakes = 0, clicks = 0;
function snapshot() { return { randomized, step, mistakes, clicks, completed: step === tasks.length }; }
function draw() {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 720, 480);
  ctx.fillStyle = '#172b35'; ctx.font = 'bold 28px sans-serif';
  ctx.fillText(step === tasks.length ? 'Task complete' : tasks[step].instruction, 40, 70);
  if (step < tasks.length) {
    ctx.font = '16px sans-serif'; ctx.fillText(`Decision ${step + 1} of 3`, 40, 110);
    layouts[step].forEach((choice, slot) => {
      const x = 40 + slot * 230;
      ctx.fillStyle = '#116456'; ctx.fillRect(x, 200, 180, 70);
      ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.fillText(choice, x + 10, 240);
    });
  }
  document.querySelector('#status').textContent = JSON.stringify(snapshot(), null, 2);
}
canvas.addEventListener('click', event => {
  if (step === tasks.length) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * 720 / rect.width;
  const y = (event.clientY - rect.top) * 480 / rect.height;
  const slot = [0, 1, 2].find(slot => x >= 40 + slot * 230 && x <= 220 + slot * 230 && y >= 200 && y <= 270);
  clicks++;
  if (slot !== undefined && layouts[step][slot] === tasks[step].choices[0]) step++;
  else mistakes++;
  draw();
});
window.randomizedCanvasExperiment = { snapshot };
draw();
