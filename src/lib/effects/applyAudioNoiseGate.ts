// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioNoiseGateOptions {
  thresholdDb: number;
  ratio: number;
  attackMs: number;
  releaseMs: number;
  makeupGainDb: number;
  outputFormat?: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioNoiseGate(buffer: AudioBuffer, options: AudioNoiseGateOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const thresholdDb = Math.max(-80.0, Math.min(-10.0, options.thresholdDb));
  const ratio = Math.max(1.0, Math.min(20.0, options.ratio));
  const attackMs = Math.max(0.1, Math.min(50.0, options.attackMs));
  const releaseMs = Math.max(10.0, Math.min(1000.0, options.releaseMs));
  const makeupGainDb = Math.max(0.0, Math.min(24.0, options.makeupGainDb));

  const sampleRate = buffer.sampleRate;
  
  const alpha_attack = Math.exp(-1.0 / (attackMs * 0.001 * sampleRate));
  const alpha_release = Math.exp(-1.0 / (releaseMs * 0.001 * sampleRate));
  const alpha_rms = Math.exp(-1.0 / (0.01 * sampleRate));

  const newBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  const HoldSamples = Math.floor(0.05 * sampleRate);

  let v_rms = 0;
  let g_env = 0;
  let n_hold = HoldSamples;
  
  const outChannels = [];
  const inChannels = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
      outChannels.push(newBuffer.getChannelData(c));
      inChannels.push(buffer.getChannelData(c));
  }

  for (let n = 0; n < buffer.length; n++) {
      let x_rect = 0;
      for (let c = 0; c < buffer.numberOfChannels; c++) {
          x_rect = Math.max(x_rect, Math.abs(inChannels[c][n]));
      }
      
      v_rms = (1 - alpha_rms) * (x_rect * x_rect) + alpha_rms * v_rms;
      const levelDb = 10 * Math.log10(Math.max(1e-5, v_rms));
      
      let state = 'Release';
      if (levelDb > thresholdDb) {
          state = 'Attack';
          n_hold = 0;
      } else {
          if (n_hold < HoldSamples) {
              state = 'Hold';
              n_hold++;
          } else {
              state = 'Release';
          }
      }
      
      let G_target = 0.0;
      let alpha_state = alpha_release;
      
      if (state === 'Attack') {
          G_target = 1.0;
          alpha_state = alpha_attack;
      } else if (state === 'Hold') {
          G_target = 1.0;
          alpha_state = alpha_release;
      } else {
          G_target = 0.0;
          alpha_state = alpha_release;
      }
      
      g_env = (1 - alpha_state) * G_target + alpha_state * g_env;
      const downExpGain = Math.pow(10, ((1.0 - ratio) * (thresholdDb - levelDb)) / 20);
      const G_gate = g_env + (1.0 - g_env) * downExpGain;
      const G_total = G_gate * Math.pow(10, makeupGainDb / 20);
      
      for (let c = 0; c < buffer.numberOfChannels; c++) {
          outChannels[c][n] = inChannels[c][n] * G_total;
      }
  }

  return newBuffer;
}
