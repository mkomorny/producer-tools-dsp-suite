// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioFlangerOptions {
  delayMs: number;
  depthMs: number;
  regen: number;
  width: number;
  speedHz: number;
  phaseDeg: number;
  interpolation: 'Linear' | 'Quadratic';
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyFlanger(buffer: AudioBuffer, options: AudioFlangerOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const delayMs = Math.max(0.1, Math.min(10.0, options.delayMs));
  const depthMs = Math.max(0.5, Math.min(5.0, options.depthMs));
  const regen = Math.max(-0.95, Math.min(0.95, options.regen));
  const width = Math.max(0, Math.min(100, options.width));
  const speedHz = Math.max(0.05, Math.min(5.0, options.speedHz));
  const phaseDeg = Math.max(0, Math.min(360, options.phaseDeg));
  
  const sampleRate = buffer.sampleRate;
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  const maxTime = delayMs + depthMs;
  const N_buf = Math.ceil((maxTime * sampleRate) / 1000) + 4;
  const d_theta = (2 * Math.PI * speedHz) / sampleRate;
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    const x_buf = new Float32Array(N_buf);
    let p_write = 0;
    let theta = (c === 1) ? (phaseDeg * Math.PI / 180) : 0;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      
      theta = (theta + d_theta) % (2 * Math.PI);
      const tau = delayMs + depthMs * Math.sin(theta);
      const M = (tau * sampleRate) / 1000;
      
      const I = Math.floor(M);
      const f = M - I;
      
      const p_read1 = (p_write - I + N_buf) % N_buf;
      const p_read2 = (p_write - I - 1 + N_buf) % N_buf;
      
      const y_wet = (1 - f) * x_buf[p_read1] + f * x_buf[p_read2];
      
      x_buf[p_write] = x_in + y_wet * regen;
      
      output[n] = x_in + y_wet * (width / 100);
      
      p_write = (p_write + 1) % N_buf;
    }
  }
  
  return outBuffer;
}
