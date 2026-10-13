import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('artifacts', `colored-control-${new Date().toISOString().replaceAll(':', '-')}`);
await mkdir(directory, { recursive: true });
const reports = {};
for (const [label, asset] of [['clear', 'clear-control'], ['encrypted', 'control']]) {
  execFileSync(process.execPath, ['scripts/capture.mjs'], { stdio: 'inherit', env: { ...process.env, ASSET: asset, CAPTURE_DIR: `${directory}/${label}`, KEEP_OPEN: '0' } });
  reports[label] = JSON.parse(await readFile(`${directory}/${label}/report.json`, 'utf8'));
}
const summarize = report => report.runs.filter(run => run.mode !== 'baseline').map(run => ({
  repetition: run.repetition, mode: run.mode,
  playbackValidBefore: Boolean(run.before.drm.encryptionExpected ? run.before.drm.protectedPlayback : run.before.drm.playbackVerified),
  playbackValidAfter: Boolean(run.after.drm.encryptionExpected ? run.after.drm.protectedPlayback : run.after.drm.playbackVerified),
  screenshotVideo: run.captureMethods.filter(capture => capture.videoMeasurement).map(capture => ({ method: capture.method, appearance: capture.videoMeasurement.appearance })),
  copiedVideo: run.composition?.patternMeasurement?.appearance || null,
  referenceComparison: run.comparison,
  humanObservation: run.humanObservation || null,
}));
const clear = summarize(reports.clear);
const encrypted = summarize(reports.encrypted);
const visibleInAllNativeCaptures = rows => rows.filter(row => row.mode === 'native').every(row => row.playbackValidBefore && row.playbackValidAfter && row.screenshotVideo.length > 0 && row.screenshotVideo.every(capture => capture.appearance === 'pattern-visible'));
const summary = {
  schemaVersion: 1, clearReport: 'clear/report.json', encryptedReport: 'encrypted/report.json', clear, encrypted,
  browserVideoCaptureResult: clear.some(row => row.mode === 'native') && encrypted.some(row => row.mode === 'native') && visibleInAllNativeCaptures(clear) && visibleInAllNativeCaptures(encrypted) ? 'encrypted-pattern-preserved-in-browser-captures' : 'requires-review',
  underlyingCanvasProtection: 'unverified',
  note: 'This suite distinguishes video capture from underlying canvas capture. No apparent black replacement can establish protection without valid playback, a visible clear baseline, and contemporaneous human observation. Playwright and CDP share a backend.',
};
await writeFile(`${directory}/summary.json`, JSON.stringify(summary, null, 2));
console.log(`Paired colored-control evidence saved to ${directory}`);
