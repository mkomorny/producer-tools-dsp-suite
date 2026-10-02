// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioReverseReverbOptions {
  buildUpTime: number;
  decayTime: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioReverseReverb(buffer: AudioBuffer, options: AudioReverseReverbOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const buildUpTime = Math.max(0.1, Math.min(5.0, options.buildUpTime));
  const decayTime = Math.max(0.5, Math.min(10.0, options.decayTime));
  const mix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  const fs = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const N = buffer.length;

  if (buffer.length > 50 * 1024 * 1024) throw new Error("File exceeds size limits");

  const outBuffer = audioCtx.createBuffer(numChannels, N, fs);

  const primeDelays = [1103, 1249, 1423, 1601];
  const Dmean = primeDelays.reduce((a,b)=>a+b, 0) / primeDelays.length;
  const grvb = Math.pow(10, -(3 * (Dmean/fs)) / decayTime) * (buildUpTime / (buildUpTime + 0.1));

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    
    // Pass 1: Reverse
    const revData = new Float32Array(N);
    for (let n = 0; n < N; n++) revData[n] = inData[N - 1 - n];

    // Reverb processing
    let apBufs = primeDelays.map(d => new Float32Array(d));
    let apIdxs = primeDelays.map(() => 0);
    const rvbData = new Float32Array(N);

    for (let n = 0; n < N; n++) {
      let x = revData[n];
      let outSum = 0;
      for (let i = 0; i < 4; i++) {
        let wOld = apBufs[i][apIdxs[i]];
        let wNew = x + grvb * wOld;
        apBufs[i][apIdxs[i]] = wNew;
        apIdxs[i] = (apIdxs[i] + 1) % primeDelays[i];
        outSum += wOld;
      }
      rvbData[n] = outSum;
    }

    // Pass 2: Reverse back and mix
    for (let n = 0; n < N; n++) {
      let yWet = rvbData[N - 1 - n];
      outData[n] = inData[n] * (1.0 - mix) + yWet * mix;
    }
  }

  return outBuffer;
}
