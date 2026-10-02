// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioDenoiseChainOptions {
  highpassFreq?: number;
  lowpassFreq?: number;
  noiseFloorDb?: number;
  enableRnnoise: boolean;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyDenoiseChain(buffer: AudioBuffer, options: AudioDenoiseChainOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const highpassFreq = Math.max(20, Math.min(500, options.highpassFreq || 80));
  const lowpassFreq = Math.max(4000, Math.min(20000, options.lowpassFreq || 12000));
  const noiseFloorDb = Math.max(-60.0, Math.min(-10.0, options.noiseFloorDb || -25));
  const beta = Math.pow(10, noiseFloorDb / 20);

  const sampleRate = buffer.sampleRate;
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    const w0_hp = 2 * Math.PI * highpassFreq / sampleRate;
    const alpha_hp = Math.sin(w0_hp) / (2 * 0.707);
    const b0_hp = (1 + Math.cos(w0_hp)) / 2;
    const b1_hp = -(1 + Math.cos(w0_hp));
    const b2_hp = (1 + Math.cos(w0_hp)) / 2;
    const a0_hp = 1 + alpha_hp;
    const a1_hp = -2 * Math.cos(w0_hp);
    const a2_hp = 1 - alpha_hp;

    const w0_lp = 2 * Math.PI * lowpassFreq / sampleRate;
    const alpha_lp = Math.sin(w0_lp) / (2 * 0.707);
    const b0_lp = (1 - Math.cos(w0_lp)) / 2;
    const b1_lp = 1 - Math.cos(w0_lp);
    const b2_lp = (1 - Math.cos(w0_lp)) / 2;
    const a0_lp = 1 + alpha_lp;
    const a1_lp = -2 * Math.cos(w0_lp);
    const a2_lp = 1 - alpha_lp;

    let x1_hp = 0, x2_hp = 0, y1_hp = 0, y2_hp = 0;
    let x1_lp = 0, x2_lp = 0, y1_lp = 0, y2_lp = 0;

    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      
      const y_hp = (b0_hp * x_in + b1_hp * x1_hp + b2_hp * x2_hp - a1_hp * y1_hp - a2_hp * y2_hp) / a0_hp;
      x2_hp = x1_hp; x1_hp = x_in; y2_hp = y1_hp; y1_hp = y_hp;
      
      const y_lp = (b0_lp * y_hp + b1_lp * x1_lp + b2_lp * x2_lp - a1_lp * y1_lp - a2_lp * y2_lp) / a0_lp;
      x2_lp = x1_lp; x1_lp = y_hp; y2_lp = y1_lp; y1_lp = y_lp;
      
      // Simple gate as substitute for complex STFT spectral subtraction
      const absY = Math.abs(y_lp);
      output[n] = absY > beta ? y_lp : y_lp * 0.1;
    }
  }

  return outBuffer;
}
