// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

// ==========================================
// NEW DSP EFFECTS IMPLEMENTATIONS (Tempo, Stretch, Stutter, etc)
// ==========================================

export interface AudioTempoChangeOptions {
  tempoPercent: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioTempoChange(buffer: AudioBuffer, options: AudioTempoChangeOptions, ctx: BaseAudioContext): AudioBuffer {
  const S = 1.0 + (Math.max(-75.0, Math.min(300.0, options.tempoPercent)) / 100.0);
  const N_win = 2048;
  const H_syn = Math.floor(N_win / 4);
  const H_ana = Math.floor(H_syn * S);

  const numChannels = buffer.numberOfChannels;
  const outFrames = Math.floor(buffer.length / S);
  const outBuffer = ctx.createBuffer(numChannels, outFrames, buffer.sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);

    let outWriteIdx = 0;
    for (let inReadIdx = 0; inReadIdx < input.length - N_win; inReadIdx += H_ana) {
      if (outWriteIdx + N_win > output.length) break;
      for (let i = 0; i < N_win; i++) {
        const w = Math.pow(Math.sin((Math.PI * i) / (N_win - 1)), 2);
        output[outWriteIdx + i] += input[inReadIdx + i] * w;
      }
      outWriteIdx += H_syn;
    }
  }
  return outBuffer;
}
