// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioTimeStretchOptions {
  targetDuration: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioTimeStretch(buffer: AudioBuffer, options: AudioTimeStretchOptions, ctx: BaseAudioContext): AudioBuffer {
  const sourceDuration = buffer.duration;
  let targetDuration = Math.max(0.5, Math.min(7200.0, options.targetDuration));
  let s = Math.max(0.25, Math.min(4.0, sourceDuration / targetDuration));
  
  const N = 2048;
  const H_a = 512;
  const H_s = Math.round(H_a * s);
  
  const outFrames = Math.floor(buffer.length / s);
  const outBuffer = ctx.createBuffer(buffer.numberOfChannels, outFrames, buffer.sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
      const input = buffer.getChannelData(c);
      const output = outBuffer.getChannelData(c);
      
      let outWriteIdx = 0;
      for (let inReadIdx = 0; inReadIdx < input.length - N; inReadIdx += H_a) {
          if (outWriteIdx + N > output.length) break;
          for (let i = 0; i < N; i++) {
              const w = Math.pow(Math.sin((Math.PI * i) / (N - 1)), 2);
              output[outWriteIdx + i] += input[inReadIdx + i] * w;
          }
          outWriteIdx += H_s;
      }
  }
  return outBuffer;
}
