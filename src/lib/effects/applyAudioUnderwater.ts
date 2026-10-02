// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioUnderwaterOptions {
  waterEnvironment: 'Deep Ocean' | 'Shallow Water' | 'Swimming Pool' | 'Ocean Surface' | 'Underwater Cave';
  mufflingEffect: number;
  bubbleIntensity: number;
  pressureEffect: number;
  depth: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioUnderwater(buffer: AudioBuffer, options: AudioUnderwaterOptions, ctx: BaseAudioContext): AudioBuffer {
  const M = Math.max(0.0, Math.min(1.0, options.mufflingEffect));
  const B = Math.max(0.0, Math.min(1.0, options.bubbleIntensity));
  const P = Math.max(0.0, Math.min(1.0, options.pressureEffect));
  const d = Math.max(1, Math.min(100, Math.round(options.depth)));
  const mix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  const fs = buffer.sampleRate;
  
  const f_base = 20000 * (1.0 - M);
  const f_cutoff = Math.max(150.0, f_base * (1.0 - (d / 100) * 0.5));
  
  const w0 = (2 * Math.PI * f_cutoff) / fs;
  const Q = 0.5;
  const alpha = Math.sin(w0) / (2 * Q);
  
  const b1_lp = 1 - Math.cos(w0);
  const b0_lp = b1_lp / 2;
  const b2_lp = b0_lp;
  const a0_lp = 1 + alpha;
  const a1_lp = -2 * Math.cos(w0);
  const a2_lp = 1 - alpha;
  
  const f_drift = 0.2;
  const d_theta_press = (2 * Math.PI * f_drift) / fs;
  const delayBase = 44.1 * 5; 
  
  const outBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, fs);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let z1 = 0, z2 = 0;
    let theta_press = 0;
    const maxDelay = Math.ceil(delayBase + 44.1) + 2;
    const history = new Float32Array(maxDelay);
    let writePtr = 0;
    
    let bubblePhase = 0;
    let bubbleActive = 0;
    let bubbleFreq = 0;
    
    for (let i = 0; i < input.length; i++) {
      history[writePtr] = input[i];
      
      theta_press = (theta_press + d_theta_press) % (2 * Math.PI);
      const delaySamples = delayBase + Math.sin(theta_press) * P * 44.1;
      
      const k = Math.floor(delaySamples);
      const frac = delaySamples - k;
      
      const idx1 = (writePtr - k + maxDelay) % maxDelay;
      const idx2 = (writePtr - k - 1 + maxDelay) % maxDelay;
      const delayed = (1 - frac) * history[idx1] + frac * history[idx2];
      
      const y_muff = (b0_lp * delayed + b1_lp * history[(writePtr - 1 + maxDelay)%maxDelay] + b2_lp * history[(writePtr - 2 + maxDelay)%maxDelay] - a1_lp * z1 - a2_lp * z2) / a0_lp;
      z2 = z1;
      z1 = y_muff;
      
      let x_bubbles = 0;
      if (bubbleActive > 0) {
        x_bubbles = Math.sin(bubblePhase) * (bubbleActive / 1000);
        bubblePhase += (2 * Math.PI * bubbleFreq) / fs;
        bubbleActive--;
      } else if (Math.random() < B * 0.0001) {
        bubbleActive = Math.floor(Math.random() * 1000 + 500);
        bubbleFreq = Math.random() * 400 + 100;
        bubblePhase = 0;
      }
      
      const y_wet = y_muff + x_bubbles * B * 0.15;
      
      const val = (1 - mix) * input[i] + mix * y_wet;
      output[i] = Math.max(-1.0, Math.min(1.0, val));
      
      writePtr = (writePtr + 1) % maxDelay;
    }
  }
  return outBuffer;
}
