// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioGranulatorOptions {
  grainSizeMs: number;
  grainDensity: number;
  timeSprayMs: number;
  pitchShift: number;
  randomness: number;
  grainOverlap: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyGranulator(buffer: AudioBuffer, options: AudioGranulatorOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const grainSizeMs = Math.max(1, Math.min(500, options.grainSizeMs));
  const grainDensity = Math.max(1, Math.min(100, options.grainDensity));
  const timeSprayMs = Math.max(0, Math.min(100, options.timeSprayMs));
  const pitchShift = Math.max(0.25, Math.min(4.0, options.pitchShift));
  const randomness = Math.max(0.0, Math.min(1.0, options.randomness));
  const wetDryMix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  
  const sampleRate = buffer.sampleRate;
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  const N_i = Math.floor((grainSizeMs * sampleRate) / 1000);
  const spawnInterval = Math.floor(sampleRate / grainDensity);
  const timeSpraySamples = Math.floor((timeSprayMs * sampleRate) / 1000);
  
  interface Grain {
    p_i: number;
    s_i: number;
    age: number;
  }
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    let activeGrains: Grain[] = [];
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      
      if (n % spawnInterval === 0) {
        const p_i = n + (Math.random() * 2 - 1) * timeSpraySamples;
        const s_i = pitchShift * (1.0 + (Math.random() * 2 - 1) * randomness);
        activeGrains.push({ p_i: Math.max(0, Math.min(input.length - 1, p_i)), s_i, age: 0 });
      }
      
      let y_wet = 0;
      for (let i = activeGrains.length - 1; i >= 0; i--) {
        const grain = activeGrains[i];
        const w_i = Math.pow(Math.sin((Math.PI * grain.age) / (N_i - 1)), 2);
        const readPos = grain.p_i + grain.age * grain.s_i;
        
        let sample = 0;
        if (readPos >= 0 && readPos < input.length - 1) {
          const p_floor = Math.floor(readPos);
          const frac = readPos - p_floor;
          sample = input[p_floor] * (1 - frac) + input[p_floor + 1] * frac;
        }
        
        y_wet += w_i * sample;
        grain.age++;
        
        if (grain.age >= N_i) {
          activeGrains.splice(i, 1);
        }
      }
      
      output[n] = (1 - wetDryMix) * x_in + wetDryMix * y_wet;
    }
  }
  
  return outBuffer;
}
