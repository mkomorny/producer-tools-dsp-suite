import createPraatWasm from 'praat-wasm';

export const analyzeAudioWithPraat = async (arrayBuffer: ArrayBuffer) => {
  const praat = await createPraatWasm();
  const snd: any = await praat.readAudio(arrayBuffer);
  
  const pitchData: { time: number; pitch: number }[] = [];
  const intensityData: { time: number; intensity: number }[] = [];
  
  // Real Praat Pitch Extraction
  const pitch: any = snd.toPitch(0, 75, 600);
  // Real Praat Intensity Extraction
  const intensity: any = snd.toIntensity(100, 0, true);
  
  const numFrames = await pitch.getNx();
  for (let i = 1; i <= numFrames; i++) {
    const time = await pitch.getX1() + (i - 1) * await pitch.getDx();
    const pVal = await pitch.getValueAtTime(time);
    pitchData.push({ time, pitch: Number.isNaN(pVal) ? 0 : pVal });
  }
  
  const numIntFrames = await intensity.getNx();
  for (let i = 1; i <= numIntFrames; i++) {
    const time = await intensity.getX1() + (i - 1) * await intensity.getDx();
    const iVal = await intensity.getValueAtTime(time);
    intensityData.push({ time, intensity: Number.isNaN(iVal) ? 0 : iVal });
  }

  // Jitter & Shimmer
  const pulses: any = snd.toPointProcess('cc', pitch);
  const jitter = await praat.call(pulses, 'Get jitter (local)', 0, 0, 0.0001, 0.02, 1.3);
  const shimmer = await praat.call([pulses, snd], 'Get shimmer (local)', 0, 0, 0.0001, 0.02, 1.3, 1.6);
  
  // Cleanup Praat objects
  snd.remove();
  pitch.remove();
  intensity.remove();
  pulses.remove();
  
  // Get duration using an offline audio context
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const bufferCopy = arrayBuffer.slice(0);
  const audioBuffer = await audioCtx.decodeAudioData(bufferCopy);
  const duration = audioBuffer.duration;
  
  return { pitchData, intensityData, duration, jitter, shimmer };
};
