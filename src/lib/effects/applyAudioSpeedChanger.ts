// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioSpeedChangerOptions {
  speed: number;
  quality: 'High Quality (slower processing)' | 'Medium Quality' | 'Low Quality (faster processing)' | number;
  outputFormat: 'MP3' | 'WAV' | 'FLAC' | 'AAC' | 'OGG' | 'M4A' | 'Opus';
}

export function applyAudioSpeedChanger(buffer: AudioBuffer, options: AudioSpeedChangerOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const speed = Math.max(0.25, Math.min(4.0, options.speed));
  const fs = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;

  if (Math.abs(speed - 1.0) < 0.01) {
    const outBuf = audioCtx.createBuffer(numChannels, buffer.length, fs);
    for (let c = 0; c < numChannels; c++) {
      outBuf.copyToChannel(buffer.getChannelData(c), c);
    }
    return outBuf;
  }

  let quality = options.quality;
  if (typeof quality === 'number') {
    const qMap = ['High Quality (slower processing)', 'Medium Quality', 'Low Quality (faster processing)'] as const;
    quality = qMap[quality] || 'High Quality (slower processing)';
  }

  let Nwin = 2048;
  let Hsyn = 512;
  let deltaMax = 128;

  if (quality === 'Medium Quality') {
    Nwin = 1536;
    Hsyn = 384;
    deltaMax = 96;
  } else if (quality === 'Low Quality (faster processing)') {
    Nwin = 1024;
    Hsyn = 256;
    deltaMax = 64;
  }

  const Hana = Math.floor(Hsyn * speed);
  const outLength = Math.max(1, Math.floor(buffer.length / speed));
  const outBuffer = audioCtx.createBuffer(numChannels, outLength, fs);

  const w = new Float32Array(Nwin);
  for (let n = 0; n < Nwin; n++) {
    w[n] = Math.pow(Math.sin((Math.PI * n) / (Nwin - 1)), 2);
  }

  const inData = Array.from({ length: numChannels }, (_, c) => buffer.getChannelData(c));
  const outData = Array.from({ length: numChannels }, (_, c) => outBuffer.getChannelData(c));

  let inIdx = 0;
  let outIdx = 0;

  while (inIdx + Nwin < buffer.length && outIdx + Nwin < outLength) {
    let bestTau = 0;
    let maxCorr = -Infinity;

    if (outIdx > 0) {
      for (let tau = -deltaMax; tau <= deltaMax; tau++) {
        const currentInIdx = inIdx + tau;
        if (currentInIdx < 0 || currentInIdx + Nwin >= buffer.length) continue;

        let num = 0;
        let den1 = 0;
        let den2 = 0;

        // Unified multi-channel cross-correlation to preserve stereo phase
        for (let c = 0; c < numChannels; c++) {
          const inputChannel = inData[c];
          const outputChannel = outData[c];
          for (let n = 0; n < Hsyn; n++) {
            const x = inputChannel[currentInIdx + n];
            const y = outputChannel[outIdx + n];
            num += x * y;
            den1 += x * x;
            den2 += y * y;
          }
        }

        const den = Math.sqrt(den1 * den2);
        const corr = den > 1e-8 ? num / den : 0;

        if (corr > maxCorr) {
          maxCorr = corr;
          bestTau = tau;
        }
      }
    }

    const optimalInIdx = Math.max(0, Math.min(buffer.length - Nwin, inIdx + bestTau));

    for (let c = 0; c < numChannels; c++) {
      const inputChannel = inData[c];
      const outputChannel = outData[c];
      for (let n = 0; n < Nwin; n++) {
        outputChannel[outIdx + n] += inputChannel[optimalInIdx + n] * w[n];
      }
    }

    inIdx += Hana;
    outIdx += Hsyn;
  }

  for (let c = 0; c < numChannels; c++) {
    const outputChannel = outData[c];
    for (let n = 0; n < outputChannel.length; n++) {
      if (isNaN(outputChannel[n]) || !isFinite(outputChannel[n])) {
        outputChannel[n] = 0.0;
      } else {
        outputChannel[n] = Math.max(-1.0, Math.min(1.0, outputChannel[n]));
      }
    }
  }

  return outBuffer;
}
