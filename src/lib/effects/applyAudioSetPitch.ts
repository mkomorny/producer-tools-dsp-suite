// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioSetPitchOptions {
  semitones: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioSetPitch(buffer: AudioBuffer, options: AudioSetPitchOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const semitones = Math.max(-12.0, Math.min(12.0, options.semitones));
  const fs = buffer.sampleRate;
  
  if (Math.abs(semitones) < 0.01) {
    const outBuf = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, fs);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      outBuf.copyToChannel(buffer.getChannelData(c), c);
    }
    return outBuf;
  }

  const s = Math.pow(2, semitones / 12);
  const numChannels = buffer.numberOfChannels;
  
  const N = 1024;
  const Ha = 256;
  const Hs = Math.round(Ha / s);
  
  const fft = new RealFFT(N);
  
  const w = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    w[n] = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * n) / (N - 1)));
  }

  const scaleRatio = Hs / Ha;
  const outLength = Math.max(1, Math.floor(buffer.length * scaleRatio));
  const outBuffer = audioCtx.createBuffer(numChannels, outLength, fs);

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);

    const thetaPrev = new Float64Array(N / 2 + 1);
    const thetaSyn = new Float64Array(N / 2 + 1);

    let inIdx = 0;
    let outIdx = 0;

    const frameAnalysis = new Float32Array(N);

    while (inIdx + N <= inData.length && outIdx + N <= outData.length) {
      for (let n = 0; n < N; n++) {
        frameAnalysis[n] = inData[inIdx + n] * w[n];
      }

      const fftOut = fft.forward(frameAnalysis);
      const real = fftOut.real;
      const imag = fftOut.imag;

      const synReal = new Float64Array(N / 2 + 1);
      const synImag = new Float64Array(N / 2 + 1);

      for (let k = 0; k <= N / 2; k++) {
        const r = real[k];
        const im = imag[k];
        const mag = Math.sqrt(r * r + im * im);
        const phase = Math.atan2(im, r);

        const omegaK = (2.0 * Math.PI * k) / N;
        let deltaPhi = phase - thetaPrev[k] - Ha * omegaK;
        deltaPhi = Math.atan2(Math.sin(deltaPhi), Math.cos(deltaPhi));

        const fHat = omegaK + deltaPhi / Ha;
        thetaSyn[k] = thetaSyn[k] + Hs * fHat;

        synReal[k] = mag * Math.cos(thetaSyn[k]);
        synImag[k] = mag * Math.sin(thetaSyn[k]);

        thetaPrev[k] = phase;
      }

      const resReal = fft.inverse(synReal, synImag);

      for (let n = 0; n < N; n++) {
        outData[outIdx + n] += resReal[n] * w[n];
      }

      inIdx += Ha;
      outIdx += Hs;
    }

    for (let n = 0; n < outData.length; n++) {
      if (isNaN(outData[n]) || !isFinite(outData[n])) {
        outData[n] = 0.0;
      } else {
        outData[n] = Math.max(-1.0, Math.min(1.0, outData[n]));
      }
    }
  }

  return outBuffer;
}
