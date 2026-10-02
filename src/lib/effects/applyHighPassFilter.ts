// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface HighPassFilterOptions {
  cutoffHz: number;
  order: number;
  outputFormat?: string;
}

export function applyHighPassFilter(buffer: AudioBuffer, options: HighPassFilterOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  let cutoffHz = Math.max(20, Math.min(20000, options.cutoffHz));
  const order = Math.max(1, Math.min(4, options.order));
  
  if (cutoffHz >= sampleRate / 2) {
    cutoffHz = (sampleRate / 2) - 100;
  }
  
  const M = Math.floor((order + 1) / 2);
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  
  const stages: any[] = [];
  for (let m = 1; m <= M; m++) {
    const actualQ = (order % 2 !== 0 && m === M) ? 0.5 : (1.0 / (-2 * Math.cos((2 * m + order - 1) * Math.PI / (2 * order))));
    const alpha = Math.sin(w0) / (2 * actualQ);
    const b0 = (1 + Math.cos(w0)) / 2;
    const b1 = -(1 + Math.cos(w0));
    const b2 = (1 + Math.cos(w0)) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;
    stages.push({
      b0: b0/a0, b1: b1/a0, b2: b2/a0,
      a1: a1/a0, a2: a2/a0,
      z1: new Float32Array(buffer.numberOfChannels),
      z2: new Float32Array(buffer.numberOfChannels)
    });
  }
  
  const newBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = newBuffer.getChannelData(c);
    
    for (let n = 0; n < buffer.length; n++) {
      let x = input[n];
      for (let m = 0; m < M; m++) {
        const st = stages[m];
        const y = st.b0 * x + st.z1[c];
        st.z1[c] = st.b1 * x - st.a1 * y + st.z2[c];
        st.z2[c] = st.b2 * x - st.a2 * y;
        if (Math.abs(st.z1[c]) < 1e-15) st.z1[c] = 0;
        if (Math.abs(st.z2[c]) < 1e-15) st.z2[c] = 0;
        x = y;
      }
      output[n] = x;
    }
  }
  
  return newBuffer;
}
