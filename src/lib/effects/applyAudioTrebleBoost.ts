// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioTrebleBoostOptions {
  gainDb: number;
  centerFreqHz: number;
  widthQ: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioTrebleBoost(buffer: AudioBuffer, options: AudioTrebleBoostOptions, ctx: BaseAudioContext): AudioBuffer {
  const gainDb = Math.max(-12.0, Math.min(24.0, options.gainDb));
  const centerFreqHz = Math.max(2000.0, Math.min(20000.0, options.centerFreqHz));
  const widthQ = Math.max(0.1, Math.min(5.0, options.widthQ));
  const fs = buffer.sampleRate;
  
  const targetFreq = Math.min(centerFreqHz, (fs / 2) * 0.95);
  
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * targetFreq) / fs;
  const alphaShelf = Math.sin(w0) / (2 * widthQ);
  
  const b0 = A * ((A + 1) + (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alphaShelf);
  const b1 = -2 * A * ((A - 1) + (A + 1) * Math.cos(w0));
  const b2 = A * ((A + 1) + (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alphaShelf);
  const a0 = (A + 1) - (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alphaShelf;
  const a1 = 2 * ((A - 1) - (A + 1) * Math.cos(w0));
  const a2 = (A + 1) - (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alphaShelf;
  
  const outBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, fs);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let s1 = 0, s2 = 0;
    
    for (let i = 0; i < input.length; i++) {
      const x = input[i];
      const y = (b0 / a0) * x + s1;
      s1 = (b1 / a0) * x - (a1 / a0) * y + s2;
      s2 = (b2 / a0) * x - (a2 / a0) * y;
      
      output[i] = Math.max(-1.0, Math.min(1.0, y));
    }
  }
  return outBuffer;
}
