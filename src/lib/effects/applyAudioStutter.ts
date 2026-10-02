// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioStutterOptions {
  stutterType: 'Fast Chopping' | 'Medium Rhythm' | 'Slow Repeats' | 'Random Glitches' | 'Pitch-shifted' | 'Feedback Style';
  stutterRateHz: number;
  stutterLengthSec: number;
  randomness: number;
  pitchShift: number;
  feedbackAmount: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioStutter(buffer: AudioBuffer, options: AudioStutterOptions, ctx: BaseAudioContext): AudioBuffer {
  let rateHz = Math.max(0.1, Math.min(50.0, options.stutterRateHz));
  let lenSec = Math.max(0.01, Math.min(1.0, options.stutterLengthSec));
  const rand = Math.max(0.0, Math.min(1.0, options.randomness));
  const pShift = Math.max(0.5, Math.min(3.0, options.pitchShift));
  const fbAmount = Math.max(0.0, Math.min(0.9, options.feedbackAmount));
  const mix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  
  if (options.stutterType === 'Fast Chopping') { rateHz = 16; lenSec = 0.03; }
  else if (options.stutterType === 'Slow Repeats') { rateHz = 2; lenSec = 0.25; }
  else if (options.stutterType === 'Pitch-shifted') { rateHz = 8; lenSec = 0.1; }

  const N_per = Math.floor(buffer.sampleRate / rateHz);
  const N_len = Math.floor(lenSec * buffer.sampleRate);
  
  const outBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
      const input = buffer.getChannelData(c);
      const output = outBuffer.getChannelData(c);
      
      let i = 0;
      let nextStutterStart = N_per;
      let isStuttering = false;
      let stutterEnd = 0;
      let p_read = 0;
      let stutterStartIdx = 0;
      
      const stutBuffer = new Float32Array(N_len);
      let lastOutput = 0;

      while (i < input.length) {
          if (!isStuttering && i >= nextStutterStart) {
              isStuttering = true;
              stutterEnd = Math.min(i + N_len, input.length);
              p_read = 0;
              stutterStartIdx = i;
              for (let k = 0; k < N_len && i + k < input.length; k++) stutBuffer[k] = input[i+k];
              const drift = 1.0 + ((Math.random() * 2 - 1) * rand);
              nextStutterStart = i + Math.floor(N_per * drift);
          }
          
          if (isStuttering) {
              const idx1 = Math.floor(p_read);
              const idx2 = (idx1 + 1) % N_len;
              const frac = p_read - idx1;
              let sample = (1 - frac) * stutBuffer[idx1] + frac * stutBuffer[idx2];
              
              const localI = i - stutterStartIdx;
              if (localI < 240) sample *= (localI / 240);
              else if (stutterEnd - i < 240) sample *= ((stutterEnd - i) / 240);
              
              stutBuffer[idx1] += lastOutput * fbAmount;
              
              output[i] = (1 - mix) * input[i] + mix * sample;
              lastOutput = sample;
              
              p_read = (p_read + pShift) % N_len;
              
              if (i >= stutterEnd) isStuttering = false;
          } else {
              output[i] = input[i];
              lastOutput = 0;
          }
          i++;
      }
  }
  return outBuffer;
}
