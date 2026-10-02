// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioConverterOptions {
  outputFormat: 'MP3' | 'WAV' | 'FLAC' | 'AAC' | 'OGG' | 'M4A';
  audioBitrate?: '64 kbps' | '96 kbps' | '128 kbps' | '192 kbps' | '256 kbps' | '320 kbps';
  sampleRate?: '22.05 kHz' | '44.1 kHz' | '48 kHz' | '96 kHz';
  audioChannels: 'Auto' | 'Mono' | 'Stereo';
  compressionQuality: 'Auto' | 0 | 2 | 5 | 9;
  volumeAdjustment: number;
}

export function applyAudioConverter(buffer: AudioBuffer, options: AudioConverterOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const volAdjust = Math.max(10, Math.min(200, options.volumeAdjustment));
  const g_linear = volAdjust / 100;
  
  let targetChannels = buffer.numberOfChannels;
  if (options.audioChannels === 'Mono') targetChannels = 1;
  else if (options.audioChannels === 'Stereo') targetChannels = 2;
  
  const outBuffer = audioCtx.createBuffer(targetChannels, buffer.length, buffer.sampleRate);
  
  if (targetChannels === 1 && buffer.numberOfChannels >= 2) {
    const inL = buffer.getChannelData(0);
    const inR = buffer.getChannelData(1);
    const out = outBuffer.getChannelData(0);
    for (let n = 0; n < buffer.length; n++) {
      out[n] = (0.5 * inL[n] + 0.5 * inR[n]) * g_linear;
    }
  } else if (targetChannels === 2 && buffer.numberOfChannels === 1) {
    const inM = buffer.getChannelData(0);
    const outL = outBuffer.getChannelData(0);
    const outR = outBuffer.getChannelData(1);
    for (let n = 0; n < buffer.length; n++) {
      const val = inM[n] * g_linear;
      outL[n] = val;
      outR[n] = val;
    }
  } else {
    for (let c = 0; c < targetChannels; c++) {
      const input = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
      const output = outBuffer.getChannelData(c);
      for (let n = 0; n < buffer.length; n++) {
        output[n] = input[n] * g_linear;
      }
    }
  }
  
  return outBuffer;
}
