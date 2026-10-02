// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioVinylCrackleOptions {
  crackleType: 'Light Surface Noise' | 'Medium Wear Crackle' | 'Heavy Vintage Wear' | 'Random Pops & Clicks' | 'Classic Vinyl Sound';
  crackleIntensity: number;
  crackleDensity: number;
  frequencyRange: 'Mid (Classic Vinyl)' | 'Low (Bass Crackles)' | 'High (Surface Hiss)' | 'Wide (Full Spectrum)';
  analogWarmth: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioVinylCrackle(buffer: AudioBuffer, options: AudioVinylCrackleOptions, ctx: BaseAudioContext): AudioBuffer {
  let intensity = Math.max(0.0, Math.min(1.0, options.crackleIntensity));
  let density = Math.max(0.0, Math.min(1.0, options.crackleDensity));
  let warmth = Math.max(0.0, Math.min(1.0, options.analogWarmth));
  const mix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  const fs = buffer.sampleRate;
  
  if (options.crackleType !== 'Light Surface Noise') {
    if (options.crackleType === 'Medium Wear Crackle') { intensity = 0.5; density = 0.6; warmth = 0.4; }
    else if (options.crackleType === 'Heavy Vintage Wear') { intensity = 0.8; density = 0.8; warmth = 0.7; }
    else if (options.crackleType === 'Random Pops & Clicks') { intensity = 0.9; density = 0.2; warmth = 0.1; }
    else if (options.crackleType === 'Classic Vinyl Sound') { intensity = 0.4; density = 0.5; warmth = 0.6; }
  }
  
  let f_center = 1000;
  if (options.frequencyRange === 'Low (Bass Crackles)') f_center = 300;
  else if (options.frequencyRange === 'High (Surface Hiss)') f_center = 4000;
  else if (options.frequencyRange === 'Wide (Full Spectrum)') f_center = 2000;
  
  const w0 = (2 * Math.PI * f_center) / fs;
  const Q = 1.0;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0 = alpha, b1 = 0, b2 = -alpha;
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  
  const outBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, fs);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let z1 = 0, z2 = 0;
    let popDecay = 0;
    
    for (let i = 0; i < input.length; i++) {
      const w = Math.random() * 2 - 1;
      const s_hiss = (b0 * w + b2 * z2 - a1 * z1 - a2 * z2) / a0;
      z2 = z1;
      z1 = s_hiss;
      
      const pTrigger = density * 0.0005;
      let x_pop = 0;
      if (Math.random() < pTrigger) {
        x_pop = (Math.random() * 2 - 1) * intensity;
        popDecay = x_pop;
      } else {
        popDecay *= Math.exp(-1 / (0.005 * fs)); // 5ms decay
      }
      
      const s_wet = s_hiss * 0.1 + popDecay;
      const y_sat = Math.tanh(s_wet * (1.0 + warmth * 1.5));
      
      const val = (1 - mix) * input[i] + mix * y_sat;
      output[i] = Math.max(-1.0, Math.min(1.0, val));
    }
  }
  return outBuffer;
}
