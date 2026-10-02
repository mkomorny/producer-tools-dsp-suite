// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioTelephoneOptions {
  telephoneType: 'Landline Phone' | 'Mobile Phone' | 'Vintage Phone' | 'Intercom System' | 'Radio Transmission';
  callQuality: number;
  staticNoise: number;
  compression: number;
  bandwidth: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioTelephone(buffer: AudioBuffer, options: AudioTelephoneOptions, ctx: BaseAudioContext): AudioBuffer {
  const Q = Math.max(0.0, Math.min(1.0, options.callQuality));
  const N_noise = Math.max(0.0, Math.min(1.0, options.staticNoise));
  const C = Math.max(0.0, Math.min(1.0, options.compression));
  const B = Math.max(0.1, Math.min(1.0, options.bandwidth));
  const mix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  
  let f_low = 300 * (2.0 - B);
  let f_high = 3400 * B;
  
  const fs = buffer.sampleRate;
  
  const rcLow = 1.0 / (2 * Math.PI * f_high);
  const dt = 1.0 / fs;
  const alphaLow = dt / (rcLow + dt);
  
  const rcHigh = 1.0 / (2 * Math.PI * f_low);
  const alphaHigh = rcHigh / (rcHigh + dt);

  const outBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
      const input = buffer.getChannelData(c);
      const output = outBuffer.getChannelData(c);
      
      let y_low = 0;
      let x_prev = 0;
      let y_high = 0;
      
      for (let i = 0; i < input.length; i++) {
          const noise = (Math.random() * 2 - 1) * N_noise * 0.05;
          let x_dist = Math.tanh(input[i] * (1.0 + (1.0 - Q) * 2.0)) + noise;
          
          y_low = y_low + alphaLow * (x_dist - y_low);
          y_high = alphaHigh * (y_high + y_low - x_prev);
          x_prev = y_low;
          
          let y_comp = y_high * (1.0 / (1.0 + C * Math.abs(y_high)));
          let processed = Math.max(-1.0, Math.min(1.0, y_comp));
          
          output[i] = (1 - mix) * input[i] + mix * processed;
      }
  }
  return outBuffer;
}
