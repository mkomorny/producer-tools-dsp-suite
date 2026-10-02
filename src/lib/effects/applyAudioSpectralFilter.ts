// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioSpectralFilterOptions {
  filterType: 'Spectral Enhancement' | 'Notch Filter' | 'Bandpass Filter' | 'High Shelf' | 'Low Shelf' | 'Parametric EQ' | number;
  lowFrequency: number;
  lowGain: number;
  midFrequency: number;
  midGain: number;
  highFrequency: number;
  highGain: number;
  filterSharpness: number;
  resonanceAmount: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioSpectralFilter(buffer: AudioBuffer, options: AudioSpectralFilterOptions, audioCtx: BaseAudioContext): AudioBuffer {
  let filterType = options.filterType;
  if (typeof filterType === 'number') {
    const types = ['Spectral Enhancement', 'Notch Filter', 'Bandpass Filter', 'High Shelf', 'Low Shelf', 'Parametric EQ'] as const;
    filterType = types[filterType] || 'Spectral Enhancement';
  }

  const lowFreq = Math.max(20, Math.min(1000, options.lowFrequency));
  const midFreq = Math.max(200, Math.min(5000, options.midFrequency));
  const highFreq = Math.max(1000, Math.min(Math.min(20000, buffer.sampleRate / 2 - 100), options.highFrequency));
  
  const lowGain = Math.max(-20.0, Math.min(20.0, options.lowGain));
  const midGain = Math.max(-20.0, Math.min(20.0, options.midGain));
  const highGain = Math.max(-20.0, Math.min(20.0, options.highGain));
  
  const sharpness = Math.max(0.01, Math.min(1.0, options.filterSharpness));
  const resonance = Math.max(0.0, Math.min(1.0, options.resonanceAmount));
  const wetDryMix = Math.max(0.0, Math.min(1.0, options.wetDryMix));

  const fs = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  
  const N = 2048;
  const Ha = 512;
  const fft = new RealFFT(N);
  
  const w = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    w[n] = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * n) / (N - 1)));
  }

  const outBuffer = audioCtx.createBuffer(numChannels, buffer.length, fs);
  
  const Vlow = Math.pow(10, lowGain / 20);
  const Vmid = Math.pow(10, midGain / 20);
  const Vhigh = Math.pow(10, highGain / 20);

  const H = new Float32Array(N / 2 + 1);
  for (let k = 0; k <= N / 2; k++) {
    const fk = (k * fs) / N;
    let gain = 1.0;
    
    // Parametric bell curve approximations
    const deltaLow = lowFreq;
    const gLow = 1.0 + (Vlow - 1.0) * Math.exp(-Math.pow(fk - lowFreq, 2) / (2 * Math.pow(sharpness * deltaLow, 2)));
    
    const deltaMid = midFreq * 0.5;
    const gMid = 1.0 + (Vmid - 1.0) * Math.exp(-Math.pow(fk - midFreq, 2) / (2 * Math.pow(sharpness * deltaMid, 2)));
    
    const deltaHigh = highFreq * 0.5;
    const gHigh = 1.0 + (Vhigh - 1.0) * Math.exp(-Math.pow(fk - highFreq, 2) / (2 * Math.pow(sharpness * deltaHigh, 2)));

    gain = gLow * gMid * gHigh;
    
    if (resonance > 0) {
      if (Math.abs(fk - lowFreq) < 50 || Math.abs(fk - midFreq) < 100 || Math.abs(fk - highFreq) < 200) {
         gain *= (1.0 + resonance * 0.5);
      }
    }
    H[k] = gain;
  }

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);

    let idx = 0;
    const frameAnalysis = new Float32Array(N);

    while (idx + N <= inData.length) {
      for (let n = 0; n < N; n++) {
        frameAnalysis[n] = inData[idx + n] * w[n];
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

        const modMag = mag * H[k];

        synReal[k] = modMag * Math.cos(phase);
        synImag[k] = modMag * Math.sin(phase);
      }

      const resReal = fft.inverse(synReal, synImag);

      for (let n = 0; n < N; n++) {
        outData[idx + n] += resReal[n] * w[n];
      }

      idx += Ha;
    }
    
    // Normalize wet overlap-add array back and apply wet/dry mix
    for (let n = 0; n < inData.length; n++) {
      const xWet = outData[n] * 0.5; // OLA compensation factor
      let yOut = inData[n] * (1.0 - wetDryMix) + xWet * wetDryMix;
      if (isNaN(yOut) || !isFinite(yOut)) yOut = 0.0;
      outData[n] = Math.max(-1.0, Math.min(1.0, yOut));
    }
  }

  return outBuffer;
}
