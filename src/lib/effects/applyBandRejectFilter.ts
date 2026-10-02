// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

// ==========================================
// OFFLINE KNOWLEDGE DSP FUNCTIONS
// ==========================================

export interface BandRejectFilterOptions {
  centerFrequency: number;
  bandwidth: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyBandRejectFilter(
  buffer: AudioBuffer,
  options: BandRejectFilterOptions,
  audioCtx: BaseAudioContext
): AudioBuffer {
  const centerFrequency = Math.max(20, Math.min(20000, options.centerFrequency));
  const bandwidth = Math.max(10, Math.min(5000, options.bandwidth));
  const sampleRate = buffer.sampleRate;
  
  let safeCenterFreq = centerFrequency;
  if (safeCenterFreq >= sampleRate / 2) {
    safeCenterFreq = (sampleRate / 2) - 100;
  }
  
  const w0 = 2 * Math.PI * safeCenterFreq / sampleRate;
  const bw = Math.log2(1 + bandwidth / safeCenterFreq);
  const alpha = Math.sin(w0) * Math.sinh((Math.LN2 / 2) * bw * (w0 / Math.sin(w0)));
  
  const b0 = 1;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;
  
  const norm_b0 = b0 / a0;
  const norm_b1 = b1 / a0;
  const norm_b2 = b2 / a0;
  const norm_a1 = a1 / a0;
  const norm_a2 = a2 / a0;
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    
    for (let n = 0; n < input.length; n++) {
      const x0 = input[n];
      let y0 = norm_b0 * x0 + norm_b1 * x1 + norm_b2 * x2 - norm_a1 * y1 - norm_a2 * y2;
      
      if (Math.abs(y0) < 1e-15) y0 = 0;
      
      output[n] = y0;
      
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
    }
  }
  
  return outBuffer;
}
