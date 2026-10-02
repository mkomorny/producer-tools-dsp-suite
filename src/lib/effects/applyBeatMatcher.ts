// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface BeatMatcherOptions {
  sourceBpm?: number | null;
  targetBpm: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyBeatMatcher(
  buffer: AudioBuffer,
  options: BeatMatcherOptions,
  audioCtx: BaseAudioContext
): AudioBuffer {
  let sourceBpm = options.sourceBpm;
  if (sourceBpm === null || sourceBpm === undefined) {
    sourceBpm = 120.0;
  }
  sourceBpm = Math.max(40.0, Math.min(240.0, sourceBpm));
  const targetBpm = Math.max(40.0, Math.min(240.0, options.targetBpm));
  
  const alpha = targetBpm / sourceBpm;
  
  if (Math.abs(alpha - 1.0) < 0.001) {
    return buffer;
  }
  
  const N = 2048;
  const Ha = 512;
  const Hs = Math.floor(alpha * Ha);
  
  const sampleRate = buffer.sampleRate;
  const outLength = Math.floor(buffer.length / alpha);
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, outLength, sampleRate);
  
  const hanningWindow = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    hanningWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
  }
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let m = 0;
    while (m * Ha + N < input.length && m * Hs + N < output.length) {
      for (let i = 0; i < N; i++) {
        output[m * Hs + i] += input[m * Ha + i] * hanningWindow[i];
      }
      m++;
    }
  }
  
  return outBuffer;
}
