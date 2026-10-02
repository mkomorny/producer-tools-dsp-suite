// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface BroadcastDrcOptions {
  gateThresholdDb: number;
  gateRatio: number;
  compressorThresholdDb: number;
  compressorRatio: number;
  compressorAttackMs: number;
  compressorReleaseMs: number;
  limiterCeilingDb: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyBroadcastDrc(buffer: AudioBuffer, options: BroadcastDrcOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const gateThresholdDb = Math.max(-80.0, Math.min(-20.0, options.gateThresholdDb));
  const gateRatio = Math.max(1.0, Math.min(10.0, options.gateRatio));
  const compressorThresholdDb = Math.max(-60.0, Math.min(0.0, options.compressorThresholdDb));
  const compressorRatio = Math.max(1.0, Math.min(20.0, options.compressorRatio));
  const compressorAttackMs = Math.max(0.1, Math.min(100.0, options.compressorAttackMs));
  const compressorReleaseMs = Math.max(10.0, Math.min(1000.0, options.compressorReleaseMs));
  const limiterCeilingDb = Math.max(-60.0, Math.min(0.0, options.limiterCeilingDb));

  const g_ceiling = Math.pow(10, limiterCeilingDb / 20);
  const sampleRate = buffer.sampleRate;

  const tau_att = compressorAttackMs / 1000;
  const tau_rel = compressorReleaseMs / 1000;
  const alpha_att = Math.exp(-1 / (tau_att * sampleRate));
  const alpha_rel = Math.exp(-1 / (tau_rel * sampleRate));
  
  const alpha_g = Math.exp(-1 / (0.01 * sampleRate)); // 10ms smoothing for gate envelope

  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let E_gate = 0;
    let g_env = 0;

    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      const x_rect = Math.abs(x_in);
      
      // Noise Gate
      E_gate = alpha_g * E_gate + (1 - alpha_g) * x_rect;
      const E_gate_dB = 20 * Math.log10(E_gate + 1e-7);
      const g_gate = E_gate_dB >= gateThresholdDb ? 1.0 : (1 / gateRatio);
      const x_gate = x_in * g_gate;

      // Compressor
      const X_dB = 20 * Math.log10(Math.abs(x_gate) + 1e-7);
      let G_comp = 0;
      if (X_dB > compressorThresholdDb) {
        G_comp = (compressorThresholdDb - X_dB) * (1 - (1 / compressorRatio));
      }

      if (G_comp < g_env) {
        g_env = alpha_att * g_env + (1 - alpha_att) * G_comp;
      } else {
        g_env = alpha_rel * g_env + (1 - alpha_rel) * G_comp;
      }

      const x_comp = x_gate * Math.pow(10, g_env / 20);

      // Limiter
      const y_out = Math.max(-g_ceiling, Math.min(g_ceiling, x_comp));
      output[n] = y_out;
    }
  }

  return outBuffer;
}
