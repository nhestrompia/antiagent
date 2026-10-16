export function drawReference(canvas) {
  const width = 720;
  const height = 480;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.aspectRatio = `${width} / ${height}`;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#172b35'; ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Reference transfer', 36, 58);
  ctx.font = '18px sans-serif'; ctx.fillText('Account: NORTH-47', 36, 112);
  ctx.fillText('Amount: 125.00 EUR', 36, 150);
  ctx.fillText('Recipient: Harbor Research', 36, 188);
  ctx.fillStyle = '#116456'; ctx.fillRect(36, 224, 300, 56);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('Confirm reference transfer', 52, 259);
  ctx.fillStyle = '#172b35'; ctx.font = '22px monospace'; ctx.fillText('CAPTURE TOKEN: ALPHA-729', 36, 336);
  ctx.font = '16px sans-serif'; ctx.fillText('Read these values in the captured image.', 36, 376);
  ['#e15c40', '#116456', '#194f8e', '#efbd42'].forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(36 + i * 90, 416, 72, 28); });
}

export function readCanvas(canvas) {
  try {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    let checksum = 0;
    for (const byte of pixels.data) checksum = (checksum + byte) >>> 0;
    return { ok: true, width: canvas.width, height: canvas.height, checksum, dataUrl: canvas.toDataURL('image/png') };
  } catch (error) { return { ok: false, error: `${error.name}: ${error.message}` }; }
}

export function copyVideo(video, canvas) {
  if (video.readyState < 2 || !video.videoWidth) return { drawSucceeded: false, error: 'No decoded video frame is available. Start playback before attempting composition.' };
  canvas.hidden = false;
  canvas.width = video.videoWidth || 320;
  canvas.height = video.videoHeight || 180;
  try {
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return { drawSucceeded: true, readback: readCanvas(canvas) };
  } catch (error) { return { drawSucceeded: false, error: `${error.name}: ${error.message}` }; }
}
