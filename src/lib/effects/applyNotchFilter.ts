// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioNotchFilterOptions {
  centerFreq: number;
  bandwidth: number;
  depthDb: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyNotchFilter(buffer: AudioBuffer, options: AudioNotchFilterOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  
  let centerFreq = Math.max(20.0, Math.min(20000.0, options.centerFreq));
  if (centerFreq >= sampleRate / 2) {
    centerFreq = (sampleRate / 2) - 500;
  }
  const bandwidth = Math.max(1.0, Math.min(500.0, options.bandwidth));
  const depthDb = Math.max(-60.0, Math.min(-3.0, options.depthDb));
  
  const w0 = (2 * Math.PI * centerFreq) / sampleRate;
  const alpha = (Math.sin(w0) * bandwidth) / (2 * centerFreq);
  const A = Math.pow(10, depthDb / 40);
  
  const b0 = 1.0;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1.0;
  const a0 = 1.0 + alpha / A;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1.0 - Math.abs(alpha / A); // Safe absolute so a2 isn't too extreme in subtraction
  
  const normB0 = b0 / a0;
  const normB1 = b1 / a0;
  const normB2 = b2 / a0;
  const normA1 = a1 / a0;
  const normA2 = (1.0 - alpha / A) / a0;
  
  const numChannels = buffer.numberOfChannels;
  const outBuffer = audioCtx.createBuffer(numChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    
    for (let i = 0; i < inData.length; i++) {
      const x = inData[i];
      let y = normB0 * x + normB1 * x1 + normB2 * x2 - normA1 * y1 - normA2 * y2;
      
      if (Math.abs(y) < 1e-15) y = 0;
      
      outData[i] = y;
      
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
    }
  }
  
  return outBuffer;
}
