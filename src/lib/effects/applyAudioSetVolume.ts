// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioSetVolumeOptions {
  mode: 'Percent (%)' | 'Decibels (dB)' | number;
  targetLevel: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioSetVolume(buffer: AudioBuffer, options: AudioSetVolumeOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const targetLevel = Math.max(-80.0, Math.min(1000.0, options.targetLevel));
  const numChannels = buffer.numberOfChannels;
  const fs = buffer.sampleRate;
  const outBuffer = audioCtx.createBuffer(numChannels, buffer.length, fs);

  let Glinear = 1.0;
  if (options.mode === 'Percent (%)' || options.mode === 0) {
    Glinear = targetLevel / 100.0;
  } else {
    Glinear = Math.pow(10, targetLevel / 20);
  }

  if (Glinear <= 0.0001) {
    for (let c = 0; c < numChannels; c++) {
      outBuffer.getChannelData(c).fill(0.0);
    }
    return outBuffer;
  }

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);

    for (let n = 0; n < inData.length; n++) {
      const val = inData[n] * Glinear;
      outData[n] = Math.max(-1.0, Math.min(1.0, val));
    }
  }

  return outBuffer;
}
