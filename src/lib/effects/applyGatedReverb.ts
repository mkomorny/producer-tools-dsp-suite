// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface GatedReverbOptions {
  gatedReverbType: '80s Drum' | 'Vocal' | 'Synth' | 'Custom Settings';
  gateThresholdDb: number;
  gateAttackMs: number;
  gateReleaseMs: number;
  reverbSize: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyGatedReverb(buffer: AudioBuffer, options: GatedReverbOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const gateThresholdDb = Math.max(-60.0, Math.min(0.0, options.gateThresholdDb));
  const gateAttackMs = Math.max(1.0, Math.min(100.0, options.gateAttackMs));
  const gateReleaseMs = Math.max(20.0, Math.min(500.0, options.gateReleaseMs));
  const reverbSize = Math.max(0.1, Math.min(1.0, options.reverbSize));
  const wetDryMix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  
  const sampleRate = buffer.sampleRate;
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  const alpha_attack = Math.exp(-1 / ((gateAttackMs / 1000) * sampleRate));
  const alpha_release = Math.exp(-1 / ((gateReleaseMs / 1000) * sampleRate));
  const g_loop = reverbSize * 0.283;
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    // Very simple comb filter for demo of reverb tail
    const delaySamples = Math.floor(sampleRate * 0.05); // 50ms comb
    const combBuffer = new Float32Array(delaySamples);
    let p_comb = 0;
    
    let E = -100;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      
      const s_rev = x_in + combBuffer[p_comb] * g_loop;
      combBuffer[p_comb] = s_rev;
      p_comb = (p_comb + 1) % delaySamples;
      
      const S_dB = 20 * Math.log10(Math.abs(s_rev) + 1e-7);
      
      if (S_dB > E) {
        E = alpha_attack * E + (1 - alpha_attack) * S_dB;
      } else {
        E = alpha_release * E + (1 - alpha_release) * S_dB;
      }
      
      let G_dB = 0;
      if (E < gateThresholdDb) {
        G_dB = -100.0;
      }
      
      const g_gate = Math.pow(10, G_dB / 20);
      const y_wet = s_rev * g_gate;
      
      output[n] = (1 - wetDryMix) * x_in + wetDryMix * y_wet;
    }
  }
  
  return outBuffer;
}
