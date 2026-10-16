export async function captureExperimentTab(page) {
  return page.evaluate(async () => {
    let stream;
    let timer;
    let recorder;
    let cancelled = false;
    let stage = 'requesting-tab';
    const view = document.createElement('video');
    view.muted = true;
    try {
      const capture = async () => {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false, preferCurrentTab: true });
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); throw new Error('Capture was cancelled.'); }
        const settings = stream.getVideoTracks()[0].getSettings();
        if (settings.displaySurface !== 'browser') throw new Error('Capture did not select a browser tab; refusing to use another surface.');
        view.srcObject = stream;
        stage = 'starting-capture-video';
        const firstFrame = new Promise(resolve => view.requestVideoFrameCallback(resolve));
        await view.play();
        stage = 'waiting-for-captured-frame';
        await firstFrame;
        const canvas = document.createElement('canvas');
        canvas.width = view.videoWidth; canvas.height = view.videoHeight;
        canvas.getContext('2d').drawImage(view, 0, 0);
        const snapshot = window.antiAgentExperiment.snapshot();
        const chunks = [];
        stage = 'recording';
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.start();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const stopped = new Promise(resolve => { recorder.onstop = resolve; });
        recorder.stop(); await stopped;
        const recordingDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(new Blob(chunks, { type: recorder.mimeType }));
        });
        return { available: true, settings, frameDataUrl: canvas.toDataURL('image/png'), recordingDataUrl, recordingMimeType: recorder.mimeType, recordingDurationMs: 1000, snapshot, after: window.antiAgentExperiment.snapshot() };
      };
      return await Promise.race([capture(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Browser-tab capture timed out.')), 10000); })]);
    } catch (error) { return { available: false, stage, error: `${error.name}: ${error.message}` }; }
    finally {
      clearTimeout(timer);
      cancelled = true;
      if (recorder?.state === 'recording') recorder.stop();
      stream?.getTracks().forEach(track => track.stop());
      view.pause(); view.srcObject = null;
    }
  });
}
