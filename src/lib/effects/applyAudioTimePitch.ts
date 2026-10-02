// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioTimePitchOptions {
  mode: 'Time Stretch (no pitch change)' | 'Pitch Shift (no speed change)';
  tempoFactor: number;
  pitchShift: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioTimePitch(buffer: AudioBuffer, options: AudioTimePitchOptions, ctx: BaseAudioContext): AudioBuffer {
  const tempoFactor = Math.max(0.25, Math.min(4.0, options.tempoFactor));
  const pitchShift = Math.max(-12, Math.min(12, Math.round(options.pitchShift)));
  
  let T = tempoFactor;
  let S = 1.0;
  if (options.mode === 'Pitch Shift (no speed change)') {
      S = Math.pow(2, pitchShift / 12);
      T = 1.0 / S;
  }
  
  const N_win = 2048;
  const H_syn = Math.floor(N_win / 4);
  const H_ana = Math.floor(H_syn * T);

  const numChannels = buffer.numberOfChannels;
  const stretchedFrames = Math.floor(buffer.length / T);
  const outFrames = Math.floor(stretchedFrames / S);
  const outBuffer = ctx.createBuffer(numChannels, outFrames, buffer.sampleRate);
  
  const stretchedBuffer = new Float32Array(stretchedFrames);

  for (let c = 0; c < numChannels; c++) {
    const input = buffer.getChannelData(c);
    stretchedBuffer.fill(0);
    
    let outWriteIdx = 0;
    for (let inReadIdx = 0; inReadIdx < input.length - N_win; inReadIdx += H_ana) {
      if (outWriteIdx + N_win > stretchedBuffer.length) break;
      for (let i = 0; i < N_win; i++) {
        const w = Math.pow(Math.sin((Math.PI * i) / (N_win - 1)), 2);
        stretchedBuffer[outWriteIdx + i] += input[inReadIdx + i] * w;
      }
      outWriteIdx += H_syn;
    }
    
    const output = outBuffer.getChannelData(c);
    for (let i = 0; i < outFrames; i++) {
        const srcIdx = i * S;
        const idx1 = Math.floor(srcIdx);
        const idx2 = Math.min(idx1 + 1, stretchedFrames - 1);
        const frac = srcIdx - idx1;
        const val = (1 - frac) * stretchedBuffer[idx1] + frac * stretchedBuffer[idx2];
        output[i] = Math.max(-1.0, Math.min(1.0, val));
    }
  }
  return outBuffer;
}
