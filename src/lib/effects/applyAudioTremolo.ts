// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioTremoloOptions {
  rateHz: number;
  depth: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioTremolo(buffer: AudioBuffer, options: AudioTremoloOptions, ctx: BaseAudioContext): AudioBuffer {
  const rateHz = Math.max(0.5, Math.min(20.0, options.rateHz));
  const depth = Math.max(0.0, Math.min(1.0, options.depth));
  const fs = buffer.sampleRate;
  
  const deltaTheta = (2 * Math.PI * rateHz) / fs;
  const outBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, fs);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    let theta = 0;
    
    for (let i = 0; i < input.length; i++) {
      const c_val = Math.sin(theta);
      const g_trem = 1.0 - depth * ((1.0 - c_val) / 2);
      output[i] = Math.max(-1.0, Math.min(1.0, input[i] * g_trem));
      theta = (theta + deltaTheta) % (2 * Math.PI);
    }
  }
  return outBuffer;
}
