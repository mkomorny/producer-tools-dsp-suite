// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

// ==========================================
// ADDITIONAL DSP EFFECTS (Vibrato, Vinyl Crackle, Vocoder, Treble Boost, Tremolo, Underwater)
// ==========================================

export interface AudioVibratoOptions {
  rate: number;
  depth: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioVibrato(buffer: AudioBuffer, options: AudioVibratoOptions, ctx: BaseAudioContext): AudioBuffer {
  const rate = Math.max(0.5, Math.min(20.0, options.rate));
  const depth = Math.max(0.0, Math.min(1.0, options.depth));
  const fs = buffer.sampleRate;
  
  const delayBase = 0.005 * fs; // 5ms
  const modWidth = depth * delayBase;
  const maxDelay = Math.ceil(delayBase + modWidth) + 2;
  
  const deltaTheta = (2 * Math.PI * rate) / fs;
  
  const outBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, fs);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    const history = new Float32Array(maxDelay);
    
    let theta = 0;
    let writePtr = 0;
    
    for (let i = 0; i < input.length; i++) {
      const lfo = Math.sin(theta);
      const D = delayBase + modWidth * lfo;
      
      const k = Math.floor(D);
      const frac = D - k;
      
      history[writePtr] = input[i];
      
      const idx1 = (writePtr - k + maxDelay) % maxDelay;
      const idx2 = (writePtr - k - 1 + maxDelay) % maxDelay;
      
      if (depth === 0) {
          output[i] = input[i];
      } else {
          output[i] = (1.0 - frac) * history[idx1] + frac * history[idx2];
      }
      
      theta = (theta + deltaTheta) % (2 * Math.PI);
      writePtr = (writePtr + 1) % maxDelay;
    }
  }
  return outBuffer;
}
