// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioRingModulatorOptions {
  carrierHz: number;
  modulationDepth: number;
  carrierWaveform: 'Sine Wave (Smooth)' | 'Square Wave (Harsh)' | 'Sawtooth (Bright)' | 'Triangle (Soft)';
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioRingModulator(buffer: AudioBuffer, options: AudioRingModulatorOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const fc = Math.max(20, Math.min(20000, options.carrierHz));
  const depth = Math.max(0.0, Math.min(2.0, options.modulationDepth));
  const mix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  const fs = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const outBuffer = audioCtx.createBuffer(numChannels, buffer.length, fs);

  const deltaTheta = (2 * Math.PI * fc) / fs;

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    let theta = 0;

    for (let n = 0; n < inData.length; n++) {
      let xIn = inData[n];
      let cn = 0;
      
      if (options.carrierWaveform === 'Sine Wave (Smooth)') {
        cn = Math.sin(theta);
      } else if (options.carrierWaveform === 'Triangle (Soft)') {
        cn = (2 / Math.PI) * Math.asin(Math.sin(theta));
      } else if (options.carrierWaveform === 'Sawtooth (Bright)') {
        let normTheta = theta / (2 * Math.PI);
        cn = 2 * (normTheta - Math.floor(normTheta + 0.5));
      } else if (options.carrierWaveform === 'Square Wave (Harsh)') {
        cn = Math.sin(theta) >= 0 ? 1 : -1;
      }
      
      let yWet = xIn * (cn * depth);
      let yOut = (1 - mix) * xIn + mix * yWet;
      outData[n] = Math.max(-1.0, Math.min(1.0, yOut));
      
      theta = (theta + deltaTheta) % (2 * Math.PI);
    }
  }

  return outBuffer;
}
