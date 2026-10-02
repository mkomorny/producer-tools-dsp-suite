// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface CompressorOptions {
  thresholdDb: number;
  ratio: number;
  attackMs: number;
  releaseMs: number;
  makeupDb: number;
  kneeWidth: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyCompressor(buffer: AudioBuffer, options: CompressorOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const thresholdDb = Math.max(-60.0, Math.min(0.0, options.thresholdDb));
  const ratio = Math.max(1.0, Math.min(20.0, options.ratio));
  const attackMs = Math.max(0.1, Math.min(200.0, options.attackMs));
  const releaseMs = Math.max(10.0, Math.min(2000.0, options.releaseMs));
  const makeupDb = Math.max(0.0, Math.min(24.0, options.makeupDb));
  const kneeWidth = Math.max(0.0, Math.min(12.0, options.kneeWidth));
  
  const sampleRate = buffer.sampleRate;
  const alpha_attack = Math.exp(-1 / ((attackMs / 1000) * sampleRate));
  const alpha_release = Math.exp(-1 / ((releaseMs / 1000) * sampleRate));
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let g_env = 0;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      const x_dB = 20 * Math.log10(Math.abs(x_in) + 1e-5);
      
      let G_c = x_dB;
      if (2 * (x_dB - thresholdDb) < -kneeWidth) {
        G_c = x_dB;
      } else if (2 * Math.abs(x_dB - thresholdDb) <= kneeWidth) {
        G_c = x_dB + ((1/ratio - 1) * Math.pow(x_dB - thresholdDb + kneeWidth/2, 2)) / (2 * kneeWidth);
      } else if (2 * (x_dB - thresholdDb) > kneeWidth) {
        G_c = thresholdDb + (x_dB - thresholdDb) / ratio;
      }
      
      const delta_dB = G_c - x_dB;
      
      if (delta_dB < g_env) {
        g_env = alpha_attack * g_env + (1 - alpha_attack) * delta_dB;
      } else {
        g_env = alpha_release * g_env + (1 - alpha_release) * delta_dB;
      }
      
      const g_linear = Math.pow(10, (g_env + makeupDb) / 20);
      output[n] = x_in * g_linear;
    }
  }
  
  return outBuffer;
}
