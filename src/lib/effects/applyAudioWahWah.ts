// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioWahWahOptions {
  mode: 'Auto-Wah (Automatic)' | 'Manual Wah (Fixed)';
  wahFreq: number;
  wahDepth: number;
  wahCenterFreq: number;
  filterResonance: number;
  mix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioWahWah(buffer: AudioBuffer, options: AudioWahWahOptions, ctx: BaseAudioContext): AudioBuffer {
  const isAuto = options.mode === 'Auto-Wah (Automatic)';
  const wFreq = Math.max(0.1, Math.min(10.0, options.wahFreq));
  const wDepth = Math.max(0.0, Math.min(1.0, options.wahDepth));
  const wCenter = Math.max(200.0, Math.min(5000.0, options.wahCenterFreq));
  const fRes = Math.max(0.1, Math.min(10.0, options.filterResonance));
  const mix = Math.max(0.0, Math.min(1.0, options.mix));
  const fs = buffer.sampleRate;
  
  const dTheta = (2 * Math.PI * wFreq) / fs;
  const outBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, fs);
  
  const nyquistCeiling = (fs / 2) * 0.90;
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
      const input = buffer.getChannelData(c);
      const output = outBuffer.getChannelData(c);
      let theta = 0;
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      
      for (let i = 0; i < input.length; i++) {
          let f_c = wCenter;
          if (isAuto) {
              f_c = wCenter + (wDepth * wCenter * Math.sin(theta));
              theta = (theta + dTheta) % (2 * Math.PI);
          }
          if (f_c > nyquistCeiling) f_c = nyquistCeiling;
          
          const w0 = (2 * Math.PI * f_c) / fs;
          const alpha = Math.sin(w0) / (2 * fRes);
          
          const a0 = 1 + alpha;
          const b0 = alpha / a0;
          const b1 = 0;
          const b2 = -alpha / a0;
          const a1 = (-2 * Math.cos(w0)) / a0;
          const a2 = (1 - alpha) / a0;
          
          const x = input[i];
          const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
          
          x2 = x1; x1 = x;
          y2 = y1; y1 = y;
          
          const val = (x * (1.0 - mix)) + (y * mix);
          output[i] = Math.max(-1.0, Math.min(1.0, val));
      }
  }
  return outBuffer;
}
