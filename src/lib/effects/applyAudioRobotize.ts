// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioRobotizeOptions {
  bitDepth: number;
  pitchFactor: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioRobotize(buffer: AudioBuffer, options: AudioRobotizeOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const bitDepth = Math.max(2, Math.min(16, Math.round(options.bitDepth)));
  const pitchFactor = Math.max(0.25, Math.min(2.0, options.pitchFactor));

  const fs = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const outBuffer = audioCtx.createBuffer(numChannels, buffer.length, fs);

  const bHat = Math.pow(2, bitDepth - 1);

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);

    const Nbuf = 8192;
    const history = new Float32Array(Nbuf);
    let historyIdx = 0;
    let pRead = 0.0;

    for (let n = 0; n < inData.length; n++) {
      const xIn = inData[n];

      const xCrushed = Math.round(xIn * bHat) / bHat;

      history[historyIdx] = xCrushed;

      const I = Math.floor(pRead);
      const f = pRead - I;

      const idx1 = I % Nbuf;
      const idx2 = (I + 1) % Nbuf;

      const yWet = (1.0 - f) * history[idx1] + f * history[idx2];

      outData[n] = Math.max(-1.0, Math.min(1.0, yWet));

      historyIdx = (historyIdx + 1) % Nbuf;
      pRead = (pRead + pitchFactor) % Nbuf;
    }
  }

  return outBuffer;
}
