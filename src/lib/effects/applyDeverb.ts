// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioDeverbOptions {
  highpassFreq: number;
  lowpassFreq: number;
  lowMidGain: number;
  highMidGain: number;
  noiseFloorDb: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyDeverb(buffer: AudioBuffer, options: AudioDeverbOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  const highpassFreq = Math.max(20, Math.min(500, options.highpassFreq));
  const lowpassFreq = Math.max(4000, Math.min(20000, options.lowpassFreq));
  const lowMidGain = Math.max(-12.0, Math.min(0.0, options.lowMidGain));
  const highMidGain = Math.max(-12.0, Math.min(0.0, options.highMidGain));
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    const A_lm = Math.pow(10, lowMidGain / 40);
    const w0_lm = 2 * Math.PI * 300 / sampleRate;
    const alpha_lm = Math.sin(w0_lm) / (2 * 1.0);
    const b0_lm = 1 + alpha_lm * A_lm;
    const b1_lm = -2 * Math.cos(w0_lm);
    const b2_lm = 1 - alpha_lm * A_lm;
    const a0_lm = 1 + alpha_lm / A_lm;
    const a1_lm = -2 * Math.cos(w0_lm);
    const a2_lm = 1 - alpha_lm / A_lm;
    
    let x1_lm=0, x2_lm=0, y1_lm=0, y2_lm=0;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      
      const y_lm = (b0_lm * x_in + b1_lm * x1_lm + b2_lm * x2_lm - a1_lm * y1_lm - a2_lm * y2_lm) / a0_lm;
      x2_lm = x1_lm; x1_lm = x_in; y2_lm = y1_lm; y1_lm = y_lm;
      
      output[n] = y_lm;
    }
  }
  
  return outBuffer;
}
