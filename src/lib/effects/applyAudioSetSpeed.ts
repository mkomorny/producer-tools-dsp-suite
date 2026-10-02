// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioSetSpeedOptions {
  speedFactor: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioSetSpeed(buffer: AudioBuffer, options: AudioSetSpeedOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const speedFactor = Math.max(0.25, Math.min(4.0, options.speedFactor));
  const fs = buffer.sampleRate;
  
  if (Math.abs(speedFactor - 1.0) < 0.01) {
    const outBuf = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, fs);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      outBuf.copyToChannel(buffer.getChannelData(c), c);
    }
    return outBuf;
  }

  const numChannels = buffer.numberOfChannels;
  const Nwin = 2048;
  const Hsyn = 512;
  const Hana = Math.floor(Hsyn * speedFactor);
  const deltaMax = 128;

  const outLength = Math.max(1, Math.floor(buffer.length / speedFactor));
  const outBuffer = audioCtx.createBuffer(numChannels, outLength, fs);

  const w = new Float32Array(Nwin);
  for (let n = 0; n < Nwin; n++) {
    w[n] = Math.pow(Math.sin((Math.PI * n) / (Nwin - 1)), 2);
  }

  for (let c = 0; c < numChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);

    let inIdx = 0;
    let outIdx = 0;

    while (inIdx + Nwin < input.length && outIdx + Nwin < output.length) {
      let bestTau = 0;
      let maxCorr = -Infinity;

      if (outIdx > 0) {
        for (let tau = -deltaMax; tau <= deltaMax; tau++) {
          const currentInIdx = inIdx + tau;
          if (currentInIdx < 0 || currentInIdx + Nwin >= input.length) continue;

          let num = 0;
          let den1 = 0;
          let den2 = 0;

          const overlapLen = Hsyn; 
          for (let n = 0; n < overlapLen; n++) {
            const x = input[currentInIdx + n];
            const y = output[outIdx + n];
            num += x * y;
            den1 += x * x;
            den2 += y * y;
          }

          const den = Math.sqrt(den1 * den2);
          const corr = den > 1e-8 ? num / den : 0;

          if (corr > maxCorr) {
            maxCorr = corr;
            bestTau = tau;
          }
        }
      }

      const optimalInIdx = Math.max(0, Math.min(input.length - Nwin, inIdx + bestTau));

      for (let n = 0; n < Nwin; n++) {
        output[outIdx + n] += input[optimalInIdx + n] * w[n];
      }

      inIdx += Hana;
      outIdx += Hsyn;
    }

    for (let n = 0; n < output.length; n++) {
      if (isNaN(output[n]) || !isFinite(output[n])) {
        output[n] = 0.0;
      } else {
        output[n] = Math.max(-1.0, Math.min(1.0, output[n]));
      }
    }
  }

  return outBuffer;
}
