// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioHumRemovalOptions {
  humType: '60Hz (Americas, Japan)' | '50Hz (Europe, Asia, Africa)' | 'Custom frequency';
  customFrequency: number;
  filterWidth: number;
  reductionDepthDb: number;
  includeHarmonics: boolean;
  outputFormat?: string;
}

export function applyHumRemoval(buffer: AudioBuffer, options: AudioHumRemovalOptions, audioCtx: BaseAudioContext): AudioBuffer {
  let f0 = 60.0;
  if (options.humType === '50Hz (Europe, Asia, Africa)') f0 = 50.0;
  if (options.humType === 'Custom frequency') f0 = Math.max(20.0, Math.min(500.0, options.customFrequency));
  
  const filterWidth = Math.max(1.0, Math.min(5.0, options.filterWidth));
  const reductionDepthDb = Math.max(-60.0, Math.min(-10.0, options.reductionDepthDb));
  const sampleRate = buffer.sampleRate;
  
  const maxHarmonics = options.includeHarmonics ? Math.floor(2000 / f0) : 1;
  const G_depth = Math.pow(10, reductionDepthDb / 20);
  
  const stages: any[] = [];
  for (let k = 1; k <= maxHarmonics; k++) {
    const fk = f0 * k;
    if (fk >= sampleRate / 2) continue;
    
    const w0 = 2 * Math.PI * fk / sampleRate;
    const gamma = Math.tan(w0 * filterWidth / (2 * fk));
    const alpha_notch = 1 / (1 + gamma);
    
    const b0 = alpha_notch;
    const b1 = -2 * alpha_notch * Math.cos(w0);
    const b2 = alpha_notch;
    const a1 = -2 * alpha_notch * Math.cos(w0);
    const a2 = alpha_notch * (1 - gamma);
    
    stages.push({
      b0, b1, b2, a1, a2,
      x1: new Float32Array(buffer.numberOfChannels),
      x2: new Float32Array(buffer.numberOfChannels),
      y1: new Float32Array(buffer.numberOfChannels),
      y2: new Float32Array(buffer.numberOfChannels)
    });
  }
  
  const newBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = newBuffer.getChannelData(c);
    
    for (let n = 0; n < buffer.length; n++) {
      let x = input[n];
      for (let m = 0; m < stages.length; m++) {
        const st = stages[m];
        const y = st.b0 * x + st.b1 * st.x1[c] + st.b2 * st.x2[c] - st.a1 * st.y1[c] - st.a2 * st.y2[c];
        st.x2[c] = st.x1[c];
        st.x1[c] = x;
        st.y2[c] = st.y1[c];
        st.y1[c] = y;
        x = y;
      }
      output[n] = G_depth * x + (1.0 - G_depth) * input[n];
    }
  }
  
  return newBuffer;
}
