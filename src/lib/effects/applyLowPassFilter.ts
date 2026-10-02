// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioLowPassFilterOptions {
  cutoffHz: number;
  order: number;
  outputFormat?: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyLowPassFilter(buffer: AudioBuffer, options: AudioLowPassFilterOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  let cutoffHz = Math.max(20.0, Math.min(20000.0, options.cutoffHz));
  const order = Math.max(1, Math.min(5, Math.floor(options.order)));

  const CutoffLimit = Math.min(cutoffHz, (sampleRate / 2) * 0.99);
  const w0 = 2 * Math.PI * CutoffLimit / sampleRate;
  const alpha_lpf = Math.sin(w0) / Math.SQRT2;

  const b0_raw = (1 - Math.cos(w0)) / 2;
  const b1_raw = 1 - Math.cos(w0);
  const b2_raw = (1 - Math.cos(w0)) / 2;
  const a0_raw = 1 + alpha_lpf;
  const a1_raw = -2 * Math.cos(w0);
  const a2_raw = 1 - alpha_lpf;

  const b0 = b0_raw / a0_raw;
  const b1 = b1_raw / a0_raw;
  const b2 = b2_raw / a0_raw;
  const a1 = a1_raw / a0_raw;
  const a2 = a2_raw / a0_raw;

  const G_norm = (b0_raw + b1_raw + b2_raw) / (a0_raw + a1_raw + a2_raw);
  const numStages = order;

  const newBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const channelData = buffer.getChannelData(c);
    const outData = newBuffer.getChannelData(c);
    
    const states = Array.from({ length: numStages }, () => ({ s1: 0, s2: 0 }));

    for (let n = 0; n < channelData.length; n++) {
      let x = channelData[n];
      for (let m = 0; m < numStages; m++) {
         const st = states[m];
         const y = b0 * x + st.s1;
         st.s1 = b1 * x - a1 * y + st.s2;
         st.s2 = b2 * x - a2 * y;
         x = y;
      }
      outData[n] = x * (1.0 / Math.pow(G_norm, numStages));
    }
  }

  return newBuffer;
}
