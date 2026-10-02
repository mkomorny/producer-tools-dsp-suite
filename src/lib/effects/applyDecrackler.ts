// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface DecracklerOptions {
  decrackleIntensity: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
  noiseProfile: 'Light' | 'Moderate' | 'Heavy' | 'Extreme';
  audioSmoothing: 'None' | 'Light' | 'Medium' | 'Strong';
  outputFormat: 'MP3' | 'WAV' | 'FLAC' | 'AAC' | 'OGG' | 'M4A';
}

export function applyDecrackler(buffer: AudioBuffer, options: DecracklerOptions, audioCtx: BaseAudioContext): AudioBuffer {
  let S = 2.5;
  if (options.decrackleIntensity === 'Very Low') S = 4.5;
  else if (options.decrackleIntensity === 'Low') S = 3.5;
  else if (options.decrackleIntensity === 'High') S = 2.0;
  else if (options.decrackleIntensity === 'Very High') S = 1.2;
  
  let g_smooth = 0.35;
  if (options.audioSmoothing === 'None') g_smooth = 0.0;
  else if (options.audioSmoothing === 'Medium') g_smooth = 0.6;
  else if (options.audioSmoothing === 'Strong') g_smooth = 0.85;
  
  let W = 10;
  if (options.noiseProfile === 'Light') W = 5;
  else if (options.noiseProfile === 'Heavy') W = 20;
  else if (options.noiseProfile === 'Extreme') W = 40;
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    output.set(input);
    
    const tke = new Float32Array(input.length);
    for (let n = 1; n < input.length - 1; n++) {
      const x_hp_n = input[n] - input[n-1];
      const x_hp_prev = input[n-1] - (n >= 2 ? input[n-2] : 0);
      const x_hp_next = input[n+1] - input[n];
      tke[n] = (x_hp_n * x_hp_n) - (x_hp_prev * x_hp_next);
    }
    
    for (let n = 2; n < input.length - 2; n++) {
      let sum = 0;
      for (let k = 0; k < W; k++) {
        if (n - k >= 0) sum += tke[n - k];
      }
      const mu_psi = sum / W;
      
      if (tke[n] > S * mu_psi) {
        output[n] = (1 - g_smooth) * input[n] + g_smooth * ((input[n-1] + input[n+1]) / 2);
      }
    }
  }
  
  return outBuffer;
}
