// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioGateTrimOptions {
  thresholdDb: number;
  ratio: number;
  attackMs: number;
  releaseMs: number;
  makeupGainDb: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyGateTrim(buffer: AudioBuffer, options: AudioGateTrimOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const thresholdDb = Math.max(-80.0, Math.min(0.0, options.thresholdDb));
  const ratio = Math.max(1.0, Math.min(50.0, options.ratio));
  const attackMs = Math.max(0.1, Math.min(100.0, options.attackMs));
  const releaseMs = Math.max(10.0, Math.min(2000.0, options.releaseMs));
  const makeupGainDb = Math.max(0.0, Math.min(24.0, options.makeupGainDb));
  
  const sampleRate = buffer.sampleRate;
  const alpha_attack = Math.exp(-1 / ((attackMs / 1000) * sampleRate));
  const alpha_release = Math.exp(-1 / ((releaseMs / 1000) * sampleRate));
  const g_makeup = Math.pow(10, makeupGainDb / 20);
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let E = -100;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      const X_dB = 20 * Math.log10(Math.abs(x_in) + 1e-7);
      
      if (X_dB > E) {
        E = alpha_attack * E + (1 - alpha_attack) * X_dB;
      } else {
        E = alpha_release * E + (1 - alpha_release) * X_dB;
      }
      
      let G_dB = 0;
      if (E < thresholdDb) {
        G_dB = (thresholdDb - E) * (1 - ratio);
      }
      
      const g_gate = Math.pow(10, G_dB / 20);
      output[n] = x_in * g_gate * g_makeup;
    }
  }
  
  return outBuffer;
}
