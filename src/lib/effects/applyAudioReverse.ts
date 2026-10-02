// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioReverseOptions {
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioReverse(buffer: AudioBuffer, options: AudioReverseOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const fs = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const Ntotal = buffer.length;

  if (buffer.length > 50 * 1024 * 1024) throw new Error("File exceeds size limits");

  const outBuffer = audioCtx.createBuffer(numChannels, Ntotal, fs);

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    for (let n = 0; n < Ntotal; n++) {
      outData[n] = inData[Ntotal - 1 - n];
    }
  }

  return outBuffer;
}
