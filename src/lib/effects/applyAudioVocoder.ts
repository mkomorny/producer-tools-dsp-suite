// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioVocoderOptions {
  carrierType: 'Synthesized Carrier' | 'Noise Carrier' | 'Pulse Carrier' | 'Harmonic-rich Carrier';
  carrierBaseFrequency: number;
  carrierWaveform: 'Sawtooth (Bright)' | 'Sine (Pure)' | 'Square (Harsh)' | 'Triangle (Soft)';
  frequencyBands: number;
  analysisWindow: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioVocoder(buffer: AudioBuffer, options: AudioVocoderOptions, ctx: BaseAudioContext): AudioBuffer {
  const f_c = Math.max(20.0, Math.min(1000.0, options.carrierBaseFrequency));
  const bands = Math.max(4, Math.min(32, Math.round(options.frequencyBands)));
  const t_w = Math.max(10.0, Math.min(200.0, options.analysisWindow));
  const mix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  const fs = buffer.sampleRate;
  
  const alphaEnv = Math.exp(-1 / (fs * (t_w / 1000)));
  
  const outBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, fs);
  const deltaThetaC = (2 * Math.PI * f_c) / fs;
  
  const filters = [];
  for (let k = 0; k < bands; k++) {
    const fCenter = 300 * Math.pow(8000 / 300, k / (Math.max(1, bands - 1)));
    const w0 = (2 * Math.PI * fCenter) / fs;
    const Q = 4.0;
    const alpha = Math.sin(w0) / (2 * Q);
    filters.push({
      b0: alpha, b1: 0, b2: -alpha,
      a0: 1 + alpha, a1: -2 * Math.cos(w0), a2: 1 - alpha
    });
  }
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let thetaC = 0;
    
    const modStates = Array(bands).fill(0).map(() => ({ z1: 0, z2: 0, env: 0 }));
    const carStates = Array(bands).fill(0).map(() => ({ z1: 0, z2: 0 }));
    
    for (let i = 0; i < input.length; i++) {
      let x_car = 0;
      if (options.carrierType === 'Noise Carrier') {
        x_car = Math.random() * 2 - 1;
      } else {
        if (options.carrierWaveform === 'Sine (Pure)') x_car = Math.sin(thetaC);
        else if (options.carrierWaveform === 'Square (Harsh)') x_car = Math.sin(thetaC) > 0 ? 1 : -1;
        else if (options.carrierWaveform === 'Triangle (Soft)') x_car = 2 * Math.abs(2 * (thetaC / (2 * Math.PI) - Math.floor(thetaC / (2 * Math.PI) + 0.5))) - 1;
        else x_car = 2 * (thetaC / (2 * Math.PI) - Math.floor(thetaC / (2 * Math.PI) + 0.5)); // Sawtooth
      }
      thetaC = (thetaC + deltaThetaC) % (2 * Math.PI);
      
      const x_mod = input[i];
      let y_wet = 0;
      
      for (let k = 0; k < bands; k++) {
        const { b0, b1, b2, a0, a1, a2 } = filters[k];
        
        const stM = modStates[k];
        const v_mod = (b0 * x_mod + b2 * stM.z2 - a1 * stM.z1 - a2 * stM.z2) / a0;
        stM.z2 = stM.z1; stM.z1 = v_mod;
        stM.env = alphaEnv * stM.env + (1 - alphaEnv) * Math.abs(v_mod);
        
        const stC = carStates[k];
        const v_car = (b0 * x_car + b2 * stC.z2 - a1 * stC.z1 - a2 * stC.z2) / a0;
        stC.z2 = stC.z1; stC.z1 = v_car;
        
        y_wet += v_car * stM.env;
      }
      
      const val = (1 - mix) * x_mod + mix * y_wet * 2.0; 
      output[i] = Math.max(-1.0, Math.min(1.0, val));
    }
  }
  return outBuffer;
}
