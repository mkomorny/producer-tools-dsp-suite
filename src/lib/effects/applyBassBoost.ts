// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface BassBoostOptions {
  gainDb: number;
  centerFrequency: number;
  widthQ: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyBassBoost(
  buffer: AudioBuffer,
  options: BassBoostOptions,
  audioCtx: BaseAudioContext
): AudioBuffer {
  const gainDb = Math.max(-12.0, Math.min(24.0, options.gainDb));
  let centerFrequency = Math.max(20, Math.min(500, options.centerFrequency));
  const widthQ = Math.max(0.1, Math.min(5.0, options.widthQ));
  const sampleRate = buffer.sampleRate;
  
  if (centerFrequency >= sampleRate / 4) {
    centerFrequency = 120;
  }
  
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * centerFrequency / sampleRate;
  const alpha = Math.sin(w0) / (2 * widthQ);
  
  const b0 = A * ((A + 1) - (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha);
  const b1 = 2 * A * ((A - 1) - (A + 1) * Math.cos(w0));
  const b2 = A * ((A + 1) - (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha);
  const a0 = (A + 1) + (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha;
  const a1 = -2 * ((A - 1) + (A + 1) * Math.cos(w0));
  const a2 = (A + 1) + (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha;
  
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
