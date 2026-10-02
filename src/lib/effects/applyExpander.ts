// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface ExpanderOptions {
  thresholdDb: number;
  ratio: number;
  attackMs: number;
  releaseMs: number;
  makeupDb: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyExpander(buffer: AudioBuffer, options: ExpanderOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const thresholdDb = Math.max(-80.0, Math.min(0.0, options.thresholdDb));
  const ratio = Math.max(1.0, Math.min(4.0, options.ratio));
  const attackMs = Math.max(0.1, Math.min(100.0, options.attackMs));
  const releaseMs = Math.max(10.0, Math.min(1000.0, options.releaseMs));
  const makeupDb = Math.max(0.0, Math.min(24.0, options.makeupDb));
  
  const sampleRate = buffer.sampleRate;
  const alpha_attack = Math.exp(-1 / ((attackMs / 1000) * sampleRate));
  const alpha_release = Math.exp(-1 / ((releaseMs / 1000) * sampleRate));
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let g_env = 0;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      const x_dB = 20 * Math.log10(Math.abs(x_in) + 1e-7);
      
      let G_c = 0;
      if (x_dB < thresholdDb) {
        G_c = (x_dB - thresholdDb) * (ratio - 1);
      }
      
      const delta_dB = G_c;
      
      if (delta_dB < g_env) {
        g_env = alpha_attack * g_env + (1 - alpha_attack) * delta_dB;
      } else {
        g_env = alpha_release * g_env + (1 - alpha_release) * delta_dB;
      }
      
      const g_linear = Math.pow(10, (g_env + makeupDb) / 20);
      output[n] = x_in * g_linear;
    }
  }
  
  return outBuffer;
}
