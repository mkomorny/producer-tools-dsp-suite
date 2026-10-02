// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface DeEsserOptions {
  centerFrequency: number;
  bandwidth: number;
  threshold: number;
  ratio: number;
  outputFormat: string;
}

export function applyDeEsser(buffer: AudioBuffer, options: DeEsserOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const centerFrequency = Math.max(3000, Math.min(9900, options.centerFrequency));
  const bandwidth = Math.max(1000, Math.min(6000, options.bandwidth));
  const threshold = Math.max(0.0, Math.min(1.0, options.threshold));
  const ratio = Math.max(1.0, Math.min(20.0, options.ratio));
  
  const sampleRate = buffer.sampleRate;
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  const alpha_att = Math.exp(-1 / (0.002 * sampleRate));
  const alpha_rel = Math.exp(-1 / (0.035 * sampleRate));
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let f_c = centerFrequency;
    let bw = bandwidth;
    if (f_c + bw / 2 >= sampleRate / 2) {
      bw = (sampleRate / 2 - f_c) * 1.9;
    }
    
    const w0 = 2 * Math.PI * f_c / sampleRate;
    const Q = f_c / bw;
    const alpha = Math.sin(w0) / (2 * Q);
    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;
    
    let x1=0, x2=0, y1=0, y2=0;
    let E = 0;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      
      const x_sc = (b0 * x_in + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x_in; y2 = y1; y1 = x_sc;
      
      const abs_x_sc = Math.abs(x_sc);
      if (abs_x_sc > E) {
        E = alpha_att * E + (1 - alpha_att) * abs_x_sc;
      } else {
        E = alpha_rel * E + (1 - alpha_rel) * abs_x_sc;
      }
      
      let G_dB = 0;
      if (E > threshold && threshold > 0) {
        const E_dB = 20 * Math.log10(E + 1e-7);
        const threshold_dB = 20 * Math.log10(threshold + 1e-7);
        G_dB = (threshold_dB - E_dB) * (1 - 1/ratio);
      }
      
      const g_att = Math.pow(10, G_dB / 20);
      output[n] = x_in * (1 - (1 - g_att) * x_sc); 
    }
  }
  
  return outBuffer;
}
